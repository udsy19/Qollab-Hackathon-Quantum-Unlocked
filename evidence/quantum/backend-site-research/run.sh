#!/usr/bin/env bash
# One graded run: assemble a disposable copy, serve it on OUR port, drive it, stop the server.
#   run.sh <tag> <variant>      BS_PORT (default 5193) · BS_OUT (default ./out)
set -uo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
TAG=$1; VARIANT=$2
PORT=${BS_PORT:-5193}; OUT=${BS_OUT:-$HERE/out}
DEST=$(cd "$(mktemp -d /tmp/bs-run-XXXXXX)" && pwd -P)
TOKEN="bs-$TAG-$(date +%Y%m%dT%H%M%S)-$RANDOM"
"$HERE/assemble.sh" "$DEST" "$TOKEN" "$VARIANT" || exit 2
if lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then echo "NO VERDICT: port $PORT is busy" >&2; exit 2; fi
node "$DEST/tools/qollab-runner/server.mjs" --port "$PORT" --project "$DEST/echo" > "$DEST/server.log" 2>&1 &
SRV=$!
for _ in $(seq 1 120); do grep -q 'LOCAL Qollab-like runner' "$DEST/server.log" && break; sleep 0.5; done
node "$HERE/drive.cjs" --port "$PORT" --dest "$DEST" --expect-build "$TOKEN" --out "$OUT" --tag "$TAG"
CODE=$?
kill "$SRV" 2>/dev/null; wait "$SRV" 2>/dev/null
cp "$DEST/ASSEMBLY.json" "$OUT/$TAG-assembly.json" 2>/dev/null
rm -rf "$DEST"
echo "run.sh $TAG ($VARIANT) → exit $CODE"
exit $CODE
