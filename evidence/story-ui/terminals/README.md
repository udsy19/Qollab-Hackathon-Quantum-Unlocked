# story-ui terminals: evidence

Version token **`terminals r1`**. Each screenshot's badge shows `sha256` over the served bytes of `echo/main.css`, `echo/ui/terminal.js`, `echo/data/objectives.js`, `echo/contracts.js` and `relay-fixtures.json`, in that order. These shots carry `61ad717702a8`. Branch `lane/story-ui/terminals-c4`.

This is a **local harness** (`evidence/story-ui/harness/terminals.html`), not Qollab and not the game. The engine is a stub (`stub-engine.js`) that returns `documented_preview` results with textbook-exact values and no counts. The one exception is the relay, explained below.

## Reproduce

```bash
python3 evidence/story-ui/harness/serve.py 8761 &          # serves echo/contracts.js from lane/platform/integration (not on this base)
node evidence/story-ui/harness/drive-terminals.mjs 8761 evidence/story-ui/terminals   # 100 checks, exit 0
node evidence/story-ui/harness/copy-check.mjs                                          # 2 checks, exit 0
python3 evidence/story-ui/harness/sabotage-terminals.py                                # the sabotage table, 03-sabotage.md
bash evidence/story-ui/harness/record-relay.sh                                         # re-record the relay's real Qiskit output
```

## Files

| file | what |
|---|---|
| `00-red-on-skeleton.txt` | the drive gate, written first, red (exit 1) on a skeleton `terminal.js` |
| `01-green.txt` | 100/100 green, real key presses and mouse clicks through CDP, with the real pause menu (`ui/menu.js`) mounted and started |
| `02-copy-check.txt` | copy gate green: no prose literal in `terminal.js`; every one of the rendered on-screen texts traces to `echo/data` or to notation |
| `03-sabotage.md` | 13 sabotages on disposable copies: all 13 red. Copy-check is exit 2 (refused, too few leaves) where the drive aborted (S12, S13) |
| `04-teleport-keyboard-sequence.txt` | the keyboard-only key sequence for the whole teleport run, all four bit pairs × right/wrong, then the commit |
| `drive-result.json` | every check, every key, page errors, rendered leaf texts |

## Screenshots

| shot | shows |
|---|---|
| 01–08 | booth: open, CALIBRATING, \|0⟩ and \|1⟩ matched, \|+⟩ → `TWO INDEPENDENT COPIES: NO` with its reason, WHY (purity 0.500000 per output, from the engine), INCREASE VOLTAGE explained, REROUTE + learning text |
| 10–12 | relay: open; receiver-only **EXACT** P(0) = P(1) = 0.5 for I, X and Z; compared paired data (Z gate: Z-basis agree 1, X-basis agree 0) |
| 20–23 | console: open with COMMIT locked; bits 00; each of the four m0/m1 pairs with the right and a wrong correction; ESC mid-flow, then reopen with the failed result intact |
| 24–27 | commit error with STATE PRESENT kept and RETRY offered; commit in flight; success (MEASURED / CONSUMED, STATE RECOVERED, fresh live bits); a second attempt refused with no engine call |
| 30–32 | engine rejected (module error + RETRY); malformed result refused with the validator's reason; CALIBRATING while pending |
| 40–42 | legacy-link junctions: wrong order explained, repaired; HINT |
| 50–51 | the console at 200% text, VERIFY reachable by Tab |

Fidelities in this run were measured by the drive, which recomputes the closed form from the stub's Bloch vector independently of the terminal:

| m0 m1 | right correction | fidelity | wrong correction | fidelity |
|---|---|---|---|---|
| 0 0 | none | 1.000000 | X | 0.338234 |
| 0 1 | X | 1.000000 | none | 0.180232 |
| 1 0 | Z | 1.000000 | none | 0.461534 |
| 1 1 | X + Z | 1.000000 | Z only | 0.177526 |

Each dry run uses a fresh random generic state, so the numbers change from run to run. A correct 00 run does **not** unlock COMMIT (`FAILURES.teleportation.trivial_pass`); the 01 run does.

## Why the relay is not a preview

Platform's `validateExperimentResult` refuses `documented_preview` for `bell_signalling`, implementing the owner's ruling that the receiver panel shows EXACT probabilities only. The terminal correctly showed RESULT REFUSED when the stub tried. The harness therefore replays the quantum lane's **real** `bell_signalling` output, recorded by `record-relay.sh` from `lane/quantum/integration@d9b42d0` (Qiskit Statevector + partial_trace, run with the project venv). Those results are honestly `exact_qiskit_local`.

## accesslint `audit_live` (local harness, ports 8762/8763)

- Scoped to `.echo-terminal`: **no violations** for copy_booth, relay_core, teleport_terminal and classical_socket, both on open and, via `?auto=1`, on their result screens. I confirmed separately that `auto` reaches each result panel.
- The unscoped page has 3 moderate violations, all from harness chrome: no `<h1>`, and the event log and badge sit outside a landmark.
- Positive control: on a disposable copy with the CLOSE label emptied, the audit reports **critical `button-name`**.
- Scope: these rules only. This is not a WCAG 2.2 AA claim.

## Nulls and limits

- **First-round nulls, now closed:**
  - S1 (busy guard in `call()`) was green until the drive triple-activated DUPLICATE.
  - S11 (ack before paint) was green until the harness recorded, at each emit, whether the result panel was on screen.
- SEND and EXECUTE are not double-activated by the drive. They share `call()`'s guard, which S1 proves load-bearing via DUPLICATE.
- **S6** went red through a page TypeError reported at abort. It is not caught by the direct "in flight: STATE PRESENT" assertion, because the sabotaged render crashes before reaching it.
- The double-click probes use `element.click()` from page script, not CDP mouse events. Enter presses are real CDP key events.
- 1280×720 only. 200% text was checked on the console only. Not checked inside the game, with the pause menu mounted, or on Qollab.
