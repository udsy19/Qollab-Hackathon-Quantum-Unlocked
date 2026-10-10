import operator

def go(backend, qc):
    return operator.attrgetter("run")(backend)(qc)
