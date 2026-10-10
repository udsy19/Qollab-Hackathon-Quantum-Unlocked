def submit(qc, dev):
    job = dev.run(qc, shots=10)
    return job
