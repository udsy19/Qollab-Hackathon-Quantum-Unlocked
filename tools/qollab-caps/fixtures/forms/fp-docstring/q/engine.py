"""Engine helpers. Never read an api_key or a ?token= here, and never name ionq_simulator:
the backend is injected. localStorage does not exist on Qollab."""


def f():
    """Return 1. Not backend.run, not api_key."""
    return 1
