def go(backend, qc):
    return getattr(backend, "run")(qc)
