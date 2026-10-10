---
type: report
status: current
date: 2026-10-10
updated: 2026-10-10
owner: story-ui / declassified
---

# Declassified mode: run journal, three tabs, no-score teach-back and credits, measured by keyboard

`echo/ui/declassified.js` is built on branch `lane/story-ui/declassified`, and its gate passes.
`node evidence/story-ui/declassified/drive.mjs` → 61/61, exit 0, provenance `e6fa20da62c9`.
The sabotage round (`sabotage.mjs`) ran 17 mutations on disposable copies: 14 red, 3 nulls, all 3 predicted.
Evidence: `evidence/story-ui/declassified/README.md`.

What was measured, and what it teaches the next worker:
- **System monospace fonts draw the ket bracket ⟩ (U+27E9) almost like ")".** In the first render, `|0⟩` looked like `|0)` in every `--echo-mono` cell, though the bytes were right. Anything that can hold a ket now uses the proportional font with `tabular-nums`. The gate cannot see this (sabotage null): it is a glyph shape, so a human must read the PNG.
- **Integer-like object keys reorder.** `{ '00': .5, '11': .5 }` iterates "11" first, because "11" is a canonical integer and "00" is not. Sort bitstring keys before display. This order is not gated (null).
- **`innerText` applies `text-transform`.** A heading matched against the data's lowercase wording fails on the uppercased screen text. Compare case-insensitively.
- **Chrome animates keyboard scrolling.** A `scrollTop > 0` read 150 ms after End was flaky under load (2 stray reds in one round). Poll with `waitForFunction`.
- **accesslint 0.21.0 caches between `runAudit` calls, and names a dialog from its content.** Call `clearAllCaches()` before every audit. `aria-dialog-name` never fires on a dialog that has text in it (probe: an unnamed `role=dialog` with an h2 got the name "Xok"). A nameless-dialog control therefore proves nothing; a planted unnamed button inside the dialog does.
- **A flex child's `width` mutation is absorbed by `flex-shrink`.** The "wider frame" sabotage produced no defect until it used `min-width`. Check that a mutation really breaks the product before you call its green a gate miss.
- **Esc has two guards.** `setPauseAllowed(false)` and a capture-phase `stopPropagation`. Removing only the first stays green, which is the null this note records. Removing both goes red.
- **Lane clash:** another story-ui worker (`terminals-c4`) used port 8771 for its sabotage harness while this gate needed it.
