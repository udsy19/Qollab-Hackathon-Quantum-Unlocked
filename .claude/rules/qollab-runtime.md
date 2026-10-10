# The Qollab runtime is the target

The submission is the `echo/` folder, uploaded to Qollab as-is (owner ruling 2026-10-09). Everything in it obeys `QOLLAB_DEPLOYMENT.md`:

- `echo/index.html` is a body fragment; `echo/main.js` is the entry; `echo/main.css` auto-loads. No bundler, npm, or Node APIs inside `echo/`.
- At most 100 files in `echo/`, each at most 2 MB. Nothing outside `echo/` may be required at runtime.
- No localStorage/sessionStorage/IndexedDB/cookies, no POST/PUT/DELETE, no WebSocket, no workers.
- Use the injected `backend`; never hardcode a backend or a key. **At most one `backend.run` per run.** All puzzle feedback comes from local Qiskit (`Statevector`, `DensityMatrix`, `partial_trace`, `state_fidelity`) via the Python bridge.
- Only the owner can run, select the IonQ simulator on, or publish to Qollab. Never write that something ran on Qollab, ran on IonQ, or is published unless the owner confirmed it in `owner-answers.md`. A local Qollab-like runner result is reported as "local runner", never as Qollab.
