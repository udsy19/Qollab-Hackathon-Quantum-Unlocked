"""Rehearse ECHO's one selected-backend job against IonQ's simulator stack, off Qollab.

One process = one ECHO run: exactly one job is submitted, as bridge.js does on Qollab.

  live    needs an IonQ key in the environment (owner's ~/.config/echo/ionq.env, loaded only by the
          calling shell). Submits ONE circuit to IonQProvider().get_backend("simulator"), never qpu.
          Records every IonQ API response body qiskit-ionq received, so the run replays keyless.
  replay  no key, no network. Patches ONLY qiskit-ionq's three HTTP methods (submit_job,
          retrieve_job, get_results) to hand back a fixture's recorded responses. Everything above
          the wire (the meas_mapped header round trip, _format_result, _build_counts, get_counts)
          and all of qollab_job runs for real.
  synth   writes a SYNTHETIC fixture: the job metadata is what qiskit-ionq really serialises for
          the circuit (IonQ echoes it back on retrieve), but the histogram is typed in by hand. It
          proves the client path, not IonQ's server, and every output says so.

The Bell run does what bridge.js's verifySelectedBackendOnce does: qollab_job builds the circuit,
ONE backend.run submits it (in the game that call is JS, the only submit site), and
qollab_job.interpret_counts reads the counts with the backend handed in. The asymmetric control
(X on q0 only) is submitted the same way and parsed by the same interpret_counts. The once-per-run
memo lives in bridge.js and is graded by evidence/quantum/pyodide-bridge, not here.

usage:
  rehearse.py live   --circuit bell|control --noise ideal|aria-1|forte-1 --out DIR [--echo-root P]
  rehearse.py replay FIXTURE --out DIR [--echo-root P]
  rehearse.py synth  --circuit bell|control --noise N --histogram JSON --fixture PATH
Exit: 0 every check passed · 1 a check failed · 2 could not run (no key, bad fixture).
"""

import argparse
import copy
import importlib
import json
import os
import sys
import time
from pathlib import Path

LABEL = "local IonQ simulator (off Qollab)"
SYNTH_LABEL = "SYNTHETIC fixture: hand-typed histogram, NOT an IonQ response; exercises the " + LABEL + " client path only"
SHOTS = 256  # owner ruling; platform's BACKEND_SHOTS
WORKTREE = Path(__file__).resolve().parents[3]
KEY_ENV = ("QISKIT_IONQ_API_TOKEN", "IONQ_API_KEY", "IONQ_API_TOKEN")  # qiskit_ionq/helpers.py lookup order


def load_qollab_job(echo_root):
    sys.path.insert(0, str(Path(echo_root).resolve()))
    return importlib.import_module("quantum.qollab_job")


def control_circuit():
    """X on q0 only, then measure q0->c0, q1->c1. The ONLY correct reading is q0=1, q1=0."""
    from qiskit import QuantumCircuit
    qc = QuantumCircuit(2, 2, name="echo_asymmetric_control")
    qc.x(0)
    qc.measure(0, 0)
    qc.measure(1, 1)
    return qc


def ionq_backend(noise, token):
    from qiskit_ionq import IonQProvider
    backend = IonQProvider(token=token).get_backend("simulator")  # never "qpu" (owner ruling)
    if backend.name != "ionq_simulator":
        raise SystemExit(f"refusing: backend is {backend.name!r}, not ionq_simulator")
    backend.set_options(noise_model=noise)
    return backend


def run_one(qj, backend, circuit_kind):
    """The measured part of a run. Returns (raw counts, parsed result dict, timing)."""
    circuit = qj.build_backend_verification_circuit() if circuit_kind == "bell" else control_circuit()
    t0 = time.perf_counter()
    job = backend.run(circuit, shots=SHOTS)
    submit_s = time.perf_counter() - t0
    raw = job.result().get_counts()
    result = qj.interpret_counts(raw, backend, shots_requested=SHOTS)
    total_s = time.perf_counter() - t0
    return dict(raw), result, {"submit_s": round(submit_s, 4), "submit_to_counts_s": round(total_s, 4)}


