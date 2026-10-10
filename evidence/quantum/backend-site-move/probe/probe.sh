#!/usr/bin/env bash
# Refutation probe: a Python-built QuantumCircuit handed to the runner's JS backend.run, on builtin and ionq-mock.
#   PB_PORT=<port> probe.sh [python-ref]
set -uo pipefail
HERE=$(cd "$(dirname "$0")" && pwd); PB="$HERE/../../pyodide-bridge"; PORT=${PB_PORT:?}
DEST=$(cd "$(mktemp -d /tmp/bsm-probe-XXXXXX)" && pwd -P)
"$PB/assemble.sh" "$DEST" probe --python-from "${1:-HEAD}" >/dev/null || exit 2
cp "$HERE/main.js" "$HERE/index.html" "$HERE/main.css" "$DEST/echo/"
node "$DEST/tools/qollab-runner/server.mjs" --port "$PORT" --project "$DEST/echo" > "$DEST/server.log" 2>&1 & SRV=$!
for _ in $(seq 1 120); do grep -q 'LOCAL Qollab-like runner' "$DEST/server.log" && break; sleep 0.5; done
CODE=0; for be in builtin ionq-mock; do node "$HERE/probe.cjs" "$PORT" "$be" || CODE=1; done
kill $SRV; wait $SRV 2>/dev/null; rm -rf "$DEST"; echo "probe exit $CODE"; exit $CODE
