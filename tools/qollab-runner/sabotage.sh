#!/usr/bin/env bash
# Sabotage round for the G0 smoke check (gate-independence laws 2, 10, 15).
# Each case breaks ONE thing in a disposable copy of echo/ (never echo/ itself),
# serves it on its own port, and runs check.cjs. A case passes when the check
# goes red (exit 1) or refuses (exit 2) as listed; a check that stays green
# under sabotage is a null and is reported as one.
#   bash tools/qollab-runner/sabotage.sh <base-port> <out-dir>
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
BASE="${1:?base port}"
OUT="${2:?out dir}"
mkdir -p "$OUT"
summary="$OUT/sabotage-summary.txt"
: > "$summary"

run_case() { # name backend expected-exit sed-file sed-expr [extra check args]
  local name="$1" backend="$2" want="$3" file="$4" expr="$5"; shift 5
  local port=$((BASE++)) tmp
  tmp="$(mktemp -d)/echo"
  cp -R "$REPO/echo" "$tmp"
  if [ -n "$file" ]; then
    cp "$tmp/$file" "$tmp/$file.orig"
    sed -i '' -e "$expr" "$tmp/$file"
    if cmp -s "$tmp/$file" "$tmp/$file.orig"; then
      echo "CASE $name: sabotage did not change $file — REFUSED" | tee -a "$summary"; rm "$tmp/$file.orig"; return
    fi
    rm "$tmp/$file.orig"
  fi
  node "$HERE/server.mjs" --port "$port" --project "$tmp" > "$OUT/$name-server.log" 2>&1 &
  local pid=$!
  sleep 2
  node "$HERE/check.cjs" --port "$port" --backend "$backend" --out "$OUT" --tag "sabotage-$name" "$@" > "$OUT/$name-check.log" 2>&1
  local got=$?
  kill "$pid" 2>/dev/null; wait "$pid" 2>/dev/null
  local verdict="AS EXPECTED"; [ "$want" = 0 ] || verdict="CAUGHT"
  [ "$got" = "$want" ] || verdict="NULL (expected exit $want)"
  echo "CASE $name backend=$backend exit=$got -> $verdict" | tee -a "$summary"
  grep -E '^(FAIL|NO VERDICT|ABORT)' "$OUT/$name-check.log" | sed 's/^/    /' | tee -a "$summary"
}

# Positive control: the untouched copy must be green on both backends.
run_case control-builtin builtin 0 "" ""
run_case control-ionq-mock ionq-mock 0 "" ""
# 1. Remove the page's one-job guard: the runner's IonQ mock must refuse job #2.
run_case no-guard-ionq-mock ionq-mock 1 main.js 's/if (backendJobUsed) {/if (false) {/'
# 2. Same sabotage on the built-in backend (which allows many jobs): the check's
#    own runner counter must still catch the second job.
run_case no-guard-builtin builtin 1 main.js 's/if (backendJobUsed) {/if (false) {/'
# 3. Wrong physics in Python: H replaced by X, so the state is |11>, not a Bell pair.
run_case wrong-bridge builtin 1 quantum/smoke.py 's/qc.h(0)/qc.x(0)/'
# 3b. Wrong physics only in the circuit sent to the backend (bridge stays right).
run_case wrong-backend-circuit builtin 1 quantum/smoke.py 's/    qc.measure(\[0, 1\], \[0, 1\])/    qc.x(1); qc.measure([0, 1], [0, 1])/'
# 4. Scene never drawn.
run_case no-render builtin 1 main.js 's/renderer.render(scene, camera);/\/\/ no render/'
# 5. Provenance: the served build is not the one we claim to be testing.
run_case wrong-build builtin 2 "" "" --expect-build not-the-served-build
echo "summary: $summary"
