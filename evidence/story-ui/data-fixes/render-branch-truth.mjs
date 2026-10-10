#!/usr/bin/env node
// Renders branch-truth.md: the Qiskit result for each of the 16 (bits, plan) cases next to the
// failure lines echo/data selects for it. The physics columns come from branch_truth.py only.
//   node evidence/story-ui/data-fixes/render-branch-truth.mjs > evidence/story-ui/data-fixes/branch-truth.md
import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const PY = process.env.ECHO_PYTHON ?? '/Users/udsy/PycharmProjects/Qollab-Hackathon-Quantum-Unlocked/.venv/bin/python'
const r = spawnSync(PY, ['-I', join(here, 'branch_truth.py')], { encoding: 'utf8' })
if (r.status !== 0) { console.error(r.stderr); process.exit(2) }
const { theta, phi, rows } = JSON.parse(r.stdout)
const { FAILURES, TELEPORT_FAILURE_CASES } = await import(pathToFileURL(resolve(here, '../../../echo/data/objectives.js')).href)
const held = { I: 'the test state', X: 'X·state (bit flip left)', Z: 'Z·state (phase flip left)', XZ: 'XZ·state (bit and phase flip left)' }
const out = [
  '# Teleportation failure lines vs. Qiskit, all 16 cases',
  '',
  `Generic test state: ry(${theta}) then rz(${phi}) on q0. The real protocol runs in local Qiskit (\`branch_truth.py\`): Bell pair q1–q2, CX(q0,q1), H(q0), exact projection onto (m0, m1), then the plan (X then Z) on q2. "Receiver holds" is the Pauli P with fidelity 1 between the receiver's partial trace and P·state. The script never reads echo/data, and the correction rule appears nowhere in it: the four correct rows come out of the physics.`,
  '',
  'Key = `m0m1:XZ`. m0 = source readout, m1 = local Bell-half readout; X/Z = the plan\'s switches (1 = on).',
  '',
  '| key | m0 m1 | plan X Z | receiver holds | fidelity | lines shown (echo/data) |',
  '|---|---|---|---|---|---|',
]
for (const x of rows) {
  const key = `${x.m0}${x.m1}:${x.x}${x.z}`
  const sel = TELEPORT_FAILURE_CASES[key] ?? ['(MISSING)']
  out.push(`| ${key} | ${x.m0} ${x.m1} | ${x.x ? 'on' : 'off'} ${x.z ? 'on' : 'off'} | ${held[x.residual]} | ${x.fidelity.toFixed(4)} | ${sel.length ? sel.map(k => '`' + k + '`').join(' + ') : 'none (correct)'} |`)
}
out.push('', '## The lines', '', '| key | text | shown for |', '|---|---|---|')
for (const [k, t] of Object.entries(FAILURES.teleportation)) {
  const cases = Object.entries(TELEPORT_FAILURE_CASES).filter(([, v]) => v.includes(k)).map(([c]) => c)
  out.push(`| \`${k}\` | ${t} | ${cases.length ? cases.join(', ') : '— (not chosen by bits and plan)'} |`)
}
out.push('', 'Why each line is true on every case that shows it: before correction the receiver holds X^m1 Z^m0 · state. After the plan it holds X^(x⊕m1) Z^(z⊕m0) · state. So the bit flip is left exactly when x ≠ m1, and the phase flip exactly when z ≠ m0, whatever the other bit and switch are. Each line speaks only about its own switch and never says the rest was right. `check.mjs` § 8 asserts this for every row above, against this script\'s output.')
out.push('', '`blind_spot` is added by the terminal only when a failing plan still scores high fidelity on the particular random test state (a state near an eigenstate of the leftover flip). On this generic state the failing fidelities are 0.674 (X left), 0.177 (Z left) and 0.149 (both left), so it never fires here.')
console.log(out.join('\n'))
