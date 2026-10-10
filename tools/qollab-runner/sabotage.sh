#!/usr/bin/env bash
# Sabotage round for the G0 smoke check (gate-independence laws 2, 10, 15).
# Each case breaks one thing in a disposable copy of echo/ (never echo/ itself),
# serves it on its own port, and runs check.cjs and the static caps check. A case
# passes when check.cjs goes red (exit 1) or refuses (exit 2) as listed; a check
# that stays green under sabotage is a null and is reported as one.
#   bash tools/qollab-runner/sabotage.sh <base-port> <out-dir>
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
BASE="${1:?base port}"
OUT="${2:?out dir}"
mkdir -p "$OUT"
summary="$OUT/sabotage-summary.txt"
: > "$summary"

# run_case <name> <backend> <scenario> <expected-exit> [<file> <sed-expr>]... [-- <extra check args>]
run_case() {
  local name="$1" backend="$2" scenario="$3" want="$4"; shift 4
  local port="$BASE" tmp # one port, reused: each case stops its server first
  tmp="$(mktemp -d)/echo"
  cp -R "$REPO/echo" "$tmp"
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
  node "$HERE/server.mjs" --port "$port" --project "$tmp" > "$OUT/$name-server.log" 2>&1 &
  local pid=$!
  sleep 2
  node "$HERE/check.cjs" --port "$port" --backend "$backend" --scenario "$scenario" --out "$OUT" --tag "sabotage-$name" "$@" > "$OUT/$name-check.log" 2>&1
  local got=$?
  kill "$pid" 2>/dev/null; wait "$pid" 2>/dev/null
  local verdict="AS EXPECTED"; [ "$want" = 0 ] || verdict="CAUGHT"
  [ "$got" = "$want" ] || verdict="NULL (expected exit $want)"
  echo "CASE $name backend=$backend scenario=$scenario check-exit=$got caps-exit=$caps -> $verdict" | tee -a "$summary"
  grep -E '^(FAIL|NO VERDICT|ABORT)' "$OUT/$name-check.log" | sed 's/^/    /' | tee -a "$summary"
  grep -E 'backend-run-count' "$OUT/$name-caps.log" | sed 's/^/    caps: /' | tee -a "$summary"
}

# Positive controls: the untouched copy must be green on both backends, every scenario.
for b in builtin ionq-mock; do
  for s in auto cancel button; do run_case "control-$b-$s" "$b" "$s" 0; done
done
# 1. Remove the one-job guard. The auto-send fires, then the check presses Verify:
#    the IonQ mock refuses job 2, and on the built-in backend the runner counts 2.
run_case no-guard-ionq-mock ionq-mock auto 1 main.js 's/if (backendJobUsed) {/if (false) {/'
run_case no-guard-builtin builtin auto 1 main.js 's/if (backendJobUsed) {/if (false) {/'
# 1b. Guard removed AND the button no longer stops the countdown: the button
#     press and the countdown both send.
run_case no-guard-no-stop-button builtin button 1 main.js 's/if (backendJobUsed) {/if (false) {/' main.js 's/^  stopAutoSend(trigger/  if (0) stopAutoSend(trigger/'
# 2. The countdown calls backend.run directly, bypassing verifyOnBackend.
run_case countdown-direct-run builtin auto 1 main.js "s/    verifyOnBackend('auto');/    smoke.bell_measure_circuit.callPromising().then((c) => backend.run(c, { shots: 256 }));/"
# 3. Counters in the bubble phase, and the page swallows pointer events on the scene.
run_case bubble-stoppropagation builtin auto 1 diag.js 's/const CAPTURE = { capture: true };/const CAPTURE = { capture: false };/' main.js "s/^startScene(\$('scene'));/startScene(\$('scene')); for (const t of ['pointerdown', 'click', 'keydown']) \$('scene-wrap').addEventListener(t, (e) => e.stopPropagation());/"
# 3b. Bubble phase alone, with no page handler stopping anything.
run_case bubble-only builtin auto 0 diag.js 's/const CAPTURE = { capture: true };/const CAPTURE = { capture: false };/'
# 4. main.js returns right after the bridge (no keep-alive): on IonQ the auto-send
#    then goes out after Done., when Qollab's proxy rewrite is off.
run_case no-keepalive-ionq-mock ionq-mock auto 1 main.js 's/^await oneJobDone;/\/\/ no keep-alive/'
# 5. Wrong physics in Python: H replaced by X, so the state is |11>, not a Bell pair.
run_case wrong-bridge builtin auto 1 quantum/smoke.py 's/qc.h(0)/qc.x(0)/'
# 5b. Wrong physics only in the circuit sent to the backend (bridge stays right).
run_case wrong-backend-circuit builtin auto 1 quantum/smoke.py 's/    qc.measure(\[0, 1\], \[0, 1\])/    qc.x(1); qc.measure([0, 1], [0, 1])/'
# 6. Scene never drawn.
run_case no-render builtin auto 1 main.js 's/renderer.render(scene, camera);/\/\/ no render/'
# 7. Diagnostic never mounted.
run_case no-diag builtin auto 1 main.js 's/^diag.mount(document.body);/\/\/ no diag/'
# 8. Provenance: the served build is not the one we claim to be testing.
run_case wrong-build builtin auto 2 -- --expect-build not-the-served-build
echo "summary: $summary"
