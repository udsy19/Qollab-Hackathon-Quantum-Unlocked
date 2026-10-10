"""Backend selection: Qiskit's built-in simulator locally, IonQ's simulator on Qollab."""

import os

from qiskit.providers.basic_provider import BasicSimulator


def get_backend(name: str | None = None):
    """Return a backend by name: "local" or "ionq" (IonQ cloud simulator).

    Defaults to the QU_BACKEND env var, then "ionq" if IONQ_API_KEY is set, else "local".
    """
    name = name or os.environ.get("QU_BACKEND") or ("ionq" if os.environ.get("IONQ_API_KEY") else "local")
    if name == "local":
        return BasicSimulator()
    if name == "ionq":
        from qiskit_ionq import IonQProvider

        return IonQProvider().get_backend("simulator")
    raise ValueError(f"Unknown backend {name!r}; use 'local' or 'ionq'.")
