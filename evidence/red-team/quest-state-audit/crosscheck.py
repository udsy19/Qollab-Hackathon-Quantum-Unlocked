"""Cross-check oracle.mjs against the red-team Qiskit oracle (physics_oracle.py) on 8 states x 4
branches x 4 corrections. Run: python3 -I crosscheck.py  (needs qiskit; node on PATH)."""
import json, math, pathlib, subprocess, sys
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "physics-oracle"))
import physics_oracle as po  # noqa: E402

states = po.named_states() + po.random_states(2)
js = r"""
import { blochState, teleportFidelity } from './oracle.mjs';
const states = JSON.parse(process.argv.at(-1)); const out = [];
for (const [n, t, p] of states) { const psi = blochState(t, p);
  for (const m0 of [0,1]) for (const m1 of [0,1]) for (const x of [false,true]) for (const z of [false,true])
    out.push([n, m0, m1, x, z, teleportFidelity(psi, m0, m1, x, z)]); }
console.log(JSON.stringify(out));"""
res = subprocess.run(["node", "--input-type=module", "-e", js, json.dumps(states)], cwd=HERE, capture_output=True, text=True, check=True)
jsrows = json.loads(res.stdout)
worst, n = 0.0, 0
for (name, t, p) in states:
    br = po.qk_branches(t, p)
    for row in [r for r in jsrows if r[0] == name]:
        _, m0, m1, x, z, fj = row
        fq = po.corrected_fidelity(br[(m0, m1)][1], x, z, t, p)
        worst = max(worst, abs(fq - fj)); n += 1
print(f"compared {n} (state, branch, correction) fidelities; max |qiskit - js| = {worst:.3e}")
sys.exit(0 if n == 128 and worst < 1e-9 else 1)
