#!/bin/zsh
# Each sabotage runs on a fresh disposable copy of echo/ (law 10); prints failed/passed counts.
SRC=${SRC:-$(cd "$(dirname "$0")/../../.." && pwd)/echo}
PY=/Users/udsy/PycharmProjects/Qollab-Hackathon-Quantum-Unlocked/.venv/bin/python
run() { # name, python-edit-script
  D=$(mktemp -d); cp -R $SRC $D/echo
  F=$D/echo/quantum/qollab_job.py
  $PY -c "import sys;p=sys.argv[1];s=open(p).read();old,new=sys.argv[2],sys.argv[3];assert old in s,('PATTERN NOT FOUND',old);open(p,'w').write(s.replace(old,new,1))" $F "$2" "$3" || { echo "$1 | REFUSED (edit did not apply)"; return; }
  out=$(cd $D && $PY -m pytest -p no:cacheprovider echo/tests/test_qollab_job.py -q 2>&1 | tail -1)
  echo "$1 | $out"
}
run "S0 control (no-op edit)" "DEFAULT_SHOTS = 256" "DEFAULT_SHOTS = 256"
run "S1 reverse bit order (leftmost=q0)" "int(key[-1 - clbit])" "int(key[clbit])"
run "S2 swap register mapping" "QUBIT_OF_CLBIT = (0, 1)" "QUBIT_OF_CLBIT = (1, 0)"
run "S3 remove the once-only guard" "    if _job_submitted:
        raise" "    if False:
        raise"
run "S4 spend allowance only after success" "    _job_submitted = True
    job = backend.run(build_bell_verification_circuit(), shots=shots)" "    job = backend.run(build_bell_verification_circuit(), shots=shots)
    _job_submitted = True"
run "S5 accept empty dict (drop emptiness check)" "if not isinstance(raw_counts, dict) or not raw_counts:" "if not isinstance(raw_counts, dict):"
run "S6 drop zero-shot check" "    if shots == 0:
        raise" "    if False:
        raise"
run "S7 accept negative/float counts" "if isinstance(count, bool) or not isinstance(count, Integral) or count < 0:" "if False:"
run "S8 hex: reverse bits" "return tuple((value >> clbit) & 1 for clbit in range(NUM_QUBITS))" "return tuple((value >> (NUM_QUBITS - 1 - clbit)) & 1 for clbit in range(NUM_QUBITS))"
run "S9 canonical key reversed" "for c in reversed(range(NUM_QUBITS))" "for c in range(NUM_QUBITS)"
run "S10 claim teleportation in facts" "This is a Bell-pair correlation check, not teleportation." "Teleportation executed on the selected backend."
run "S11 hardcode a backend" "    job = backend.run(" "    backend = __import__('qiskit.providers.basic_provider', fromlist=['x']).BasicSimulator()
    job = backend.run("
run "S12 drop shots-mismatch fact" "    if shots_requested is not None and shots != shots_requested:" "    if False:"
run "S13 drop backend name from facts" "which reported itself as '{backend_name}'." "which reported itself."
