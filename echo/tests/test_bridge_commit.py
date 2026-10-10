"""S1 (report 0013): the JS bridge's commit latch, driven in Node with the REAL bridge.js and contracts.js.

Python latches the story token when `live_commit` RETURNS. So a commit that fails after Python
returned (the contract rejects it) has consumed the token: the bridge must stay latched, say so
(`tokenConsumed: true`) and never call Python again for this story. Only a commit whose Python call
raised measured nothing and may be retried (owner ruling 2026-10-10: "token marked consumed only on
success; on error, honest error + retry; latched once recorded").

The Qollab module names (`quantum.teleportation` ...) are resolved to a stand-in by a Node resolve
hook; bridge.js itself is imported unmodified, and its `../contracts.js` is the real file. The
stand-in returns REAL engine output, dumped by this test from host Python.
"""
import json
import pathlib
import shutil
import subprocess

from quantum import teleportation
from test_contract_conformance import contracts_js

BRIDGE = pathlib.Path(__file__).resolve().parents[1] / "quantum" / "bridge.js"

FAKE = """
const py = (name) => ({ callPromising: async (...args) => globalThis.__py(name, args) })
export const run_calibration = py('run_calibration'), bell_signalling = py('bell_signalling'),
  bell_measurement = py('bell_measurement'), teleport_branch = py('teleport_branch'),
  live_commit = py('live_commit'), reset_story_token = py('reset_story_token'),
  run_backend_verification_once = py('run_backend_verification_once')
"""

HOOK = """
import { registerHooks } from 'node:module'
const fake = process.env.FAKE_QUANTUM_URL
registerHooks({ resolve: (spec, ctx, next) => spec.startsWith('quantum.') ? { url: fake, shortCircuit: true } : next(spec, ctx) })
"""

SCENARIOS = """
const [bridgeUrl, commitPath] = process.argv.slice(1)
const { readFileSync } = await import('node:fs')
const real = JSON.parse(readFileSync(commitPath, 'utf8'))
const out = {}
let n = 0
async function scenario(name, behaviours, body) {
  const calls = []
  let i = 0
  globalThis.__py = async (fn, args) => {
    calls.push(fn)
    if (fn === 'reset_story_token') return null
    const b = behaviours[Math.min(i++, behaviours.length - 1)]
    if (b instanceof Error) throw b
    return structuredClone(b)
  }
  const bridge = await import(`${bridgeUrl}?scenario=${n++}`)  // a fresh module: a fresh latch
  const settle = (p) => p.then(r => ({ ok: true, r }), e => ({ ok: false, name: e.name, tokenConsumed: e.tokenConsumed, message: e.message }))
  out[name] = await body(bridge, settle, calls)
}
const pyErr = (line) => Object.assign(new Error(`Traceback (most recent call last):\\n  File "x"\\n${line}`), { name: 'PythonError' })
const broken = { ...real, parameters: { ...real.parameters, applyX: !real.parameters.applyX } }  // passes validateExperimentResult
const oldMarker = { ...real, parameters: { state: 'token', seed: 11 } }

await scenario('valid', [real], async (b, s, calls) => {
  const first = await s(b.commitTransfer()); const again = await s(b.commitTransfer())
  return { first: first.ok && JSON.stringify(first.r) === JSON.stringify(real), again: again.ok, pythonCalls: calls.filter(c => c === 'live_commit').length }
})
for (const [name, bad] of [['ruleBroken', broken], ['oldMarker', oldMarker]]) {
  await scenario(name, [bad, real], async (b, s, calls) => {
    const first = await s(b.commitTransfer()); const retry = await s(b.commitTransfer())
    const before = calls.filter(c => c === 'live_commit').length
    await b.resetStoryToken()
    const afterRestart = await s(b.commitTransfer())
    return { first, retry, pythonCallsBeforeRestart: before, resetCalled: calls.includes('reset_story_token'), afterRestart: afterRestart.ok }
  })
}
await scenario('pythonRaised', [pyErr('ValueError: something broke before the token was measured'), real], async (b, s, calls) => {
  const first = await s(b.commitTransfer()); const retry = await s(b.commitTransfer())
  return { first, retry: retry.ok, pythonCalls: calls.filter(c => c === 'live_commit').length }
})
await scenario('alreadyConsumed', [pyErr('quantum.teleportation.TokenAlreadyConsumed: The story token was already measured'), real], async (b, s, calls) => {
  const first = await s(b.commitTransfer()); const retry = await s(b.commitTransfer())
  return { first, retry, pythonCalls: calls.filter(c => c === 'live_commit').length }
})
console.log(JSON.stringify(out))
"""


def run_bridge_scenarios(tmp_path, bridge=BRIDGE):
    node = shutil.which("node")
    assert node, "node is required: this test runs the real bridge.js"
    assert (bridge.parent.parent / "contracts.js").exists(), "bridge.js imports ../contracts.js; it must be the real one"
    teleportation.reset_story_token()
    try:
        commit = teleportation.live_commit(seed=11)
    finally:
        teleportation.reset_story_token()
    (tmp_path / "commit.json").write_text(json.dumps(commit, allow_nan=False))
    (tmp_path / "fake_quantum.mjs").write_text(FAKE)
    (tmp_path / "hook.mjs").write_text(HOOK)
    env = {"PATH": "/usr/bin:/bin", "FAKE_QUANTUM_URL": (tmp_path / "fake_quantum.mjs").as_uri()}
    run = subprocess.run([node, "--import", (tmp_path / "hook.mjs").as_uri(), "--input-type=module", "-e", SCENARIOS,
                          bridge.as_uri(), str(tmp_path / "commit.json")],
                         capture_output=True, text=True, timeout=60, env=env)
    assert run.returncode == 0, run.stderr
    return json.loads(run.stdout.strip().splitlines()[-1])


def test_a_valid_commit_resolves_once_and_stays_recorded(tmp_path):
    v = run_bridge_scenarios(tmp_path)["valid"]
    assert v == {"first": True, "again": True, "pythonCalls": 1}


def test_a_commit_rejected_after_python_returned_stays_consumed_and_is_not_retried(tmp_path):
    out = run_bridge_scenarios(tmp_path)
    for name in ("ruleBroken", "oldMarker"):  # ruleBroken passes validateExperimentResult: only validateCommitResult bites
        v = out[name]
        assert v["first"]["ok"] is False and v["first"]["name"] == "ScientificModuleError", (name, v)
        assert v["first"]["tokenConsumed"] is True, (name, v)
        assert "consumed" in v["first"]["message"], (name, v)
        assert v["retry"] == v["first"], (name, v)  # the same honest refusal, not a second measurement
        assert v["pythonCallsBeforeRestart"] == 1, (name, v)
        assert v["resetCalled"] is True and v["afterRestart"] is True, (name, v)  # RESTART: a new story, a new token


def test_a_commit_whose_python_call_raised_may_be_retried(tmp_path):
    v = run_bridge_scenarios(tmp_path)["pythonRaised"]
    assert v["first"]["ok"] is False and v["first"]["tokenConsumed"] is False, v
    assert v["retry"] is True and v["pythonCalls"] == 2, v


def test_pythons_own_refusal_of_a_second_commit_is_reported_as_consumed(tmp_path):
    v = run_bridge_scenarios(tmp_path)["alreadyConsumed"]
    assert v["first"]["tokenConsumed"] is True, v
    assert v["retry"] == v["first"] and v["pythonCalls"] == 1, v
