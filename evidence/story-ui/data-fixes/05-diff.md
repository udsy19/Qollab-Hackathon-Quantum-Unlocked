# Every changed line in echo/data, old (-) and new (+)

From `git diff -U0 842da9f -- echo/data` (842da9f = the consult-3 merge this branch started from).

```diff
diff --git a/echo/data/objectives.js b/echo/data/objectives.js
index 41a032e..0354641 100644
--- a/echo/data/objectives.js
+++ b/echo/data/objectives.js
@@ -128 +128 @@ export const HINTS = Object.freeze({
-      { kind: 'operation', text: 'Apply X if m1 = 1 and Z if m0 = 1. Set this for all four results.' },
+      { kind: 'operation', text: 'Apply X if m1 = 1 and Z if m0 = 1.' },
@@ -135 +135 @@ export const HINTS = Object.freeze({
-      { kind: 'resource', text: 'Your correction rule is proven. The token can be measured only once.' },
+      { kind: 'resource', text: 'Your corrections worked on a test state. The token can be measured only once.' },
@@ -157,5 +157,4 @@ export const FAILURES = Object.freeze({
-    missing_X: 'm1 = 1 but X was off. The receiver state is left bit-flipped.',
-    missing_Z: 'm0 = 1 but Z was off. The receiver state is left phase-flipped.',
-    extra_X: 'X was on but m1 = 0. That flip damaged a state that was already right.',
-    extra_Z: 'Z was on but m0 = 0. That phase flip damaged a state that was already right.',
-    no_corrections: 'No corrections set. Without the two bits the receiver cannot know which fix to apply.',
+    missing_X: 'm1 = 1 but X was off. The bit flip that m1 = 1 flags was never undone.',
+    missing_Z: 'm0 = 1 but Z was off. The phase flip that m0 = 1 flags was never undone.',
+    extra_X: 'X was on but m1 = 0. That X added a bit flip the bits never called for.',
+    extra_Z: 'Z was on but m0 = 0. That Z added a phase flip the bits never called for.',
@@ -163 +162 @@ export const FAILURES = Object.freeze({
-    commit_locked: 'Commit locked. Pass a dry run first: the token can be measured only once.',
+    commit_locked: 'Commit locked. First pass a dry run whose bits are not 00: the token can be measured only once.',
@@ -167,0 +167,13 @@ export const FAILURES = Object.freeze({
+// Which FAILURES.teleportation lines a dry run shows, keyed 'm0m1:XZ': the two measured bits, then
+// the receiver plan's X and Z switches (1 = on). A correct plan shows none. A plan with both
+// corrections wrong shows two lines, one per wrong switch. Each line is worded to be true whatever
+// the other bit and switch are: evidence/story-ui/data-fixes/branch-truth.md checks all 16 in Qiskit.
+// `blind_spot` is not listed: the terminal adds it when a listed failure still scores high
+// fidelity on that particular test state.
+export const TELEPORT_FAILURE_CASES = Object.freeze({
+  '00:00': [], '00:01': ['extra_Z'], '00:10': ['extra_X'], '00:11': ['extra_X', 'extra_Z'],
+  '01:00': ['missing_X'], '01:01': ['missing_X', 'extra_Z'], '01:10': [], '01:11': ['extra_Z'],
+  '10:00': ['missing_Z'], '10:01': [], '10:10': ['extra_X', 'missing_Z'], '10:11': ['extra_X'],
+  '11:00': ['missing_X', 'missing_Z'], '11:01': ['missing_X'], '11:10': ['missing_Z'], '11:11': [],
+})
+
@@ -173,0 +186,2 @@ export const HUD = Object.freeze({
+  // At 00:00 the display holds and the story continues: no game-over from the timer (§1 anti-goals).
+  countdownHeld: 'ISOLATION HELD // AWAITING CONFIRMATION',
@@ -198 +212 @@ export const HUD = Object.freeze({
-    relay_core: 'ENTANGLEMENT RELAY. BELL HALVES IN COLD STORAGE. PARTNERS: VAULT RECEIVER.',
+    relay_core: 'ENTANGLEMENT RELAY. BELL HALVES IN COLD STORAGE. PARTNERS: VAULT RECEIVER. TEST RIG ON SITE.',
@@ -242 +256 @@ export const TERMINALS = Object.freeze({
-    slotRemote: 'REMOTE BELL HALF',
+    slotRemote: 'RECEIVER BELL HALF',
@@ -244,2 +258,2 @@ export const TERMINALS = Object.freeze({
-    m0Label: 'm0  SOURCE READOUT',
-    m1Label: 'm1  LOCAL BELL-HALF READOUT',
+    m0Label: 'SOURCE READOUT m0',
+    m1Label: 'LOCAL BELL-HALF READOUT m1',
diff --git a/echo/data/story.js b/echo/data/story.js
index 7ccc9a2..77a03db 100644
--- a/echo/data/story.js
+++ b/echo/data/story.js
@@ -75 +75 @@ export const STORY = Object.freeze({
-    { speaker: 'VEGA', text: 'Relay maintenance core online. More room for me down here.', direction: 'power switch wakes the relay; VEGA projects at full size' },
+    { speaker: 'VEGA', text: 'Relay maintenance core online. Fully awake, at last.', direction: 'power switch wakes the relay; VEGA projects at full size' },
@@ -115 +115,2 @@ export const STORY = Object.freeze({
-    { speaker: 'VEGA', text: "Three slots: test source, your Bell half, and its partner at the vault." },
+    { speaker: 'VEGA', text: 'This console has a test rig. Both Bell halves stay here.' },
+    { speaker: 'VEGA', text: 'Only COMMIT spends a vault pair.' },
@@ -117 +118 @@ export const STORY = Object.freeze({
-    { speaker: 'VEGA', text: 'The amber line carries them. Tell the receiver what to do for each result.' },
+    { speaker: 'VEGA', text: 'The amber line carries them to the receiver. You choose its fix.' },
@@ -120,2 +121,2 @@ export const STORY = Object.freeze({
-    { speaker: 'VEGA', text: 'Receiver matches the test state. Your correction rule holds.' },
-    { speaker: 'VEGA', text: 'The live run will give its own bits. The rule carries over, not the bits.' },
+    { speaker: 'VEGA', text: 'Receiver matches the test state. Those corrections were right.' },
+    { speaker: 'VEGA', text: 'The live run gives its own bits. The receiver applies the same rule.' },
@@ -151 +152 @@ export const MOMENTS = Object.freeze({
-    { speaker: 'VEGA', text: 'Not yet. The token gets one try. Prove the rule on a test state first.' },
+    { speaker: 'VEGA', text: 'Not yet. The token gets one try. Prove a correction on a test state first.' },
@@ -156,0 +158,11 @@ export const MOMENTS = Object.freeze({
+  // A correct dry run on bits 00: no correction was needed, so COMMIT stays locked (owner ruling
+  // 2026-10-10: COMMIT unlocks after one correct dry run with bits other than 00).
+  teleport_dry_run_00: [
+    { speaker: 'VEGA', text: 'Right, but 00 needs no fix. That proves nothing yet.' },
+    { speaker: 'VEGA', text: 'Fresh test state. Run until the bits call for a fix.' },
+  ],
+  // The narrative countdown reaches 00:00: the display holds, nothing ends (§1 anti-goals, §9.3).
+  countdown_zero: [
+    { speaker: 'MIRROR', text: 'Grid isolation held. Manual confirmation pending.' },
+    { speaker: 'MICA', text: 'The clock hit zero. Backup is still holding. Hurry, Rin.' },
+  ],
diff --git a/echo/data/teachback.js b/echo/data/teachback.js
index 9f9b1d7..37e44c4 100644
--- a/echo/data/teachback.js
+++ b/echo/data/teachback.js
@@ -107 +107,2 @@ export const TEACHBACK = Object.freeze([
-// Team names have not been given by the owner (owner-answers 2026-10-09/10). Do not invent them.
+// Team line: owner-answers 2026-10-10 § credit names, wording fixed by the story-ui supervisor
+// (consult 4). No emails.
@@ -110 +111 @@ export const CREDITS = Object.freeze([
-  { role: 'team', text: 'TODO_OWNER: team and credit names (not yet given by the owner)' },
+  { role: 'team', text: 'Team The Quantubians (NYU Tandon School of Engineering): Udaya (captain), George, Harman, Epa' },
```
