Track the ECHO: ONE OF ONE lanes on udsy's Mac (local) and keep them healthy. Org root /Users/udsy/agent-org.

Each tick:
1. **Read new events:** `lane-events.sh` (via the armed Monitor) or each lane's `lane.log` tail. Look at
   dispatches, finishes (rc, report present?), MERGE/LAND, ASK_OWNER, usage limits and WORKER AUTH FAILED.
2. **Check each finished worker.** Read its report, check the evidence (screenshots, commits), and confirm
   the report opens with a Vault check.
3. **New ASK_OWNER:** answer it from the standing rulings if they cover it. Otherwise tell the owner in one
   or two plain sentences, with images, and append the answer to the lane's `owner-answers.md` when it
   comes (its own `## <date> · <question>` section). Then update the lane's `rulings.md`: add the ruling,
   and replace any ruling it supersedes. Consults show `rulings.md` in full but only the newest 10 raw
   answers, so a ruling missing from `rulings.md` is eventually forgotten.
4. **Health:** load and CPU steal, orphan processes (parent PID 1, finished owner), workers timing out with
   no report (`REPORT OVERDUE`), `NO ACTIONABLE BLOCK` twice in a row (the supervisor's output format or
   login is broken), `KILLED` agents, a loop silent for over 2 h, git-sync DIVERGED or refused pushes,
   `.git` ownership, disk (`logs/gc.log`; `lanes.sh /Users/udsy/agent-org gc` by hand), worker and supervisor logins, and the deploy after any LAND. Fix what is safe; report the rest.
5. **Promote memory.** New LEARN entries in `lanes/*/lane-memory.md` that hold beyond the lane (tried and
   rejected, measured, decided) get one line each in `vault/Index.md`, written INSIDE the `INDEX:PROMOTED-BEGIN` …
   `INDEX:PROMOTED-END` markers (the rest of Index.md is generated and is overwritten on regeneration),
   linked to the evidence, appended (never rewrite an earlier line). Commit to main. Workers' vault notes on unmerged branches never reach main, so this is how that knowledge
   survives.
6. **WEEKLY (Mondays, or the first tick of a new week), compound the memory:**
   - Promote each LEARN entry in `lanes/*/lane-memory.md` that has held for a week (a rejected approach,
     a measured limit, a constraint) into that lane's `context.md` § "What has NOT worked" (one line,
     evidence path), and, if it holds beyond the lane, into the `vault/Index.md` PROMOTED block.
   - Demote entries older than ~90 days that no longer steer decisions: move them from `lane-memory.md`
     and `context.md` into `lanes/<lane>/lane-memory.archive-<YYYYMMDD>.md`, and leave one line linking the
     archive. Prune `rulings.md` of anything superseded.
   - Run `python3 /Users/udsy/agent-org/lane-metrics.py /Users/udsy/agent-org --days 7` and note the trend in the session note:
     merges per dispatch, missing reports, timeouts, NO ACTIONABLE BLOCK, dispatch→merge time.
7. **Show progress:** when something visible lands, publish it for the owner and notify.
8. **Handoff:** keep today's session note current.

Rules: goals not tests; vault first; never force-push; never touch other projects' processes; the owner's
interactive sessions are off-limits.

ECHO specifics:
- Deadline clock (ET): G1 Sat 04:00 · G2 Sat 17:00 (else one-room cut) · G3 Sun 05:00 · feature freeze Sun 14:00 · submit Sun 19:00. Lane logs are UTC.
- Owner 2026-10-10: "do not stop until you are done, get it done entirely … spin up as many agents as you need". All six lanes run (caps: platform 3, quantum 3, gameplay 3, story-ui 3, red-team 2, art 2). Scale by editing `lanes/<lane>/lane.json` max_parallel (read live; no restart). If the 15-min load average stays above ~22 on this 14-core Mac, lower the caps of non-critical lanes first (art, red-team).
- To get a relayed note acted on immediately: `touch /Users/udsy/agent-org/lanes/<lane>/NUDGE` (the loop re-consults when a slot is free; appending to owner-answers.md also triggers it, rate-limited to 10 min).
- Each tick: after any LAND on main, export `echo/` (git archive main echo), upload it into the Qollab draft https://qollab.xyz/u/udsy/echo-one-of-one (zip → Unpack → Keep and add), run on the Built-in simulator, save evidence to `evidence/qollab/`, and relay results to the lanes. Never publish without the owner's yes.
- AUTONOMOUS (owner 2026-10-10): decide design choices from the vision docs yourself and relay them as rulings; interrupt the owner only for spend, access, publishing, accepting terms, or credit names. Supervisors that still ASK_OWNER a design question get it answered by the overseer from the docs.
- Never claim a Qollab/IonQ run or a publish the owner has not confirmed.
- `lane-engine` (DSource-Editor) and `/Users/udsy/agent-org-qollab-hackathon` (archived org) are not ours: never touch them.
