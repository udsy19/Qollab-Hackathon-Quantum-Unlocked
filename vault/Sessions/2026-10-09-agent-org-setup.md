---
type: session
date: 2026-10-09
line: org/setup
model: claude-opus-5-5 (overseer)
outcome: in-progress
---

# 2026-10-09 — agent-org-setup

## Goal
Install the supervised agent organisation for ECHO: ONE OF ONE (Qollab × IonQ, Quantum Unlocked) so a swarm of lanes can build toward the G0 NOW item on [[Home]].

## Vault check
New vault; nothing prior. Owner's source of truth: `ECHO_MASTER_VISION.md`, `ROADMAP_48_HOURS.md`, `QOLLAB_DEPLOYMENT.md`, `CLAUDE_CODE_PROMPTS.md`, `CLAUDE.md` (copied from the owner's Downloads unchanged).

## The interview, verbatim
- Owner: "this is specific to trrack 3, i will give you the vision, and what to do, we are going to be despatching a swarm of agents to make this happen. 1. all local 2. all claude"
- Owner: "ask me if you have any questions going forward. do not assume anything. if you need anything, or if you're not sure of something, ask me"
- Approve org setup (6 lanes platform★/quantum/gameplay/story-ui/art/red-team, Claude opus-5-5 supervisors, opus default workers + sonnet, sub-agents on, 2 h budget, 30 min overdue, gates on the clock, `echo/` as the Qollab root, remove the Python scaffold): **"Yes, set it up (Recommended)"**
- Swarm size: **"~8 (Recommended)"** (platform 2, quantum 2, gameplay 2, story-ui 1, art 0→2 after G2, red-team 1)
- What has not worked: **"Nothing yet — fresh start"**
- Worker user: **"My user (udsy)"**
- GitHub push: **"main + lane branches"**
- Crontab: **"Yes, add it"**
- Vision docs: **"Repo root; CLAUDE (1).md → CLAUDE.md"**
- License holder: **"Keep \"udsy19 and contributors\""**
- Entry: **"Team"** (team name and members not yet given)

## What changed
- Branch `org/setup`: repo layer from the agent-org kit; owner rulings `.claude/rules/{ask-the-owner,qollab-runtime,lane-ownership,deadline-gates}.md`; the four vision docs added to `scripts/lib/protected-paths.mjs` (owner-only); Roadmap Track B G0–G5 and Plan rows 3–8; removed the superseded Python scaffold (`main.py`, `quantum_unlocked/`, `requirements.txt`, `SUBMISSION.md`).

## Verified
- `node scripts/gates/protected-paths.mjs` PASS; `node scripts/gates/plan-integrity.mjs` PASS (24 checks). Org board: see the commit.

## Decisions taken / proposed
- Taken with the owner's yes: everything above.
- Note: the declaration has one author list (`supervisor`, `owner`); the vision docs are owner-only by `.claude/rules/protected-paths.md` and `ask-the-owner.md`, and supervisors run without Edit/Write tools.

## Open questions for the owner
- Team name and member names for credits.
- Supervisor reasoning effort: the Claude backend in `supervise.py` passes no effort flag, so supervisors run at the CLI default.

## Next
- Start the six lanes and confirm each logs CONSULT 1 and dispatches.