def checks(circuit_kind, noise, raw, result):
    """Expectations come from the circuit; keys are decoded with the keyQubits the RESULT declares,
    so a parser that put clbit 0 on the wrong side cannot agree with itself. -> [(name, ok, detail)]"""
    out = []
    kq = result.get("keyQubits")
    counts = result.get("counts") or {}
    total = sum(counts.values())
    out.append(("counts non-empty", total > 0, f"total={total}"))
    out.append(("parameters.shots is the 256 requested", result["parameters"].get("shots") == SHOTS,
                f"{result['parameters'].get('shots')}"))

    def decode(key):  # key char i is the readout of qubit kq[i]
        return {kq[i]: int(ch) for i, ch in enumerate(key)}

    if circuit_kind == "control":
        dom = max(counts, key=counts.get)
        q = decode(dom)
        out.append(("control: dominant key decodes to q0=1, q1=0", q == {0: 1, 1: 0},
                    f"key {dom!r}, keyQubits {kq} -> {q}"))
        raw_dom = max(raw, key=raw.get)
        out.append(("control: qiskit-ionq raw key has clbit 0 rightmost", raw_dom == "01", f"raw dominant {raw_dom!r}"))
        if noise == "ideal":
            out.append(("control ideal: every shot reads q0=1, q1=0", counts.get(dom) == total, f"{counts}"))
    else:
        corr = sum(c for k, c in counts.items() if len(set(decode(k).values())) == 1)
        frac = corr / total
        if noise == "ideal":
            out.append(("bell ideal: correlated fraction == 1", frac == 1.0, f"{corr}/{total}"))
            out.append(("bell ideal: total == shots requested", total == SHOTS, f"{total}"))
        else:
            out.append(("bell noisy: 0.80 <= correlated fraction < 1", 0.80 <= frac < 1.0, f"{corr}/{total} = {frac:.4f}"))
        out.append(("bell: both 00 and 11 seen", counts.get("00", 0) > 0 and counts.get("11", 0) > 0, f"{counts}"))
    return out


def write_run(out_dir, name, label, raw, result, timing, check_rows, fixture):
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / f"{name}.raw-counts.json").write_text(json.dumps({"label": label, "raw_get_counts": raw}, indent=2) + "\n")
    (out_dir / f"{name}.result.json").write_text(json.dumps({"label": label, "result": result, "timing": timing}, indent=2) + "\n")
    if fixture is not None:
        (out_dir / f"{name}.fixture.json").write_text(json.dumps(fixture, indent=2) + "\n")
    with open(out_dir / "results.jsonl", "a") as f:  # validate.mjs input
        f.write(json.dumps({"call": f"{name} [{label}]", "result": result}) + "\n")
    bad = 0
    print(f"== {name}  [{label}]  timing {timing}")
    for nm, ok, detail in check_rows:
        bad += not ok
        print(f"  {'PASS' if ok else 'FAIL'}  {nm}  ({detail})")
    print(f"  {len(check_rows)} checks, {bad} failed")
    return bad


def cmd_live(a):
    token = next((os.environ[k] for k in KEY_ENV if os.environ.get(k)), None)
    if not token:
        print("REFUSED: no IonQ key in the environment (load ~/.config/echo/ionq.env in the calling shell)")
        return 2
    from qiskit_ionq import ionq_client, __version__ as qi_version
    qj = load_qollab_job(a.echo_root)
    backend = ionq_backend(a.noise, token)
    del token
    rec = {"submit_job": [], "retrieve_job": [], "get_results": []}
    calls = {"submit_job": 0}
    orig = {m: getattr(ionq_client.IonQClient, m) for m in rec}

    def recorder(m):
        def wrapped(self, *args, **kw):
            if m == "submit_job":
                calls["submit_job"] += 1
            resp = orig[m](self, *args, **kw)
            rec[m].append(copy.deepcopy(resp))  # response bodies only; request headers (the key) are never read
            return resp
        return wrapped

    for m in rec:
        setattr(ionq_client.IonQClient, m, recorder(m))
    raw, result, timing = run_one(qj, backend, a.circuit)
    rows = checks(a.circuit, a.noise, raw, result)
    rows.append(("exactly one IonQ job submitted", calls["submit_job"] == 1, f"{calls['submit_job']}"))
    name = f"live-{a.circuit}-{a.noise}"
    fixture = {"label": LABEL, "provenance": "live", "circuit": a.circuit, "noise_model": a.noise, "shots": SHOTS,
               "qiskit_ionq": qi_version, "recorded_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
               "timing": timing, "responses": rec}
    return 1 if write_run(Path(a.out), name, LABEL, raw, result, timing, rows, fixture) else 0


