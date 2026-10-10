---
type: research
status: current
date: 2026-10-09
updated: 2026-10-09
owner: quantum (backend-job)
tags:
  - qollab
  - backend
  - ionq
  - pyodide
---

# Reaching Qollab's selected backend from a JS/Qiskit project, and reading its counts

In a JS/Qiskit project, Qollab's `backend` is a **JavaScript global**. Python reaches it only when JS **passes it as an argument through `.callPromising`**. Counts come back as Qiskit bitstrings with the rightmost bit as classical bit 0, and that holds for IonQ too. Whether Pyodide's Qiskit build supports `Statevector`, `DensityMatrix`, `partial_trace` and `state_fidelity` is **not measurable off Qollab**: the owner has to run one probe there.

**How this was read.** The Qollab docs were fetched with `curl` on 2026-10-09 and extracted with `defuddle parse --markdown`; the pages are server-rendered, so a plain GET returns the text. The qiskit-ionq source was read from the lane venv (`qiskit-ionq 1.1.1`). Tests ran in `/Users/udsy/PycharmProjects/Qollab-Hackathon-Quantum-Unlocked/.venv` (Python 3.13.0, qiskit 2.5.2). **Nothing in this note was run on Qollab or IonQ.**

Labels: **DOC** = Qollab or Pyodide documentation; **SOURCE** = read from a library's code; **MEASURED** = a local command, with its artifact; **UNKNOWN** = needs the owner on Qollab.

## Q1. Where does `backend` live in a JS project? Does Python need `callPromising`?

| finding | label | source |
|---|---|---|
| "In Python it is a global in `main.py`. Pass it as an argument to any of your modules that needs it." | DOC | https://qollab.xyz/learn/docs/runtime-environment § The backend variable |
| "In JavaScript it is available in `main.js` and in every JS file it imports. `await backend.run(circuit, { shots })` returns a job, and `await job.result()` gives the result." | DOC | same |
| The documented JS → Python pattern passes the JS global into Python: `const counts = (await bell.run_bell.callPromising(backend, 1000)).toJs();` | DOC | https://qollab.xyz/learn/docs/js-qiskit-projects § The files; runtime-environment § Importing your own files |
| "On IonQ backends, a plain call such as `bell.run_bell(backend, 1000)` stops the run with a `ConnectionError` that says XHR is not supported." **So any Python function that calls `backend.run` must be invoked with `.callPromising` (or `.callPromisingKwargs`).** | DOC | js-qiskit-projects; runtime-environment |
| `backend` is the provider's real object: `BasicSimulator` for the built-in simulator, IBM `Fake*` backends, and `IonQProvider`'s backend for IonQ. "Nothing in the playground intercepts `run()`." | DOC | https://qollab.xyz/learn/docs/python-qiskit-projects § The pre-created backend |
| IonQ backends (remote simulators and hardware) accept **one job per run**; a second stops the run. Local simulators accept any number. | DOC | runtime-environment § One job per run on IonQ; https://qollab.xyz/learn/docs/compute-backends |
| Default shots are 1024 on the built-in simulator and on IonQ when `shots` is omitted. | DOC | https://qollab.xyz/learn/docs/run-your-code |
| **UNKNOWN:** whether `backend` is ALSO a Python global inside modules imported by a JS project. The docs name it a global only in `main.py`, and a JS project has no `main.py`. Do not rely on it; pass it in. | UNKNOWN | — |
| **UNKNOWN:** whether the JS `backend` is a PyProxy of the Python backend object or a JS wrapper. `backend.run(circuit, { shots: 100 })` takes a trailing options object, which a raw PyProxy would not turn into keyword arguments without `callKwargs`. The documented `callPromising(backend, …)` pattern works either way, according to the docs. | UNKNOWN | — |
| **UNKNOWN:** whether Python module state survives **Stop → Run**. The docs say the *page's* state is gone after Stop or a reload, but say nothing about the Pyodide interpreter. If imported modules stay cached, `qollab_job.py`'s once-only flag would wrongly refuse the next run's legitimate job. Settle it on the built-in simulator once ECHO runs: verify, press Stop, press Run, verify again. The second run must not be refused. | UNKNOWN | runtime-environment § Saving data between runs |
| **UNKNOWN:** whether a FAILED first IonQ job still uses up the run's one-job allowance. Vision §10.7 assumes it may. `qollab_job.py` treats it as spent. | UNKNOWN | — |

## Q2. What does `get_counts()` return, through `.toJs()`, and in which bit order?

