# Declassified gate: sabotage round

Run: `node evidence/story-ui/declassified/sabotage.mjs` on 2026-10-10T04:48:23.014Z. Each row is a disposable copy; the worktree was never mutated.

| mutation | expected | verdict | first failing checks |
|---|---|---|---|
| baseline (no mutation) | green | green |  |
| kets left ASCII | red | RED | FAIL  journal: no ASCII ket on screen<br>FAIL  tab THE COPY: every data line shown whole, kets as \|x⟩<br>FAIL  tab THE COPY: no ASCII ket on screen |
| missing number defaults to 0.5 | red | RED | FAIL  sparse: no NaN / undefined / null / default 0.5 on screen |
| engine label dropped from groups | red | RED | FAIL  journal: each group shows its engine label text |
| correction rule swapped (X↔Z) | red | RED | FAIL  journal: dry-run rule line reads Z only for m0=1, m1=0 (both dry runs)<br>FAIL  branches: rule lines for 00, 01, 10, 11 read no correction / X / Z / X then Z |
| invalid result shown anyway | red | RED | FAIL  sparse: invalid result shown as not recorded (contract check), engine not invented |
| every choice shows the right why | red | RED | FAIL  teach-back: "Quantum states cannot be stored at all." shows its why<br>FAIL  teach-back: "The booth needed more power." shows its why<br>FAIL  teach-back: "The entangled pair was too old and had d" shows its why |
| a score is shown | red | RED | FAIL  teach-back: no score shown |
| credits team line misspelt in data | red | RED | FAIL  credits: owner-ruled team line, verbatim |
| focus trap removed | red | RED | FAIL  focus: trapped and visible over 48 Tab/Shift+Tab presses |
| Esc: no setPauseAllowed AND no stopPropagation | red | RED | FAIL  esc: pause did not open while Declassified owned Esc<br>FAIL  esc: Declassified closed and focus returned to the opener<br>FAIL  esc: after close, Esc opens pause again (pause re-allowed) |
| Esc: setPauseAllowed(false) removed only | null expected (stopPropagation still guards) | green |  |
| reduced-motion rule deleted | red | RED | FAIL  reduced motion: every transition is 0s and no animation runs |
| panel cannot scroll (overflow hidden) | red | RED | FAIL  journal: panel takes focus and End scrolls it to the bottom<br>FAIL  200% 1280×720 tab JOURNAL: no clipping (font 32px)<br>FAIL  200% 1280×720 tab THE COPY: no clipping (font 32px) |
| frame wider than the viewport (min-width 70em) | red | RED | FAIL  200% 1280×720 tab JOURNAL: no clipping (font 32px)<br>FAIL  200% 1280×720 tab THE COPY: no clipping (font 32px)<br>FAIL  200% 1280×720 tab THE CONNECTION: no clipping (font 32px) |
| tab focus ring removed | red | RED | FAIL  open: focus moved into the dialog with a visible ring<br>FAIL  tab THE COPY: ArrowRight focuses and selects it, ring visible<br>FAIL  tab THE CONNECTION: ArrowRight focuses and selects it, ring visible |
| readings back in monospace (⟩ drawn like ")") | null expected (glyph shape; human read) | green |  |
| probability keys unsorted (11 before 00) | null expected (order not gated) | green |  |
