# evidence/quantum/ionq-sim-rehearsal

Agent `ionq-sim-rehearsal` (lane quantum, consult 6), 2026-10-10, branch `lane/quantum/ionq-sim-rehearsal`.
Interpreter: `/Users/udsy/PycharmProjects/Qollab-Hackathon-Quantum-Unlocked/.venv/bin/python` (3.13.0, qiskit 2.5.2, qiskit-ionq 1.1.1).
`echo/quantum/qollab_job.py` as of d9b42d0 (not edited).

**No IonQ job ran.** `~/.config/echo/ionq.env` does not exist on this host (`test -f` exit 1), so per the owner's ruling the
IonQ step stopped (`out/live-refused.txt`, `out/run-live-refused.txt`, exit 2). Everything below is either **SYNTHETIC**
(hand-typed histogram, labelled so in every file) or a refusal. No result here may be described as an IonQ result.

## What was built

| file | what |
|---|---|
| `rehearse.py` | one process = one ECHO run. `live`: one job on `IonQProvider().get_backend("simulator")` (refuses any other name), records every IonQ response body as a fixture. `replay FIXTURE`: no key, no network; patches only qiskit-ionq's `submit_job`/`retrieve_job`/`get_results`, so `_format_result`, `_build_counts`, `get_counts` and all of `qollab_job` run for real. `synth`: builds a fixture whose job metadata is what qiskit-ionq really serialises for the circuit, with a hand-typed histogram. Since backend-site-move (2026-10-10) both runs do what bridge.js does: `qollab_job.build_backend_verification_circuit` (or the X-on-q0 control), ONE `backend.run`, then `qollab_job.interpret_counts(raw, backend, shots_requested=256)`. The once-per-run memo is bridge.js's and is graded in `evidence/quantum/pyodide-bridge`; `sabotage.sh` S4 is now "Python submits a second job". Current replays and table: `evidence/quantum/backend-site-move/rehearsal/`. |
| `run-live.sh` | for the key holder: 6 live jobs (Bell and control × ideal/aria-1/forte-1), key loaded per command with `set -a; . ionq.env; set +a`, then a leak scan printing only file names and the key's length. |
| `sabotage.sh` | 10 rows, each on a fresh temp copy of `echo/` or of a fixture; never edits the worktree. |
| `fixtures/synth-*.fixture.json` | SYNTHETIC. Histograms: control ideal `{"1":1.0}`, control forte-1 `{"1":0.97,"0":0.01,"3":0.015,"2":0.005}`, Bell ideal `{"0":0.5,"3":0.5}`, Bell aria-1 `{"0":0.49,"3":0.47,"1":0.02,"2":0.02}`. |

## Commands and exit codes

| artifact | command | exit |
|---|---|---|
| `out/live-refused.txt` | `rehearse.py live --circuit bell --noise ideal …` with no key in env | 2 (refused) |
| `out/run-live-refused.txt` | `zsh run-live.sh` | 2 (key file missing) |
| `out/replay-synthetic.txt`, `out/replay/*` | `rehearse.py replay fixtures/synth-*.fixture.json --out out/replay` ×4 | 0, 0, 0, 0 (24 checks, 0 failed) |
| `out/sabotage-table.txt` | `zsh sabotage.sh` | 0 (the script reports; 6 red + 4 predicted nulls, all as predicted) |
| `out/validate-as-is.txt` | `node ../contract-conformance/validate.mjs <contracts.js from lane/platform/integration 43be7d9> out/replay/results.jsonl` | 1: 4/4 rejected, only on `experiment "bell_verification"` |
| `out/validate-patched.txt` | same, on a temp copy with only `bell_verification`→`backend_verification` | 0: 0/4 rejected |
| `out/leak-scan.txt` | key-pattern grep over this directory | no match (the key's exact prefix could not be grepped: no key on host) |

## Reproduce (no key)
```
python -W ignore rehearse.py replay fixtures/synth-control-ideal.fixture.json --out /tmp/r   # expect exit 0
zsh sabotage.sh                                                                              # S1/S2/S5 red = the control bites
```

## Caveats
- A replay of an **ideal**-simulator fixture re-samples counts from IonQ's probabilities (qiskit-ionq's sampler, seed `None`), so the counts differ from the live run's; the probabilities and parsing are what replay reproduces. Noisy fixtures are deterministic (`round(p × shots)`).
- The control is parsed by `interpret_counts`, so its `facts` describe the Bell circuit. The control is rehearsal-only and is never shown in the game.
- `facts[0]` always says "the backend chosen in Qollab's Select QPU dialog". That is true in the game and false for this rehearsal; the off-Qollab label lives in each file's `label` field.
