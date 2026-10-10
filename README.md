# Quantum Unlocked — _project name TBD_

> Qollab × IonQ Hackathon, Oct 9–11 2026 · Theme: **Quantum Unlocked**: make the hardest ideas in quantum computing click.

**Demo video (2–3 min, public, no sign-in):** _link TBD_
**Qollab project page:** _link TBD_

## What it does

_TBD: the topic we teach (error correction / fault tolerance / networking / algorithms), who it's for, and the one idea a viewer should walk away with._

## How it works

_TBD: the circuits behind each part, and what the interactive / visual layer shows._

## How to run

### On Qollab

Open the project on Qollab and run `main.py`. It uses IonQ's simulator automatically when `IONQ_API_KEY` is available; otherwise it falls back to Qiskit's built-in simulator.

### Locally

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

python main.py --backend local              # Qiskit BasicSimulator, no account needed
IONQ_API_KEY=... python main.py --backend ionq   # IonQ cloud simulator
```

Backend can also be set with `QU_BACKEND=local|ionq`.

## Project layout

```
main.py                      entry point
quantum_unlocked/backends.py local / IonQ simulator selection
```

## Disclosures

- **Built during the hackathon window** (Oct 9 19:00 ET – Oct 11 19:00 ET).
- **Pre-existing code:** none. _(Update if any is used; list the source and what we added.)_
- **AI tools:** _TBD: list any used and for what._

## Team

_TBD_

## License

[MIT](LICENSE)
