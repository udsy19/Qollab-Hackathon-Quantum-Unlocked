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

# The one rejection we expect until platform answers the request in
# lanes/quantum/reports/0003-contract-conformance.md: the selected-backend Bell check is neither the
# relay puzzle nor teleportation, and the contract's experiment union has no honest value for it.
PENDING_BELL_VERIFICATION = ('experiment must be one of cloning|bell_signalling|teleportation, '
                             'got string "bell_verification"')

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
        if result["experiment"] == "bell_verification":
            errors = [e for e in errors if e != PENDING_BELL_VERIFICATION]
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
