#!/usr/bin/env bash
# One graded run: assemble a disposable copy, serve it on OUR port, drive it, stop the server.
#   run.sh <tag> <scenario conformant|head> [assemble flags...]
#   PB_PORT (default 5147) · PB_OUT (default evidence dir/out) · PB_SHOT_TO (optional png copy)
set -uo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
TAG=$1; SCEN=$2; shift 2
PORT=${PB_PORT:-5147}; OUT=${PB_OUT:-$HERE/out}
# realpath: the runner only starts when argv[1] equals its own resolved URL, and /tmp is a symlink on macOS
DEST=$(cd "$(mktemp -d /tmp/pb-run-XXXXXX)" && pwd -P)
TOKEN="pb-$TAG-$(date +%Y%m%dT%H%M%S)-$RANDOM"
"$HERE/assemble.sh" "$DEST" "$TOKEN" "$@" || exit 2
if lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then echo "NO VERDICT: port $PORT is busy" >&2; exit 2; fi
node "$DEST/tools/qollab-runner/server.mjs" --port "$PORT" --project "$DEST/echo" > "$DEST/server.log" 2>&1 &
SRV=$!
for _ in $(seq 1 120); do grep -q 'LOCAL Qollab-like runner' "$DEST/server.log" && break; sleep 0.5; done
node "$HERE/drive.cjs" --port "$PORT" --dest "$DEST" --expect-build "$TOKEN" --scenario "$SCEN" --out "$OUT" --tag "$TAG" ${PB_SHOT_TO:+--shot-to "$PB_SHOT_TO"}
CODE=$?
kill "$SRV" 2>/dev/null; wait "$SRV" 2>/dev/null
cp "$DEST/ASSEMBLY.json" "$OUT/$TAG-assembly.json" 2>/dev/null
rm -rf "$DEST"
echo "run.sh $TAG → exit $CODE"
exit $CODE
