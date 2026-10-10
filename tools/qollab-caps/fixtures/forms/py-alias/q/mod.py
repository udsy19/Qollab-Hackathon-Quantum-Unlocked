def go(backend, qc):
    device = backend
    return device.run(qc)
