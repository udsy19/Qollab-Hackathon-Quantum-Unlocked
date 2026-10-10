# gameplay-quest-review — adversarial review of the quest core (lane/gameplay/integration @ d5ec620)

Throw-away attack scripts, kept so the supervisor can re-run every repro. They only READ the code under
test. Run them from THIS directory against a disposable worktree:

    git worktree add --detach /tmp/qr-integ lane/gameplay/integration
    PY=/Users/udsy/PycharmProjects/Qollab-Hackathon-Quantum-Unlocked/.venv/bin/python
    $PY a1_table.py /tmp/qr-integ     # vision §9.1/§9.2 parsed by a separate Python parser vs TRANSITIONS
    $PY a2_physics.py /tmp/qr-integ   # every fake number recomputed with Qiskit Statevector/partial_trace/state_fidelity
    node a3_robust.mjs /tmp/qr-integ  # re-entrancy, reset-in-handler, throwing listener, stale result (ABA), malformed results, 1000-run fuzz
    node a4_token.mjs /tmp/qr-integ   # story token reusable below the FSM; one-shot calibration; misleading fidelity 1
    ./a5_spec_indent.sh /tmp/qr-integ # spec.mjs silently drops an oddly indented §9.2 row

`out-*.txt` are the outputs measured at d5ec620. The report is
`lanes/gameplay/reports/0002-gameplay-quest-review.md`; the durable note is
`vault/Reports/quest-core-adversarial-review.md`.
