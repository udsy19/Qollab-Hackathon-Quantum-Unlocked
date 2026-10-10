#!/usr/bin/env bash
# Sabotage round for the integration-shell runner check (gate-independence laws 2, 10, 15).
# Each case breaks one thing in a disposable copy of the ASSEMBLED tree (never the tree itself),
# serves it, and runs check.cjs and the static caps check. A case passes when check.cjs goes red
# (exit 1) or refuses (exit 2) as listed; a check that stays green under sabotage is a null and is
# reported as one. Expected exits are a set: "12" means 1 or 2.
#   bash tools/qollab-runner/sabotage.sh <port> <out-dir> <assembled echo/ dir>
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
PORT="${1:?port}"
OUT="${2:?out dir}"
PROJECT="${3:?assembled echo/ dir (tools/assemble-echo/assemble.mjs --out)}"
mkdir -p "$OUT"
summary="$OUT/sabotage-summary.txt"
: > "$summary"

# run_case <name> <backend> <scenario> <expected-exits> [<file> <sed-expr>]... [-- <extra check args>]
run_case() {
  local name="$1" backend="$2" scenario="$3" want="$4"; shift 4
  local tmp # one port, reused: each case stops its server first
  tmp="$(mktemp -d)/echo"
  cp -R "$PROJECT" "$tmp"
  while [ $# -gt 0 ] && [ "$1" != "--" ]; do
    local file="$1" expr="$2"; shift 2
    cp "$tmp/$file" "$tmp/$file.orig"
    sed -i '' -e "$expr" "$tmp/$file"
    if cmp -s "$tmp/$file" "$tmp/$file.orig"; then
      echo "CASE $name: sabotage did not change $file — REFUSED" | tee -a "$summary"; return
    fi
    rm "$tmp/$file.orig"
  done
  [ "${1:-}" = "--" ] && shift
  node "$REPO/tools/qollab-caps/check.mjs" --root "$tmp" > "$OUT/$name-caps.log" 2>&1
  local caps=$?
  node "$HERE/server.mjs" --port "$PORT" --project "$tmp" > "$OUT/$name-server.log" 2>&1 &
  local pid=$!
  sleep 2
  node "$HERE/check.cjs" --port "$PORT" --backend "$backend" --scenario "$scenario" --out "$OUT" --tag "sabotage-$name" "$@" > "$OUT/$name-check.log" 2>&1
  local got=$?
  kill "$pid" 2>/dev/null; wait "$pid" 2>/dev/null
  local verdict="AS EXPECTED"; [ "$want" = 0 ] || verdict="CAUGHT"
  [[ "$want" == *"$got"* ]] || verdict="NULL (expected exit $want)"
  echo "CASE $name backend=$backend scenario=$scenario check-exit=$got caps-exit=$caps -> $verdict" | tee -a "$summary"
  grep -E '^(FAIL|NO VERDICT|ABORT)' "$OUT/$name-check.log" | sed 's/^/    /' | tee -a "$summary"
  grep -E 'backend-run-count|backend.run: ' "$OUT/$name-caps.log" | sed 's/^/    caps: /' | tee -a "$summary"
}

# Positive controls: the untouched copy must be green on both backends, every scenario.
for b in builtin ionq-mock; do
  for s in auto cancel button; do run_case "control-$b-$s" "$b" "$s" 0; done
done
# --- the one job --------------------------------------------------------------------------------
# 1. Guard removed. The auto-send fires, then the check presses Verify: the IonQ mock refuses job 2,
#    and on the built-in backend the runner counts 2.
run_case no-guard-ionq-mock ionq-mock auto 1 main.js 's/if (backendJobUsed) {/if (false) {/'
run_case no-guard-builtin builtin auto 1 main.js 's/if (backendJobUsed) {/if (false) {/'
# 1b. Guard removed AND the button no longer stops the countdown: button and countdown both send.
run_case no-guard-no-stop-button builtin button 1 main.js 's/if (backendJobUsed) {/if (false) {/' main.js 's/^  stopAutoSend(trigger/  if (0) stopAutoSend(trigger/'
# 2. The countdown calls backend.run directly, bypassing verifyOnBackend (a second call site).
run_case countdown-direct-run builtin auto 1 main.js "s/    verifyOnBackend('auto');/    qollabJob.build_backend_verification_circuit.callPromising().then((c) => backend.run(c, { shots: BACKEND_SHOTS }));/"
# 3. Keep-alive removed: main.js returns right after the bridge, so Done. comes before the job.
#    On IonQ the auto-send then goes out after Done., when Qollab's proxy rewrite is off.
run_case no-keepalive-builtin builtin auto 1 main.js 's/^await oneJobDone;/\/\/ no keep-alive/'
run_case no-keepalive-ionq-mock ionq-mock auto 1 main.js 's/^await oneJobDone;/\/\/ no keep-alive/'
# --- the input diagnostic -----------------------------------------------------------------------
# 4. Diagnostic never mounted.
run_case no-diag builtin auto 1 main.js 's/^diag.mount(document.body);/\/\/ no diag/'
# 5. The page swallows input with stopPropagation in the capture phase on document, registered
#    before the panel: the panel (same node) still counts, but no page handler runs (Start dead).
run_case document-stoppropagation builtin auto 1 main.js 's/^diag.mount(document.body);/for (const t of ["pointerdown", "click", "keydown"]) document.addEventListener(t, (e) => e.stopPropagation(), true); diag.mount(document.body);/'
# 5b. The same on window: input never reaches document, so the panel's counters stay at 0.
run_case window-stoppropagation builtin auto 1 main.js 's/^diag.mount(document.body);/for (const t of ["pointerdown", "click", "keydown"]) window.addEventListener(t, (e) => e.stopPropagation(), true); diag.mount(document.body);/'
# 5c. Counters in the bubble phase with nothing stopping propagation: expected null (declared).
run_case bubble-only builtin auto 0 diag.js 's/const CAPTURE = { capture: true };/const CAPTURE = { capture: false };/'
# --- the shell ----------------------------------------------------------------------------------
# 6. No UI root: story-ui has nowhere to mount.
run_case no-echo-ui builtin auto 12 index.html 's/<div id="echo-ui"><\/div>//'
# 7. A quest state redefined locally in main.js, with a drifted value.
run_case local-quest-state-drifted builtin auto 12 main.js "s/^import { QUEST_STATES, QUEST_EVENTS,/const QUEST_STATES = { TITLE: 'TITLE_SCREEN' }; import { QUEST_EVENTS,/"
# 7b. The same redefinition with the RIGHT value: behaviour cannot see it (expected null here;
#     tools/assemble-echo/retyped-names.mjs is the gate for this one).
run_case local-quest-state-same builtin auto 0 main.js "s/^import { QUEST_STATES, QUEST_EVENTS,/const QUEST_STATES = { TITLE: 'TITLE' }; import { QUEST_EVENTS,/"
# 8. toJs() without dict_converter: expected null on Pyodide v314.0.7 (plain objects already).
run_case no-dict-converter builtin auto 0 main.js 's/proxy.toJs({ dict_converter: Object.fromEntries })/proxy.toJs()/'
# 8b. What an older Pyodide default would hand over (a Map): the contract validator must catch it.
run_case dict-as-map builtin auto 12 main.js 's/proxy.toJs({ dict_converter: Object.fromEntries })/new Map(Object.entries(proxy.toJs()))/'
# 9. Scene never drawn.
run_case no-render builtin auto 12 main.js 's/renderer.render(scene, camera);/\/\/ no render/'
# 10. Quality not routed to the renderer.
run_case quality-unrouted builtin auto 1 main.js "s/if (key === null || key === 'quality') world.setQuality(s.quality);//"
# 11. Restart not wired.
run_case restart-unwired builtin auto 12 main.js 's/onRestart: () => machine.resetGame(),//'
# 12. Provenance: the served build is not the one we claim to be testing.
run_case wrong-build builtin auto 2 -- --expect-build not-the-served-build
echo "summary: $summary"
