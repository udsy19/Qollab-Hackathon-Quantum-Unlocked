#!/usr/bin/env python3
"""DEV-ONLY quantum engine for the gameplay harness. Never part of the echo/ upload.

    python3 dev/gameplay/dev_engine.py 8641     # serves the worktree root and /dev-engine/* on 127.0.0.1:8641

Why it exists: contracts v2 refuses `documented_preview` for Mission 2 and for the teleport dry run
(echo/CONTRACTS.md § Engine rules), so a JS stand-in can no longer drive those steps honestly, and
vault/Index.md records that green tests on a fake adapter once hid a total integration break. This
server computes every result with real Qiskit (Statevector, partial_trace, state_fidelity) in local
CPython, so `engine: "exact_qiskit_local"` is true. It is NOT the game's Pyodide bridge
(echo/quantum/, quantum lane); every result says so in its facts.

Both teleport dry-run phases are platform's Qiskit oracle (tools/contract-check/teleport_oracle.py),
imported rather than re-implemented. Cloning, Bell signalling and the story-token commit are small
Qiskit circuits here because the quantum lane's modules are not on this branch and predate the v2
two-phase shapes.

GET only (Qollab forbids POST; the harness keeps to the same rule). Arguments: ?a=<JSON object>.
"""
import functools
import http.server
import json
import pathlib
import random
import sys
import urllib.parse

from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector, partial_trace, state_fidelity

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools" / "contract-check"))
import teleport_oracle as oracle  # noqa: E402  (platform's Qiskit ground truth for the dry run)

DEV_FACT = "Dev engine: Qiskit in local CPython (gameplay harness), not the game's Pyodide bridge."
PREPARE = {"zero": [], "one": ["x"], "plus": ["h"], "phase": ["h", "s"]}
# The story token: a fixed generic Bloch point, never shown to the player (owner ruling 8).
STORY_TOKEN = (2.31, -2.05)
rng = random.Random()


def r12(x):
    return round(float(x), 12)


def clone_test(state):
    if state not in PREPARE:
        raise ValueError(f'unknown clone state "{state}"')
    prep = QuantumCircuit(1)
    for g in PREPARE[state]:
        getattr(prep, g)(0)
    psi = Statevector.from_instruction(prep)
    qc = QuantumCircuit(2)
    qc.compose(prep, [0], inplace=True)
    qc.cx(0, 1)  # the naive duplicator: q1 starts blank |0>
    out = Statevector.from_instruction(qc)
    fid = r12(state_fidelity(out, psi.tensor(psi)))
    purity = r12(partial_trace(out, [0]).purity().real)
    copied = fid > 1 - 1e-6
    return {
        "experiment": "cloning",
        "circuitDescription": f"prepare {state} on q0; CX(q0, q1) with q1 blank |0>",
        "qubits": 2,
        "parameters": {"state": state},
        "probabilities": {k: r12(v) for k, v in out.probabilities_dict().items()},
        "keyQubits": [1, 0],
        "observables": {"purityQ0": r12(partial_trace(out, [1]).purity().real), "purityQ1": purity},
        "fidelity": fid,
        "facts": (["A basis state copies: q1 now reads the same as q0. This is a special case, not a universal copier."]
                  if copied else
                  [f"Copy fidelity with two independent copies is {fid}, not 1.",
                   f"Each output half has purity {purity}: it is entangled with the other, not a copy."]) + [DEV_FACT],
    }


