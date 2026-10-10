# The Qollab runtime is the target

The submission is the `echo/` folder, uploaded to Qollab as-is (owner ruling 2026-10-09). Everything in it obeys `QOLLAB_DEPLOYMENT.md`:

- `echo/index.html` is a body fragment; `echo/main.js` is the entry; `echo/main.css` auto-loads. No bundler, npm, or Node APIs inside `echo/`.
- At most 100 files in `echo/`, each at most 2 MB. Nothing outside `echo/` may be required at runtime.
- No localStorage/sessionStorage/IndexedDB/cookies, no POST/PUT/DELETE, no WebSocket, no workers.
- Use the injected `backend`; never hardcode a backend or a key. **At most one `backend.run` per run.** All puzzle feedback comes from local Qiskit (`Statevector`, `DensityMatrix`, `partial_trace`, `state_fidelity`) via the Python bridge.
- **Who touches Qollab** (owner ruling 2026-10-10): only the overseer, through the owner's signed-in Chrome (Claude in Chrome). It may create/update ONE ECHO draft, run on the free local simulators, and run on an IonQ simulator only if Select QPU shows it as Free (one job per run). It never publishes; every publish is the owner's yes. Workers never drive Qollab: they ask the platform supervisor, which asks the overseer.
- A Qollab result counts only with the overseer's evidence (screenshot + console text) recorded in the lane's `owner-answers.md`. A local-runner result is reported as "local runner", never as Qollab. Never claim an IonQ run or a publish that has no such record.
