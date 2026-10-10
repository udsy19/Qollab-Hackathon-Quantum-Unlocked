#!/usr/bin/env bash
# Build a DISPOSABLE runnable copy: platform's local runner + platform's contracts.js + our
# echo/quantum (Python from a git ref, bridge.js from a file) + this harness as the entry.
# Nothing in the repo is modified. git archive is used instead of `git worktree add` so the shared
# .git gains no worktree entry to clean up.
#   assemble.sh <dest> <build-token> [--python-from REF] [--bridge FILE] [--sabotage NAME] [--fault]
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(git -C "$HERE" rev-parse --show-toplevel)
DEST=$1; TOKEN=$2; shift 2
PY_REF=HEAD; BRIDGE="$REPO/echo/quantum/bridge.js"; SAB=none; FAULT=false
RUNNER_REF=lane/platform/integration; CONTRACTS_REF=lane/platform/integration
while [ $# -gt 0 ]; do
  case $1 in
    --python-from) PY_REF=$2; shift 2;;
    --bridge) BRIDGE=$2; shift 2;;
    --sabotage) SAB=$2; shift 2;;
    --fault) FAULT=true; shift;;
    *) echo "unknown arg $1" >&2; exit 2;;
  esac
done
case "$DEST" in /tmp/*|/private/tmp/*|"${TMPDIR:-/nonexistent}"*) ;; *) echo "refusing: dest must be under /tmp or \$TMPDIR" >&2; exit 2;; esac
rm -rf "$DEST"; mkdir -p "$DEST/echo"
git -C "$REPO" archive "$RUNNER_REF" tools/qollab-runner | tar -x -C "$DEST"
git -C "$REPO" archive "$PY_REF" echo/quantum | tar -x -C "$DEST"
rm -f "$DEST/echo/quantum/bridge.js" "$DEST/echo/quantum/smoke.py"
[ -f "$BRIDGE" ] && cp "$BRIDGE" "$DEST/echo/quantum/bridge.js"
git -C "$REPO" show "$CONTRACTS_REF:echo/contracts.js" > "$DEST/echo/contracts.js"
cp "$HERE/project/index.html" "$HERE/project/main.css" "$HERE/project/pb_spy.py" "$DEST/echo/"
sed "s/__BUILD_TOKEN__/$TOKEN/" "$HERE/project/main.js" > "$DEST/echo/main.js"
# Reuse a cached copy of Qollab's Qiskit wheel if one exists (the runner otherwise GETs it once).
mkdir -p "$DEST/tools/qollab-runner/.cache"
W=qiskit-2.5.2-cp310-abi3-pyemscripten_2026_0_wasm32.whl
for c in "${PB_WHEEL_CACHE:-$HOME/.cache/echo-qiskit-wheel}/$W" /Users/udsy/agent-org/lanes/platform/wt/*/tools/qollab-runner/.cache/$W; do
  [ -f "$c" ] && { cp "$c" "$DEST/tools/qollab-runner/.cache/$W"; break; }
done
if [ "$FAULT" = true ]; then
  sed -i.bak 's/^FAULT = False /FAULT = True /' "$DEST/echo/pb_spy.py" && rm "$DEST/echo/pb_spy.py.bak"
  grep -q '^FAULT = True ' "$DEST/echo/pb_spy.py" || { echo "fault mode did not apply" >&2; exit 2; }
fi
[ "$SAB" = none ] || node "$HERE/sabotage.mjs" "$DEST/echo/quantum/bridge.js" "$SAB"
{
  echo "{"
  echo "  \"token\": \"$TOKEN\", \"sabotage\": \"$SAB\", \"fault\": $FAULT,"
  echo "  \"runnerRef\": \"$RUNNER_REF@$(git -C "$REPO" rev-parse --short "$RUNNER_REF")\","
  echo "  \"contractsRef\": \"$CONTRACTS_REF@$(git -C "$REPO" rev-parse --short "$CONTRACTS_REF")\","
  echo "  \"harnessCommit\": \"$(git -C "$REPO" rev-parse --short HEAD)$(git -C "$REPO" diff --quiet HEAD -- evidence/quantum/pyodide-bridge echo/quantum/bridge.js || echo -dirty)\","
  echo "  \"pythonRef\": \"$PY_REF@$(git -C "$REPO" rev-parse --short "$PY_REF")\","
  echo "  \"sha256\": {"
  (cd "$DEST/echo" && find . -type f | sort | while read -r f; do echo "    \"${f#./}\": \"$(shasum -a 256 "$f" | cut -c1-16)\","; done) | sed '$ s/,$//'
  echo "  }"
  echo "}"
} > "$DEST/ASSEMBLY.json"
echo "assembled $DEST (python $PY_REF, sabotage $SAB, token $TOKEN)"
