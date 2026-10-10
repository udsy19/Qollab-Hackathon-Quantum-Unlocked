## TL;DR
- **PARTIAL: no IonQ job ran.** `~/.config/echo/ionq.env` does not exist on this host (`test -f` → exit 1). Per the owner's ruling, the IonQ step stopped (`out/live-refused.txt`, `out/run-live-refused.txt`, exit 2). I did not ask for the key or search for it.
- Built `evidence/quantum/ionq-sim-rehearsal/rehearse.py` with three modes. `live` runs one job per process on `get_backend("simulator")` only and records every IonQ response as a replayable fixture. `replay` needs no key: it patches only qiskit-ionq's 3 HTTP methods, so the client parsing and all of `qollab_job` run for real. `synth` writes a SYNTHETIC-labelled fixture.
- `run-live.sh` runs the 6 live jobs (Bell and control × ideal/aria-1/forte-1) plus a key-prefix leak scan, for whoever holds the file.
- Synthetic replays: 4/4 green, 24 checks. The asymmetric control decodes to q0=1, q1=0. A synthetic "aria-1" Bell run returns **255 counts for 256 shots** (qiskit-ionq rounds `p×shots`); this is handled, and the validator accepts it.
- Sabotage on disposable copies: 6 red, 4 predicted nulls. **Key null:** the parser reversal is invisible to the Bell run (S1b); only the asymmetric control catches it (S1).
- Platform validator (lane/platform/integration 43be7d9): 4/4 rejected, only on `"bell_verification"`. 0/4 rejected after patching that field on a copy.
- **Recommend:** the owner creates `~/.config/echo/ionq.env`, then the supervisor re-dispatches me, or anyone runs `zsh evidence/quantum/ionq-sim-rehearsal/run-live.sh` (about 6 free simulator jobs).

## Vault check
- **Read:** `vault/AGENTS.md`, `vault/Index.md` (grep ionq/rehears/replay/fixture: only the mission row), `vault/Research/qollab-backend-from-js-projects.md`, `vault/Reports/pyodide-bridge.md`, `vault/Reports/quantum-physics-review.md` §endianness, `evidence/quantum/backend-job/README.md`, `evidence/quantum/contract-conformance/README.md` + `validate.mjs`, `lanes/quantum/context.md`. Also the earlier org's `lanes/unlocked/reports/0001-ionq-sim-spike.md`: it had no key and no live IonQ response either, so there was no real fixture to reuse.
- **Already known:** the key convention comes from the qiskit-ionq 1.1.1 source and `_build_counts` (`test_ionq_histogram_mapping_reads_the_flipped_qubit`); the IonQ simulator returns probabilities; the validator gap is `bell_verification`.
- **Reused:** `validate.mjs` unchanged; `qollab_job` entry points unchanged. `where.mjs rehearse` / `patch_client_with --branches` → nothing anywhere. The existing test covers `_build_counts` only. The replay adds the `meas_mapped` header round trip, `_format_result`, `get_counts` and the once-guard.
- **Stale:** `qollab-backend-from-js-projects.md` Q2 calls the ideal simulator's sampling "random sampling" and is correct. Nothing found wrong.

## Runs

| run | provenance | counts | correlated | checks | latency |
|---|---|---|---|---|---|
| live Bell ideal / aria-1 / forte-1 | **not run (no key)** | — | — | — | — |
| live control ideal / aria-1 / forte-1 | **not run (no key)** | — | — | — | — |
| replay Bell ideal | SYNTHETIC | 00:129, 11:127 | 256/256 | 7/7 | 5 ms local, no network |
| replay Bell "aria-1" | SYNTHETIC | 00:125, 11:120, 01:5, 10:5 | 245/255 = 0.961 | 6/6 | 5 ms local |
| replay control ideal | SYNTHETIC | 01:256 | — | 6/6 | 5 ms local |
| replay control "forte-1" | SYNTHETIC | 01:248, 11:4, 00:3, 10:1 | — | 5/5 | 5 ms local |

No per-job IonQ latency exists: no job ran. `rehearse.py live` records `submit_s` and `submit_to_counts_s` in every fixture.

## Sabotage and nulls (`out/sabotage-table.txt`)
| row | sabotage | verdict |
|---|---|---|
| S0 | no edit | green (control) |
| S1 | `_clbit_values` reads clbit 0 from the LEFT | **red** (control decodes q1=1) |
| S1b | same edit, Bell run | **null, predicted**: 00/11 are symmetric. The Bell run alone can never catch an endianness bug. |
| S2 | `QUBIT_OF_CLBIT = (1, 0)` | red |
| S3 | `KEY_QUBITS = [0, 1]` | **null, predicted**: self-consistent, because keyQubits declares the order |
| S4 | once-flag never set | red (second call returns, 2 submits) |
| S5 | server histogram MSB-first (`{"2":1.0}`) | red, 2 FAIL. The first live control run is what settles IonQ's server convention. |
| S6 | noisy run, no 01/10 | red (`<1` check is not vacuous) |
| S7 | ideal run leaks into 01 | red |
| S8 | IonQ echoes no `qiskit_header` | **null, predicted**: the identity fallback equals this circuit's map |

## What I changed
- `efc2bf5`: `evidence/quantum/ionq-sim-rehearsal/` (rehearse.py, run-live.sh, sabotage.sh, fixtures/, out/, README).
- `vault/Reports/ionq-sim-rehearsal.md` committed after efc2bf5. Its hub is not committed, per the rules: `vault-hubs --check` shows Reports + Map STALE, so the loop must regenerate them after merge.
- `echo/` is untouched by this branch (`git diff --stat d9b42d0...HEAD -- echo/` is empty).

## Not done / not verified
- **Any IonQ result:** ideal/aria-1/forte-1 counts, correlated fractions, latency, and IonQ's server-side bit convention.
- **The supervisor's keyless re-run against a saved IonQ response:** no real response exists. The fixtures are SYNTHETIC and say so in every file. The keyless replay path itself is ready: it consumes a `live-*.fixture.json` unchanged.
- **The key-prefix leak grep:** there is no key on the host to take a prefix from. I ran a generic token-pattern scan instead (`out/leak-scan.txt`, no match), and `run-live.sh` does the prefix/length scan when the key exists.
- The control result's `facts` describe the Bell circuit, because it is parsed by `interpret_counts`. It is rehearsal-only. Every `facts[0]` names "Qollab's Select QPU dialog"; the off-Qollab label is in each file's `label` field.

## Decisions inferred from the docs
- **Replay at the qiskit-ionq HTTP-method level, not the `requests` level.** The brief asks for a keyless re-run from a saved response. Method-level response bodies never contain request headers, so a fixture cannot carry the key (owner ruling: never log the key).
- **One process per job.** `qollab_job`'s once-per-run flag is module state, and Qollab's unit is a run (CLAUDE.md, vision §10.7).
- **Noisy threshold `0.80 ≤ fraction < 1`.** "Plausibly <1" (brief); 0.80 is my floor for a 2-qubit Bell pair on an aria/forte noise model. It is not from a doc, so the first live run should calibrate it.

## Requests
- **Owner (access):** create `~/.config/echo/ionq.env` holding `IONQ_API_KEY=…` (simulator only). The key goes nowhere else.
- **Supervisor:** after that, re-dispatch, or run `zsh evidence/quantum/ionq-sim-rehearsal/run-live.sh` (exit 0 = all green and no leak). Then commit `out/live/*.fixture.json` as the real keyless fixtures and re-run `sabotage.sh`, pointing its control rows at the live control fixture.