def patch_client_with(fixture, calls):
    """Replace the three HTTP methods with the fixture's recorded responses, in order (the last
    retrieve_job response repeats, as a completed job's does)."""
    from qiskit_ionq import ionq_client
    resp = fixture["responses"]
    queues = {m: list(resp[m]) for m in ("retrieve_job", "get_results")}

    def submit_job(self, job):
        calls["submit_job"] += 1
        return copy.deepcopy(resp["submit_job"][0])

    def replay(m):
        def f(self, *args, **kw):
            q = queues[m]
            if not q:
                raise RuntimeError(f"fixture has no recorded {m} response")
            return copy.deepcopy(q.pop(0) if len(q) > 1 else q[0])
        return f

    ionq_client.IonQClient.submit_job = submit_job
    ionq_client.IonQClient.retrieve_job = replay("retrieve_job")
    ionq_client.IonQClient.get_results = replay("get_results")


def cmd_replay(a):
    try:
        fixture = json.loads(Path(a.fixture).read_text())
        circuit_kind, noise = fixture["circuit"], fixture["noise_model"]
        fixture["responses"]["submit_job"][0]
    except (OSError, ValueError, KeyError, IndexError) as e:
        print(f"REFUSED: unreadable fixture {a.fixture}: {e!r}")
        return 2
    label = LABEL + " (replayed)" if fixture.get("provenance") == "live" else SYNTH_LABEL
    calls = {"submit_job": 0}
    patch_client_with(fixture, calls)
    qj = load_qollab_job(a.echo_root)
    backend = ionq_backend(noise, "replay-no-key")
    raw, result, timing = run_one(qj, backend, circuit_kind)
    rows = checks(circuit_kind, noise, raw, result)
    rows.append(("exactly one job submitted", calls["submit_job"] == 1, f"{calls['submit_job']}"))
    timing["note"] = "replay: no network, local time only"
    name = "replay-" + Path(a.fixture).name.removesuffix(".fixture.json")
    return 1 if write_run(Path(a.out), name, label, raw, result, timing, rows, None) else 0


def cmd_synth(a):
    from qiskit_ionq import __version__ as qi_version
    from qiskit_ionq.helpers import qiskit_to_ionq
    qj = load_qollab_job(a.echo_root)
    backend = ionq_backend(a.noise, "synth-no-key")
    circ = qj.build_backend_verification_circuit() if a.circuit == "bell" else control_circuit()
    payload = json.loads(qiskit_to_ionq(circ, backend, {**backend.options.__dict__, "shots": SHOTS}, {}, {}))
    job_id = "synthetic-0000"
    fixture = {
        "label": SYNTH_LABEL, "provenance": "synthetic", "circuit": a.circuit, "noise_model": a.noise,
        "shots": SHOTS, "qiskit_ionq": qi_version, "submit_payload": payload,
        "responses": {
            "submit_job": [{"id": job_id, "status": "submitted"}],
            "retrieve_job": [{"id": job_id, "status": "completed", "metadata": payload.get("metadata", {}),
                              "stats": {"qubits": circ.num_qubits, "circuits": 1},
                              "results": {"probabilities": {"url": f"/v0.4/jobs/{job_id}/results/probabilities"}}}],
            "get_results": [json.loads(a.histogram)],
        },
    }
    Path(a.fixture).parent.mkdir(parents=True, exist_ok=True)
    Path(a.fixture).write_text(json.dumps(fixture, indent=2) + "\n")
    print(f"wrote {a.fixture}  [{SYNTH_LABEL}]")
    return 0


def main():
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)
    for name in ("live", "replay", "synth"):
        s = sub.add_parser(name)
        s.add_argument("--echo-root", default=str(WORKTREE / "echo"))
        if name == "replay":
            s.add_argument("fixture")
        else:
            s.add_argument("--circuit", choices=("bell", "control"), required=True)
            s.add_argument("--noise", choices=("ideal", "aria-1", "forte-1"), required=True)
        if name == "synth":
            s.add_argument("--histogram", required=True)
            s.add_argument("--fixture", required=True)
        else:
            s.add_argument("--out", required=True)
    a = p.parse_args()
    return {"live": cmd_live, "replay": cmd_replay, "synth": cmd_synth}[a.cmd](a)


if __name__ == "__main__":
    sys.exit(main())
