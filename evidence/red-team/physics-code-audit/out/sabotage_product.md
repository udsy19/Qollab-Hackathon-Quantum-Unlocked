# Sabotage round on a disposable copy of `/private/tmp/pca/q/echo`

python 3.13.0. THEIR = the product's own `echo/tests`; OURS = `test_product_vs_oracle.py`. A mutation THEIR suite leaves GREEN is a **NULL**.

| mutation | simulates | THEIR suite | their summary | OUR driver | our summary |
|---|---|---|---|---|---|
| `control` | no edit | GREEN | 395 passed in 0.73s | GREEN | 86 passed in 0.68s |
| `swap_xz_rule` | rule: X iff m0, Z iff m1 | RED (exit 1) | 30 failed, 365 passed in 0.86s | RED (exit 1) | 25 failed, 61 passed in 0.53s |
| `swap_m0_m1_projection` | branch model projects q1 as m0, q0 as m1 | RED (exit 1) | 52 failed, 343 passed in 0.92s | RED (exit 1) | 24 failed, 62 passed in 0.54s |
| `swap_m0_m1_branch_probs` | branch-probability labels read index as 2*m0+m1 | GREEN **NULL** | 395 passed in 0.75s | GREEN | 86 passed in 0.70s |
| `reverse_bitstring` | backend counts key read left-to-right | RED (exit 1) | 6 failed, 389 passed in 0.77s | RED (exit 1) | 2 failed, 84 passed in 0.71s |
| `drop_x` | Bob's X correction never applied | RED (exit 1) | 44 failed, 351 passed in 0.90s | RED (exit 1) | 20 failed, 66 passed in 0.50s |
| `drop_z` | Bob's Z correction never applied | RED (exit 1) | 44 failed, 351 passed in 0.91s | RED (exit 1) | 20 failed, 66 passed in 0.50s |
| `x_applies_z` | the X button applies Z and vice versa | RED (exit 1) | 53 failed, 342 passed in 0.92s | RED (exit 1) | 22 failed, 64 passed in 0.51s |
| `live_commit_swapped_bits` | story commit applies the rule to (m1, m0) | RED (exit 1) | 1 failed, 394 passed in 0.77s | RED (exit 1) | 12 failed, 74 passed in 0.55s |
| `bell_measure_cx_hits_bob` | Bell measurement CX(q0,q1) lands on Bob: CX(q0,q2) | GREEN **NULL** | 395 passed in 0.75s | RED (exit 1) | 1 failed, 85 passed in 0.71s |
| `phase_prep_s_to_z` | 'phase' state prepared with Z instead of S (|+i> -> |->) | RED (exit 1) | 11 failed, 384 passed in 0.80s | RED (exit 1) | 4 failed, 82 passed in 0.71s |
| `bloch_a_operator_order` | bloch_a applies RZ before RY (report 0001 P3 trap) | RED (exit 1) | 10 failed, 385 passed in 0.80s | RED (exit 1) | 3 failed, 83 passed in 0.73s |
| `product_threshold_loosened` | product's 'mistake does not show' fact fires at F > 0.9, not 0.999999 | GREEN **NULL** | 395 passed in 0.74s | RED (exit 1) | 1 failed, 85 passed in 0.68s |
| `tests_threshold_loosened_plus_drop_z` | THEIR test threshold 0.99 -> 1.0 and >=0.999999 -> >=0.9, plus Z dropped | RED (exit 1) | 44 failed, 351 passed in 0.93s | RED (exit 1) | 20 failed, 66 passed in 0.50s |
| `second_backend_job_guard_removed` | once-guard check disabled: a second backend.run goes through | RED (exit 1) | 2 failed, 393 passed in 0.77s | RED (exit 1) | 1 failed, 85 passed in 0.72s |
| `guard_set_after_run` | guard spent only after a successful job (retry after failure allowed) | RED (exit 1) | 1 failed, 394 passed in 0.76s | GREEN | 86 passed in 0.68s |
| `numpy_count_leak` | backend counts kept as provider ints (np.int64 leaks to JS) | GREEN **NULL** | 395 passed in 0.75s | RED (exit 1) | 1 failed, 85 passed in 0.72s |
| `receiver_marginal_keys_swapped` | relay marginal P(0)/P(1) entries swapped | GREEN **NULL** | 395 passed in 0.74s | GREEN | 86 passed in 0.69s |
| `sender_gate_on_receiver` | relay: sender's X lands on the receiver's half | GREEN **NULL** | 395 passed in 0.73s | RED (exit 1) | 1 failed, 85 passed in 0.71s |
| `clone_reports_source_twice` | cloning: copy marginal is the source's | GREEN **NULL** | 395 passed in 0.73s | GREEN | 86 passed in 0.70s |
| `withheld_leaks_branch` | corrections_withheld shows Bob's (0,0) branch (= psi), not the average I/2 | RED (exit 1) | 7 failed, 388 passed in 0.78s | RED (exit 1) | 12 failed, 74 passed in 0.75s |

20 mutations. Their-suite nulls (7): swap_m0_m1_branch_probs, bell_measure_cx_hits_bob, product_threshold_loosened, numpy_count_leak, receiver_marginal_keys_swapped, sender_gate_on_receiver, clone_reports_source_twice.
Nulls for BOTH suites (3): swap_m0_m1_branch_probs, receiver_marginal_keys_swapped, clone_reports_source_twice.
