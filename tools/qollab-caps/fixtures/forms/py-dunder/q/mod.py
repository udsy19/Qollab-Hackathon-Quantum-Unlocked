def f(backend):
    return backend.__getattribute__('run')(1)
