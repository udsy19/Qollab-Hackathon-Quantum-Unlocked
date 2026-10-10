def go(backend, qc, attr='r' + 'un'):
    return getattr(backend, attr)(qc)
