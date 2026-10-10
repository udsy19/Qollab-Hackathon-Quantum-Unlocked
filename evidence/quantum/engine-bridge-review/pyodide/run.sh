#!/usr/bin/env bash
# Assemble a disposable copy (runner @ lane/platform/integration, contracts @ main, echo/quantum @ PY_REF or HEAD),
# serve on PB_PORT (5230-5239), drive, compare with derive.py. Usage: PB_PORT=5231 run.sh [PY_REF]
set -uo pipefail
HERE=$(cd "$(dirname "$0")" && pwd); REPO=$(git -C "$HERE" rev-parse --show-toplevel); PORT=${PB_PORT:-5231}; REF=${1:-HEAD}
DEST=$(cd "$(mktemp -d /tmp/ebr-run-XXXXXX)" && pwd -P); TOKEN="ebr-$(date +%H%M%S)-$RANDOM"
mkdir -p "$DEST/echo"; git -C "$REPO" archive lane/platform/integration tools/qollab-runner | tar -x -C "$DEST"
git -C "$REPO" archive "$REF" echo/quantum | tar -x -C "$DEST"; git -C "$REPO" show main:echo/contracts.js > "$DEST/echo/contracts.js"
cp "$HERE/index.html" "$HERE/main.css" "$HERE/ebr_probe.py" "$DEST/echo/"
STATES=$(tr -d '\n ' < "$HERE/../states.json"); sed -e "s/__BUILD_TOKEN__/$TOKEN/" -e "s|'__STATES__'|'$STATES'|" "$HERE/main.js" > "$DEST/echo/main.js"
mkdir -p "$DEST/tools/qollab-runner/.cache"; cp /Users/udsy/agent-org/lanes/platform/wt/g0-diagnostic-port/tools/qollab-runner/.cache/*.whl "$DEST/tools/qollab-runner/.cache/" 2>/dev/null
if (exec 3<>"/dev/tcp/127.0.0.1/$PORT") 2>/dev/null; then echo "NO VERDICT: port $PORT busy"; exit 2; fi
node "$DEST/tools/qollab-runner/server.mjs" --port "$PORT" --project "$DEST/echo" > "$DEST/server.log" 2>&1 & SRV=$!
for _ in $(seq 1 120); do grep -q 'LOCAL Qollab-like runner' "$DEST/server.log" && break; sleep 0.5; done
node "$HERE/drive.cjs" --port "$PORT" --token "$TOKEN" --out "$HERE/out"; CODE=$?
kill $SRV; wait $SRV 2>/dev/null
echo "python ref $REF@$(git -C "$REPO" rev-parse --short "$REF") runner lane/platform/integration@$(git -C "$REPO" rev-parse --short lane/platform/integration) contracts main@$(git -C "$REPO" rev-parse --short main) token $TOKEN" > "$HERE/out/provenance.txt"
rm -rf "$DEST"; exit $CODE
