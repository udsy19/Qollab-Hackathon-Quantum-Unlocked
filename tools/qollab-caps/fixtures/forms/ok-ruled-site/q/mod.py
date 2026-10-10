def label(backend):
    name = getattr(backend, "name", None)
    noise = getattr(getattr(backend, "options", None), "noise_model", None)
    return str(name), noise
