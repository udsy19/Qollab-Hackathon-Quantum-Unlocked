#!/usr/bin/env bash
# Sabotage round for the integration-shell runner check (gate-independence laws 2, 10, 15).
# Each case breaks ONE thing in a disposable copy of the ASSEMBLED tree (never the tree itself),
# serves it on its own port, and runs check.cjs. A case passes when the check
# goes red (exit 1) or refuses (exit 2) as listed; a check that stays green
# under sabotage is a null and is reported as one. Expected exits are a set: "12" means 1 or 2.
#   bash tools/qollab-runner/sabotage.sh <base-port> <out-dir> <assembled echo/ dir>
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
BASE="${1:?base port}"
OUT="${2:?out dir}"
PROJECT="${3:?assembled echo/ dir (tools/assemble-echo/assemble.mjs --out)}"
mkdir -p "$OUT"
summary="$OUT/sabotage-summary.txt"
: > "$summary"

run_case() { # name backend expected-exit sed-file sed-expr [extra check args]
  local name="$1" backend="$2" want="$3" file="$4" expr="$5"; shift 5
  local port=$((BASE++)) tmp
  tmp="$(mktemp -d)/echo"
  cp -R "$PROJECT" "$tmp"
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
  [[ "$want" == *"$got"* ]] || verdict="NULL (expected exit $want)"
  echo "CASE $name backend=$backend exit=$got -> $verdict" | tee -a "$summary"
  grep -E '^(FAIL|NO VERDICT|ABORT)' "$OUT/$name-check.log" | sed 's/^/    /' | tee -a "$summary"
}

# Positive control: the untouched copy must be green on both backends.
run_case control-builtin builtin 0 "" ""
run_case control-ionq-mock ionq-mock 0 "" ""
# 1. No UI root: story-ui has nowhere to mount.
run_case no-echo-ui builtin 12 index.html 's/<div id="echo-ui"><\/div>//'
# 2. A quest state redefined locally in main.js, with a drifted value.
run_case local-quest-state-drifted builtin 12 main.js "s/^import { QUEST_STATES, QUEST_EVENTS,/const QUEST_STATES = { TITLE: 'TITLE_SCREEN' }; import { QUEST_EVENTS,/"
# 2b. The same redefinition with the RIGHT value: behaviour cannot see it (expected null here;
#     tools/assemble-echo/retyped-names.mjs is the gate for this one).
run_case local-quest-state-same builtin 0 main.js "s/^import { QUEST_STATES, QUEST_EVENTS,/const QUEST_STATES = { TITLE: 'TITLE' }; import { QUEST_EVENTS,/"
# 3. toJs() without dict_converter. Pyodide v314.0.7 already returns plain objects (measured), so this
#    is an expected null: the converter only pins the behaviour against a Pyodide change.
run_case no-dict-converter builtin 0 main.js 's/proxy.toJs({ dict_converter: Object.fromEntries })/proxy.toJs()/'
# 3b. What an older Pyodide default would hand over (a Map): the contract validator must catch it.
run_case dict-as-map builtin 1 main.js 's/proxy.toJs({ dict_converter: Object.fromEntries })/new Map(Object.entries(proxy.toJs()))/'
# 4. Remove the page's one-job guard: the IonQ mock must refuse job #2, and the built-in
#    backend's runner counter must still see it.
run_case no-guard-ionq-mock ionq-mock 1 main.js 's/if (backendJobUsed) {/if (false) {/'
run_case no-guard-builtin builtin 1 main.js 's/if (backendJobUsed) {/if (false) {/'
# 5. Scene never drawn.
run_case no-render builtin 12 main.js 's/renderer.render(scene, camera);/\/\/ no render/'
# 6. Quality not routed to the renderer.
run_case quality-unrouted builtin 1 main.js "s/if (key === null || key === 'quality') world.setQuality(s.quality);//"
# 7. Restart not wired.
run_case restart-unwired builtin 12 main.js 's/onRestart: () => machine.resetGame(),//'
# 8. Provenance: the served build is not the one we claim to be testing.
run_case wrong-build builtin 2 "" "" --expect-build not-the-served-build
echo "summary: $summary"
