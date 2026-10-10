class Sender:
    def __init__(self, dev):
        self.dev = dev

    def go(self):
        return self.dev.run(1)


def f(backend):
    return Sender(backend).go()
