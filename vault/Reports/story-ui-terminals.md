---
type: report
status: current
date: 2026-10-10
updated: 2026-10-10
owner: story-ui / terminals
---

# story-ui terminals: what was measured building the three in-world terminals

`echo/ui/terminal.js` and the `/* ==== terminal ==== */` section of `echo/main.css` drive the replication booth, the relay, the legacy-link junctions and the transmission console, by keyboard or mouse. Branch `lane/story-ui/terminals-c4`.

- **Gate:** `node evidence/story-ui/harness/drive-terminals.mjs 8761 evidence/story-ui/terminals` → 97/97, exit 0. It was red on a skeleton first.
- **Copy gate:** `copy-check.mjs` → exit 0.
- **Sabotage:** 12 sabotages, 11 red, 1 explained null.
- **Evidence:** `evidence/story-ui/terminals/README.md`. These are local harness results, not Qollab.

Findings the next worker needs:

- **Platform's validator refuses `documented_preview` for `bell_signalling`.** Owner ruling: the receiver panel is EXACT only. A preview stub cannot drive the relay. The harness replays the quantum lane's real `bell_signalling` output, recorded by `evidence/story-ui/harness/record-relay.sh` from `lane/quantum/integration@d9b42d0`. The terminal showed RESULT REFUSED on the first attempt, which is the intended behaviour.
- **§8.4's `teleportDryRun(stateId, x, z)` cannot show the bits first.** The ruled flow is bits first, then corrections, and that needs a separate measurement call. The terminal calls `bellMeasurement()` → `{measurementBits, parameters.state}`, then `teleportDryRun(stateId, x, z, {m0, m1})`, then `commitStoryTransfer()`. These map onto quantum's `bell_measurement`, `teleport_branch` and `live_commit`, but `echo/quantum/bridge.js` has not landed. This is a contract request.
- **A correct 00 dry run proves nothing about the rule**, because no correction is needed. It must not unlock COMMIT. The gate's check went red under that sabotage. Copy: `FAILURES.teleportation.trivial_pass`.
- **Acknowledgement timing needs its own measurement.** An event-order check alone missed "ack before paint" (null in the first sabotage round). The harness now records, at each emit, whether a result panel is on screen.
- **A hang hides its cause.** A render that throws leaves `aria-busy` stuck, and the driver times out. The drive now reports page errors on the abort path too (law 7).
- **Esc must be handled in the capture phase on `window`.** `ui/menu.js` listens on `document` and opens pause on any Esc that is not `defaultPrevented`. Not yet tested with the menu mounted.
- **Measured nulls:**
  - The generic busy guard in `call()` is not load-bearing for COMMIT or VERIFY, which have their own guards.
  - A double-click on DUPLICATE, SEND or EXECUTE is untested.
