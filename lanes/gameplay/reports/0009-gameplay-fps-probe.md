## TL;DR
CHECKPOINT (not final), about 45 min in.
- **This machine's main display is a Sony TV mirrored at 30.00 Hz** (`/usr/sbin/system_profiler SPDisplaysDataType`), so headed Chrome is vsync-locked at 30 FPS. Every space reads exactly about 30 median at 1×. A headed vsync run cannot show headroom here.
- The probe now runs two modes:
  - `vsync`: what this screen shows, with dips below 30 visible.
  - `uncapped`: the same headed window with `--disable-gpu-vsync --disable-frame-rate-limit`, which measures capacity.
- Smoke numbers (1280×720, uncapped, 1×):
  - 175–360 FPS on average per space;
  - GPU 0.4–0.6 ms per frame (EXT_disjoint_timer_query);
  - 13–70 GL draws per frame and 12–14k triangles.
- Controls work:
  - the 40 ms busy-loop tab reads 22 FPS on average (red);
  - with the game's perf:fps forced to 999, the independent reading is unchanged;
  - the recorder's frame count matches the compositor's `DrawFrame` trace count (1157 vs 1158 in 5 s).
- Next: the full run, with 3 throttles × 2–3 resolutions × 2 modes, then the chart, table and vault note.

## Vault check
- Read: `vault/AGENTS.md` (delivered by the hook), `lanes/gameplay/context.md`, the FPS section of `lanes/gameplay/reports/0001-gameplay-world-controller.md`, and `vault/Index.md`. The Index had no prior FPS work beyond 0001.
- `where.mjs fps-probe` and `where.mjs setCPUThrottlingRate`: nothing found on main, on HEAD or on any of 53 unlanded branches.
- Reused: the input technique of `dev/gameplay/world-playthrough.mjs` (turnTo, walkTo, approach, tbtn), copied rather than modified.
