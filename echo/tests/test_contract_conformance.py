"""Every bridge result must pass the platform's REAL validateExperimentResult (echo/contracts.js).

Why Node at test time: the validator is JavaScript and the platform lane owns it. A Python re-statement
of its rules would be a second copy that drifts silently, and drift between the two is exactly what
this test exists to catch. So the test runs the platform's own file. A missing Node or contracts.js
is a FAILURE with a reason, never a skip (gate-independence: a missing input hands the producer a veto).

contracts.js is found, in order: $ECHO_CONTRACTS_JS, echo/contracts.js (once platform lands it), then
`git show lane/platform/integration:echo/contracts.js`.
"""
import json
import os
import pathlib
import shutil
import subprocess

import pytest

from conftest import BRIDGE_CALL_COUNT, bridge_calls

ECHO = pathlib.Path(__file__).resolve().parents[1]

VALIDATE = """
const [contracts, results] = process.argv.slice(1)
const { validateExperimentResult } = await import(contracts)
const { readFileSync } = await import('node:fs')
const out = JSON.parse(readFileSync(results, 'utf8')).map(r => validateExperimentResult(r))
console.log(JSON.stringify(out))
"""


def contracts_js(tmp_path):
    env = os.environ.get("ECHO_CONTRACTS_JS")
    if env:
        return pathlib.Path(env)
    local = ECHO / "contracts.js"
    if local.exists():
        return local
    shown = subprocess.run(["git", "-C", str(ECHO), "show", "lane/platform/integration:echo/contracts.js"],
                           capture_output=True, text=True)
    assert shown.returncode == 0, f"no contracts.js: set ECHO_CONTRACTS_JS ({shown.stderr.strip()})"
    path = tmp_path / "contracts.js"
    path.write_text(shown.stdout)
    return path


def platform_verdicts(results, tmp_path):
    node = shutil.which("node")
    assert node, "node is required: this test runs the platform's own JS validator (see module docstring)"
    data = tmp_path / "results.json"
    data.write_text(json.dumps(results, allow_nan=False))
    run = subprocess.run([node, "--input-type=module", "-e", VALIDATE, contracts_js(tmp_path).as_uri(), str(data)],
                         capture_output=True, text=True, timeout=60)
    assert run.returncode == 0, run.stderr
    verdicts = json.loads(run.stdout)
    assert len(verdicts) == len(results)
    return verdicts


def test_every_bridge_result_passes_the_platform_validator(tmp_path):
    calls = list(bridge_calls())
    assert len(calls) == BRIDGE_CALL_COUNT  # zero calls would be a refusal, not a pass
    labels, results = zip(*[(label, fn()) for label, fn in calls])
    verdicts = platform_verdicts(list(results), tmp_path)
    bad = {}
    for label, result, errors in zip(labels, results, verdicts):
        if errors:
            bad[label] = errors
    assert not bad, json.dumps(bad, indent=1)


def test_the_validator_bites(tmp_path):
    # Positive control: the same pipeline must reject what the contract forbids, or a green above means nothing.
    from quantum import cloning

    good = cloning.run_calibration("plus")
    broken = [dict(good, details={}), {k: v for k, v in good.items() if k != "keyQubits"},
              dict(good, probabilities={"source=0,copy=0": 0.5, "source=1,copy=1": 0.5})]
    verdicts = platform_verdicts([good, *broken], tmp_path)
    assert verdicts[0] == []
    assert all(v for v in verdicts[1:]), verdicts


@pytest.mark.parametrize("field", ["kind", "details", "circuitText", "summary"])
def test_no_result_carries_a_retired_field(field):
    # The four fields the contract rejected (report 0003); their content moved to observables/facts.
    for label, fn in bridge_calls():
        assert field not in fn(), label


# ------------------------------------------------------------------ the two-phase dry run (contracts-v2)
DRY_RUN = """
const [contracts, mode, path] = process.argv.slice(1)
const c = await import(contracts)
const { readFileSync } = await import('node:fs')
if (mode === 'requests') {
  // mulberry32: a seeded stand-in for Math.random, so the requests the game would draw are repeatable
  let a = 20261010
  const rand = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 }
  console.log(JSON.stringify(Array.from({ length: 12 }, () => c.randomGenericState(rand))))
} else {
  const out = JSON.parse(readFileSync(path, 'utf8')).map(({ req, bits, choices }) => {
    const errs = c.validateTeleportBitsResult(req, bits)
    const verdicts = choices.map(({ choice, result }) => {
      const r2 = c.makeCorrectionRequest(req, bits, choice)
      return { req2: r2, errors: c.validateTeleportCorrectionResult(r2, result), verdict: c.dryRunVerdict(r2, result) }
    })
    return { errs, verdicts }
  })
  console.log(JSON.stringify(out))
}
"""


def _node(tmp_path, *args):
    node = shutil.which("node")
    assert node, "node is required: this test runs the platform's own JS validators"
    run = subprocess.run([node, "--input-type=module", "-e", DRY_RUN, contracts_js(tmp_path).as_uri(), *args],
                         capture_output=True, text=True, timeout=60)
    assert run.returncode == 0, run.stderr
    return json.loads(run.stdout)


def test_two_phase_dry_run_passes_the_platform_dry_run_validators(tmp_path):
    from quantum import teleportation

    # Requests drawn by the platform's own randomGenericState, plus the engine's own draws.
    requests = _node(tmp_path, "requests", "")
    requests += [{k: teleportation.bell_measurement("calibration", seed=s)["parameters"][k] for k in ("theta", "phi")}
                 for s in range(12)]
    assert len(requests) == 24
    cases = []
    for i, req in enumerate(requests):
        bits = teleportation.bell_measurement("calibration", theta=req["theta"], phi=req["phi"], seed=i)
        m0, m1 = bits["measurementBits"]["m0"], bits["measurementBits"]["m1"]
        choices = [{"choice": {"applyX": x, "applyZ": z},
                    "result": teleportation.teleport_branch("calibration", m0, m1, x, z, theta=req["theta"], phi=req["phi"])}
                   for x in (False, True) for z in (False, True)]
        cases.append({"req": req, "bits": bits, "choices": choices})
    data = tmp_path / "dry.json"
    data.write_text(json.dumps(cases, allow_nan=False))
    out = _node(tmp_path, "check", str(data))
    passes = unlocks = 0
    for case, got in zip(cases, out):
        assert got["errs"] == [], got["errs"]
        m0, m1 = case["bits"]["measurementBits"]["m0"], case["bits"]["measurementBits"]["m1"]
        for v in got["verdicts"]:
            assert v["errors"] == [], v["errors"]
            follows = v["req2"]["applyX"] == (m1 == 1) and v["req2"]["applyZ"] == (m0 == 1)
            assert v["verdict"]["passed"] is follows  # exactly the rule passes, every wrong choice fails
            assert v["verdict"]["unlocksCommit"] is (follows and (m0, m1) != (0, 0))
            passes += follows
            unlocks += v["verdict"]["unlocksCommit"]
    assert passes == 24 and unlocks > 0
