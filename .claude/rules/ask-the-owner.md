# Decide from the docs; ask the owner only for what the docs cannot give

Owner ruling, 2026-10-10, verbatim: "keep going - do not keep stopping the progress, as of now, this is an autonomous loop, infer from the docs i gave you". (Supersedes the 2026-10-09 "ask, never assume" ruling for design and implementation choices.)

- A design or implementation choice the vision docs do not settle explicitly is **inferred from them** (`ECHO_MASTER_VISION.md`, `ROADMAP_48_HOURS.md`, `QOLLAB_DEPLOYMENT.md`, `CLAUDE_CODE_PROMPTS.md`, `CLAUDE.md`) by the supervisor, who records the decision and its doc citation in a `LEARN` block and in the worker's brief. Prefer the reading that best serves the vision's invariants (§0) and priority order. Do not raise `ASK_OWNER` for it.
- `ASK_OWNER` is only for what no doc can supply: spending money or credits, accounts and access, publishing, personal facts (team names for credits), or a real conflict between two owner documents.
- Never stall a lane waiting for an answer; build what is settled and use the best-cited default meanwhile.
- The vision docs are owner-only. A lane that thinks one is wrong records the inference it made instead; it never edits the doc.
