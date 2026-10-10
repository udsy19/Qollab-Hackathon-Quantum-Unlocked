# Teleportation failure lines vs. Qiskit, all 16 cases

Generic test state: ry(1.137) then rz(0.44) on q0. The real protocol runs in local Qiskit (`branch_truth.py`): Bell pair q1–q2, CX(q0,q1), H(q0), exact projection onto (m0, m1), then the plan (X then Z) on q2. "Receiver holds" is the Pauli P with fidelity 1 between the receiver's partial trace and P·state. The script never reads echo/data, and the correction rule appears nowhere in it: the four correct rows come out of the physics.

Key = `m0=<m0>,m1=<m1>|X=<on|off>,Z=<on|off>`, built from the named fields. m0 = source readout, m1 = local Bell-half readout; X/Z = the plan's switches.

| key | m0 m1 | plan X Z | receiver holds | fidelity | lines shown (echo/data) |
|---|---|---|---|---|---|
| `m0=0,m1=0\|X=off,Z=off` | 0 0 | off off | the test state | 1.0000 | none (correct) |
| `m0=0,m1=0\|X=off,Z=on` | 0 0 | off on | Z·state (phase flip left) | 0.1767 | `extra_Z` |
| `m0=0,m1=0\|X=on,Z=off` | 0 0 | on off | X·state (bit flip left) | 0.6740 | `extra_X` |
| `m0=0,m1=0\|X=on,Z=on` | 0 0 | on on | XZ·state (bit and phase flip left) | 0.1494 | `extra_X` + `extra_Z` |
| `m0=0,m1=1\|X=off,Z=off` | 0 1 | off off | X·state (bit flip left) | 0.6740 | `missing_X` |
| `m0=0,m1=1\|X=off,Z=on` | 0 1 | off on | XZ·state (bit and phase flip left) | 0.1494 | `missing_X` + `extra_Z` |
| `m0=0,m1=1\|X=on,Z=off` | 0 1 | on off | the test state | 1.0000 | none (correct) |
| `m0=0,m1=1\|X=on,Z=on` | 0 1 | on on | Z·state (phase flip left) | 0.1767 | `extra_Z` |
| `m0=1,m1=0\|X=off,Z=off` | 1 0 | off off | Z·state (phase flip left) | 0.1767 | `missing_Z` |
| `m0=1,m1=0\|X=off,Z=on` | 1 0 | off on | the test state | 1.0000 | none (correct) |
| `m0=1,m1=0\|X=on,Z=off` | 1 0 | on off | XZ·state (bit and phase flip left) | 0.1494 | `extra_X` + `missing_Z` |
| `m0=1,m1=0\|X=on,Z=on` | 1 0 | on on | X·state (bit flip left) | 0.6740 | `extra_X` |
| `m0=1,m1=1\|X=off,Z=off` | 1 1 | off off | XZ·state (bit and phase flip left) | 0.1494 | `missing_X` + `missing_Z` |
| `m0=1,m1=1\|X=off,Z=on` | 1 1 | off on | X·state (bit flip left) | 0.6740 | `missing_X` |
| `m0=1,m1=1\|X=on,Z=off` | 1 1 | on off | Z·state (phase flip left) | 0.1767 | `missing_Z` |
| `m0=1,m1=1\|X=on,Z=on` | 1 1 | on on | the test state | 1.0000 | none (correct) |

## The lines

| key | text | shown for |
|---|---|---|
| `missing_X` | m1 = 1 but X was off. The bit flip that m1 = 1 flags was never undone. | m0=0,m1=1\|X=off,Z=off, m0=0,m1=1\|X=off,Z=on, m0=1,m1=1\|X=off,Z=off, m0=1,m1=1\|X=off,Z=on |
| `missing_Z` | m0 = 1 but Z was off. The phase flip that m0 = 1 flags was never undone. | m0=1,m1=0\|X=off,Z=off, m0=1,m1=0\|X=on,Z=off, m0=1,m1=1\|X=off,Z=off, m0=1,m1=1\|X=on,Z=off |
| `extra_X` | X was on but m1 = 0. That X added a bit flip the bits never called for. | m0=0,m1=0\|X=on,Z=off, m0=0,m1=0\|X=on,Z=on, m0=1,m1=0\|X=on,Z=off, m0=1,m1=0\|X=on,Z=on |
| `extra_Z` | Z was on but m0 = 0. That Z added a phase flip the bits never called for. | m0=0,m1=0\|X=off,Z=on, m0=0,m1=0\|X=on,Z=on, m0=0,m1=1\|X=off,Z=on, m0=0,m1=1\|X=on,Z=on |
| `blind_spot` | On this test state that mistake happens to look harmless. It would fail on most others. | — (not chosen by bits and plan) |
| `commit_locked` | Commit locked. First pass a dry run whose bits are not 00: the token can be measured only once. | — (not chosen by bits and plan) |
| `trivial_pass` | m0 = 0 and m1 = 0 need no correction, so this run does not test the rule. Measure a fresh state. | — (not chosen by bits and plan) |
| `already_committed` | Transfer complete. The source was measured; there is nothing left to send. | — (not chosen by bits and plan) |

Why each line is true on every case that shows it: before correction the receiver holds X^m1 Z^m0 · state. After the plan it holds X^(x⊕m1) Z^(z⊕m0) · state. So the bit flip is left exactly when x ≠ m1, and the phase flip exactly when z ≠ m0, whatever the other bit and switch are. Each line speaks only about its own switch and never says the rest was right. `check.mjs` § 8 asserts this for every row above, against this script's output.

`blind_spot` is added by the terminal only when a failing plan still scores high fidelity on the particular random test state (a state near an eigenstate of the leftover flip). On this generic state the failing fidelities are 0.674 (X left), 0.177 (Z left) and 0.149 (both left), so it never fires here.
