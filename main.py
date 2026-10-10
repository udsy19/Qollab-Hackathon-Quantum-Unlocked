"""Entry point. Currently a smoke test: runs a Bell circuit on the selected backend."""

import argparse

from qiskit import QuantumCircuit, transpile

from quantum_unlocked.backends import get_backend


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--backend", choices=["local", "ionq"], help="default: ionq if IONQ_API_KEY is set, else local")
    parser.add_argument("--shots", type=int, default=1024)
    args = parser.parse_args()

    qc = QuantumCircuit(2)
    qc.h(0)
    qc.cx(0, 1)
    qc.measure_all()

    backend = get_backend(args.backend)
    counts = backend.run(transpile(qc, backend), shots=args.shots).result().get_counts()
    print(f"backend: {backend.name}")
    print(qc.draw())
    print(counts)


if __name__ == "__main__":
    main()