| finding | label | source |
|---|---|---|
| Qiskit `Result.get_counts()` returns `{bitstring: int}`, with keys written `c_{n-1} … c_0`: **the rightmost character is classical bit 0.** | MEASURED | `echo/tests/test_qollab_job.py::test_basic_simulator_output_reads_the_flipped_qubit`: `X(q0)` measured into c0 gives key `01` on local BasicSimulator; `X(q1)` gives `10` |
| qiskit-ionq builds the same convention from IonQ's integer histogram (qubit *i* = bit *i* of the state index). `map_output` reorders through the circuit's `meas_mapped` clbits, then formats the key MSB-left. | SOURCE | `qiskit_ionq/ionq_job.py:58-77` (`map_output`) and `:79-146` (`_build_counts`), qiskit-ionq 1.1.1 |
| Feeding `_build_counts` the histogram of an X-on-q0 circuit (`{"1": 1.0}`) gives key `01`, read as q0=1. | MEASURED | `test_ionq_histogram_mapping_reads_the_flipped_qubit` |
| On IonQ **simulators**, the API returns probabilities. qiskit-ionq turns them into counts on the client: on the ideal simulator by random sampling, otherwise `round(prob × shots)`. **So a count total can differ from the shots requested.** `qollab_job.py` reports any such difference as a fact. | SOURCE | `ionq_job.py:107-146` and the `get_counts` docstring (`:320-336`) |
| **UNKNOWN:** which qiskit-ionq version Qollab runs. The source above is 1.1.1. | UNKNOWN | — |
| Pyodide's `PyProxy.toJs()` converts a dict to a **JS `Map` by default**. `(it) => new Map(it)` "is the default behavior". **`JSON.stringify` of a `Map` prints `{}`.** Use `toJs({ dict_converter: Object.fromEntries })`, which also applies to nested dicts. | DOC | https://pyodide.org/en/stable/usage/api/js-api.html (`PyProxy.toJs`, `options.dict_converter`) |
| **UNKNOWN:** whether Qollab changes that default. Its own example does `JSON.stringify(counts)` on a plain `.toJs()`, which suggests it might (js-qiskit-projects § A minimal example). The `dict_converter` call is correct either way. | UNKNOWN | — |

## Q3. Does Qollab's Pyodide Qiskit support what ECHO's quantum code uses?

| finding | label | source |
|---|---|---|
| Runtime: Python 3.14, Qiskit 2.x. If `requirements.txt` does not name Qiskit, the runtime adds `qiskit>=2.5.2,<3.0.0`. | DOC | python-qiskit-projects; runtime-environment § Libraries |
| Text drawings work without the Visualizations library: "Text drawings from `print(circuit)` work without it." `draw("mpl")` needs it. | DOC | python-qiskit-projects § Visualizations |
| `QuantumCircuit`, `backend.run`, `get_counts` work in JS and Python. | DOC | js-qiskit-projects, python-qiskit-projects (minimal examples) |
| **Neither PyPI nor Pyodide ships a WebAssembly Qiskit wheel**, so Qollab builds its own and it cannot be reproduced locally. PyPI `qiskit` 2.5.2 has no `emscripten`/`wasm` wheel. The Pyodide `314.0.7` lockfile (Python 3.14.2) has numpy 2.4.6, scipy 1.18.0 and sympy, but no qiskit. Its 0.29.0 lockfile has `rustworkx` only. | MEASURED | `curl https://pypi.org/pypi/qiskit/json`; `curl https://cdn.jsdelivr.net/pyodide/v314.0.7/full/pyodide-lock.json`, 2026-10-09 |
| **UNKNOWN:** `Statevector`, `DensityMatrix`, `partial_trace`, `state_fidelity` and `BasicSimulator` on Qollab. They are numpy-based in `qiskit.quantum_info`, but they import Qiskit's Rust extension, whose wasm build is Qollab's. **Settle it with the probe below.** | UNKNOWN | — |

### The probe (for the owner: a scratch **Python** project on Qollab, Built-in simulator, about 10 s)

```python
import sys, qiskit
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector, DensityMatrix, partial_trace, state_fidelity
qc = QuantumCircuit(2); qc.h(0); qc.cx(0, 1)
sv = Statevector.from_instruction(qc)
rho_b = partial_trace(DensityMatrix(sv), [0])
print(sys.version, qiskit.__version__)
print(sv.probabilities_dict())                  # expect {'00': 0.5, '11': 0.5}
print(rho_b.data.real.round(3).tolist())        # expect [[0.5, 0.0], [0.0, 0.5]]
print(state_fidelity(rho_b, DensityMatrix.from_label('0')))   # expect 0.5
print(qc.draw(output='text'))
print(type(backend).__name__, getattr(backend, 'name', None))
m = qc.copy(); m.measure_all(); print(backend.run(m, shots=64).result().get_counts())
```

The last two lines also answer what the built-in backend reports as its `name`, and the key format Qollab hands back. Paste the console output into `owner-answers.md`.

## What this settles for ECHO

- `echo/quantum/qollab_job.py` takes `backend` **as an argument** and must be called from `main.js` with `.callPromising(backend)`. It never creates or names a backend; a test greps its code to enforce that.
- It reads counts through an explicit mapping (`QUBIT_OF_CLBIT = (0, 1)`, rightmost key bit = clbit 0). The endianness tests go red if the order is reversed; the sabotage table is in `lanes/quantum/reports/0001-backend-job.md`.
- JS must convert its result with `toJs({ dict_converter: Object.fromEntries })`.

## Related

- [[qollab-platform-and-submission]] (§1, §2), the platform research this note extends
- Vision §8.4, §8.6, §10.7; `QOLLAB_DEPLOYMENT.md` § Exact backend strategy; `.claude/rules/qollab-runtime.md`