def bell_signalling(senderGate):
    if senderGate not in ("I", "X", "Z"):
        raise ValueError(f'unknown sender gate "{senderGate}"')
    qc = QuantumCircuit(2)
    qc.h(0)
    qc.cx(0, 1)  # q0 sender, q1 receiver
    if senderGate == "X":
        qc.x(0)
    if senderGate == "Z":
        qc.z(0)
    sv = Statevector.from_instruction(qc)
    marginal = sv.probabilities_dict(qargs=[1])
    p0, p1 = r12(marginal.get("0", 0.0)), r12(marginal.get("1", 0.0))
    return {
        "experiment": "bell_signalling",
        "circuitDescription": f"H(q0); CX(q0, q1); sender applies {senderGate} to q0; receiver reads q1 alone",
        "qubits": 2,
        "parameters": {"senderGate": senderGate},
        "probabilities": {"0": p0, "1": p1},
        "keyQubits": [1],
        "observables": {"receiverPurity": r12(partial_trace(sv, [0]).purity().real),
                        "jointSame": r12(sum(v for k, v in sv.probabilities_dict().items() if k in ("00", "11")))},
        "facts": [f"Receiver alone sees P(0)={p0}, P(1)={p1} whatever the sender did: no message arrives.",
                  f"The sender's {senderGate} only shows up when both sides' results are compared over a classical link.",
                  DEV_FACT],
    }


def teleport_bits(theta, phi):
    res = oracle.bits_result(float(theta), float(phi), rng)
    res["facts"].append(DEV_FACT)
    return res


def teleport_correction(theta, phi, m0, m1, applyX, applyZ):
    res = oracle.correction_result(float(theta), float(phi), int(m0), int(m1), bool(applyX), bool(applyZ))
    res["facts"].append(DEV_FACT)
    return res


def commit_story_token(fault=False):
    # One atomic call (owner ruling, gameplay consult 3): live bits, the §7.1 rule's corrections and
    # the receiver fidelity together. `fault` is a dev switch: the engine applies the wrong X.
    theta, phi = STORY_TOKEN
    probs = oracle.branch_probabilities(oracle.protocol(theta, phi))
    u, acc = rng.random(), 0.0
    for key, p in probs.items():
        acc += p
        if u < acc:
            break
    m1, m0 = int(key[0]), int(key[1])
    ax, az = (m1 == 1) != bool(fault), m0 == 1
    f, _ = oracle.fidelity(theta, phi, m0, m1, ax, az)
    return {
        "experiment": "teleportation",
        "circuitDescription": f"story token on q0; {oracle.PROTOCOL}; receiver applies the rule's corrections",
        "qubits": 3,
        # The token's angles are never shown (owner ruling 8).
        "parameters": {"stateId": "story_token", "applyX": ax, "applyZ": az},
        "measurementBits": {"m0": m0, "m1": m1},
        "fidelity": r12(f),
        "facts": [f"Bell measurement gave SOURCE READOUT m0={m0} and LOCAL BELL-HALF READOUT m1={m1}, sent as two classical bits.",
                  f"Receiver state fidelity with the original: {f:.6f}.",
                  "The source qubit was measured, so the original is gone: one of one.", DEV_FACT],
    }


CALLS = {"cloneTest": clone_test, "bellSignalling": bell_signalling, "teleportBits": teleport_bits,
         "teleportCorrection": teleport_correction, "commitStoryToken": commit_story_token}


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        url = urllib.parse.urlparse(self.path)
        if not url.path.startswith("/dev-engine/"):
            return super().do_GET()
        name = url.path[len("/dev-engine/"):]
        try:
            if name not in CALLS:
                raise ValueError(f"unknown call {name!r}")
            args = json.loads(urllib.parse.parse_qs(url.query).get("a", ["{}"])[0])
            body, code = {"ok": True, "result": {**CALLS[name](**args), "engine": "exact_qiskit_local"}}, 200
        except Exception as err:  # the client shows the error; nothing invented
            body, code = {"ok": False, "error": f"{type(err).__name__}: {err}"}, 400
        data = json.dumps(body, allow_nan=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")  # every load reads the build on disk (law 16)
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8641
    handler = functools.partial(Handler, directory=str(ROOT))
    with http.server.ThreadingHTTPServer(("127.0.0.1", port), handler) as srv:
        # Port 0 asks the OS for a free one; the line below is how a test learns which.
        print(f"dev engine + static on http://127.0.0.1:{srv.server_address[1]}/", flush=True)
        srv.serve_forever()
