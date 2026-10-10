// Independent teleportation oracle: a 3-qubit statevector simulation in plain JS, written from the
// textbook circuit (V§7.4 / V§10.5), NOT from echo/. It supplies the fidelity a correct quantum
// engine would report, so the audited rules are fed physically consistent results and the X/Z rule
// is derived from the physics rather than copied from §7.1 or missionRules.js.
// Why not reuse evidence/red-team/physics-oracle/physics_oracle.py: the harness must draw fresh
// random states inside the Node process that drives the ESM modules. crosscheck.py compares this
// file against physics_oracle.corrected_fidelity on the same states (out/crosscheck.txt).
// Qubit index i is bit i of the basis index (little-endian, like Qiskit). q0 source, q1 Alice's Bell
// half, q2 receiver. m0 = q0 readout, m1 = q1 readout.

const c = (re, im = 0) => ({ re, im });
const add = (a, b) => c(a.re + b.re, a.im + b.im);
const mul = (a, b) => c(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const conj = (a) => c(a.re, -a.im);
const scale = (a, s) => c(a.re * s, a.im * s);

function apply1(sv, q, m) { // m = [[a,b],[c,d]]
  const out = sv.slice();
  for (let i = 0; i < sv.length; i++) {
    if ((i >> q) & 1) continue;
    const j = i | (1 << q);
    out[i] = add(mul(m[0][0], sv[i]), mul(m[0][1], sv[j]));
    out[j] = add(mul(m[1][0], sv[i]), mul(m[1][1], sv[j]));
  }
  return out;
}
function cx(sv, ctl, tgt) {
  const out = sv.slice();
  for (let i = 0; i < sv.length; i++) if ((i >> ctl) & 1) out[i] = sv[i ^ (1 << tgt)];
  return out;
}
const r2 = Math.SQRT1_2;
const H = [[c(r2), c(r2)], [c(r2), c(-r2)]];
const X = [[c(0), c(1)], [c(1), c(0)]];
const Z = [[c(1), c(0)], [c(0), c(-1)]];
const RY = (t) => [[c(Math.cos(t / 2)), c(-Math.sin(t / 2))], [c(Math.sin(t / 2)), c(Math.cos(t / 2))]];
const RZ = (p) => [[c(Math.cos(-p / 2), Math.sin(-p / 2)), c(0)], [c(0), c(Math.cos(p / 2), Math.sin(p / 2))]];

// The single-qubit state ry(theta) then rz(phi) on |0> (circuit order, owner ruling physics (3)).
export function blochState(theta, phi) {
  return apply1(apply1([c(1), c(0)], 0, RY(theta)), 0, RZ(phi));
}

// Teleport psi on branch (m0, m1); receiver applies X if cxOn, then Z if czOn. Fidelity with psi.
export function teleportFidelity(psi, m0, m1, cxOn, czOn) {
  let sv = Array.from({ length: 8 }, (_, i) => (i === 0 ? psi[0] : i === 1 ? psi[1] : c(0)));
  sv = apply1(sv, 1, H); sv = cx(sv, 1, 2); // Bell pair q1,q2
  sv = cx(sv, 0, 1); sv = apply1(sv, 0, H); // Bell-basis transform
  const rx = [c(0), c(0)];
  for (let i = 0; i < 8; i++) if ((i & 1) === m0 && ((i >> 1) & 1) === m1) rx[(i >> 2) & 1] = sv[i];
  const n = Math.hypot(rx[0].re, rx[0].im, rx[1].re, rx[1].im);
  let bob = rx.map((x) => scale(x, 1 / n));
  if (cxOn) bob = apply1(bob, 0, X);
  if (czOn) bob = apply1(bob, 0, Z);
  const ov = add(mul(conj(psi[0]), bob[0]), mul(conj(psi[1]), bob[1]));
  return ov.re * ov.re + ov.im * ov.im;
}

// The correction the PHYSICS demands, found by search (not by quoting §7.1): the unique (x, z) with
// fidelity 1 on a generic state. Throws if the search is not unique — i.e. if the oracle is broken.
export function physicsRule(m0, m1) {
  const psi = blochState(1.137, 0.44);
  const ok = [];
  for (const x of [false, true]) for (const z of [false, true]) {
    if (teleportFidelity(psi, m0, m1, x, z) > 1 - 1e-12) ok.push({ applyX: x, applyZ: z });
  }
  if (ok.length !== 1) throw new Error(`oracle: ${ok.length} perfect corrections for m0=${m0} m1=${m1}`);
  return ok[0];
}

// Naive CNOT "copier" on psi = a|0> + b|1>: output a|00> + b|11>. Returns |<psi psi|out>|^2
// (V§7.2): 1 on basis states, 1/2 on |+>.
export function naiveCloneFidelity(theta, phi) {
  const [a, b] = blochState(theta, phi);
  const ov = add(mul(mul(conj(a), conj(a)), a), mul(mul(conj(b), conj(b)), b));
  return ov.re * ov.re + ov.im * ov.im;
}
