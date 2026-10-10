# Qollab smoke test of the integration shell: owner steps

This file is for the owner (or the overseer, in the owner's Chrome). It answers four questions on the real platform. Does the title screen render over the Three.js scene? Does the quest machine move TITLE → OPENING? Does a local Qiskit result reach the page? Does the project send exactly one job to the selected backend? So far the shell has run only on the **local runner** (`tools/qollab-runner/`), never on Qollab.

**Reference pictures (local runner, not Qollab):** `evidence/platform/shell/builtin-*.png` in the repo.

## What to upload

Upload the **assembled** tree, not the repo's `echo/` folder: each lane keeps its own files on its own branch. Build it with:

```
node tools/assemble-echo/assemble.mjs --out /tmp/echo-upload/echo
```

The assembler must exit 0, and `node tools/qollab-caps/check.mjs --root /tmp/echo-upload/echo` must also exit 0, before you upload. `index.html` and `main.js` must end up at the top level of the project. Qollab strips a single wrapping folder (see the upload-your-files doc).

## Steps (built-in simulator, the path judges use)

1. Use **Chrome, Edge, Brave or Opera**, or Firefox 153+. Not Safari, and not an iPhone or iPad.
2. Upload into the draft project, open **Run Project → Run**, pick **Built-in simulator (24q)**, and press **Run**.
3. **Expect** the ECHO / ONE OF ONE title over a dim room. In the lower right, a system box shows `build shell-…`, `backend basic_simulator`, `quest BOOT —BOOT_COMPLETE→ TITLE` and `quality med · pixel ratio …`. Within a few seconds the quantum line reads *Quantum module ready (exact local Qiskit). Copy test on |+>: overlap with two copies 0.500000, each output purity 0.500000.*
4. Press **Start**. The menu closes, a cyan pillar is visible, and the quest line reads `TITLE —START→ OPENING`.
5. Press **Esc → Settings**, set Quality to Low and then High. The render line follows: `pixel ratio 1 · shadows off`, then up to `1.75 · shadows on` (capped by the screen's own ratio).
6. Close the menu. Press **Verify on selected backend** once. Counts of about 128 `00` and 128 `11` appear. Press it again: *"Refused: this run has already used its one selected-backend job."* No second job appears in the console.
7. Press **Esc → Restart**. The title returns, and the quest line reads `OPENING → TITLE (reset)`.
8. Press **Stop**. Send a screenshot after step 6 and the console text.

## If something is different, what it means

| you see | it means |
|---|---|
| Blank page with a red console error mentioning `contracts.js` or `./game/` | Qollab resolves relative imports differently from the runner. Send the console text. |
| Quantum line says *Scientific module error* | The bridge call or a quantum module failed on Qollab. Send the text. |
| The second Verify press sends a job | The guard failed. Stop, and do not try IonQ. |
| No pillar after Start, but the UI works | WebGL is unavailable, or `three` failed to import. |
