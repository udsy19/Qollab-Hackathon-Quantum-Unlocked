#!/usr/bin/env bash
# Red-team shell-boot-smoke: compose ECHO from PINNED lane SHAs (git archive, never a checkout),
# serve each tree with platform's own local runner on our own port, and drive it in headless Chrome
# on the player's path. LOCAL RUNNER ONLY — nothing here is a Qollab or IonQ result.
#
#   bash evidence/red-team/shell-boot-smoke/reproduce.sh [--repo <git repo>] [--port 41731]
#        [--out <dir>] [--variants "A B0 BB"] [--sabotage]
#
# Variants:  A  = the five integration tips as merged (platform's assembler, default ownership rules)
#            B0 = A with gameplay = world-v2-port, NO glue (what the shell does with it as merged)
#            BB = B0 + glue/main.bridged.js as main.js — a labelled BRIDGED probe, not the product
# --sabotage adds A-sab: A with story-ui's Start handler deleted in a disposable copy; the drive
#            must report the title row "blocked" (falsification of the reach detector).
# Pins come from PROVENANCE.tsv (kind=pin). Exit: 0 every drive ran (any reach), 2 refused.
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(git -C "$HERE" rev-parse --show-toplevel)
PORT=41731
OUT="$HERE/out"
VARIANTS="A B0 BB"
SABOTAGE=0
while [ $# -gt 0 ]; do
  case "$1" in
    --repo) REPO=$(cd "$2" && pwd); shift 2 ;;
    --port) PORT=$2; shift 2 ;;
    --out) OUT=$2; shift 2 ;;
    --variants) VARIANTS=$2; shift 2 ;;
    --sabotage) SABOTAGE=1; shift ;;
    *) echo "REFUSED: unknown argument $1" >&2; exit 2 ;;
  esac
done
[ "$SABOTAGE" = 1 ] && VARIANTS="$VARIANTS A-sab"
pin() { awk -F'\t' -v k="$1" '$1=="pin" && $2==k {print $3}' "$HERE/PROVENANCE.tsv"; }
for k in platform quantum story-ui gameplay art gameplay-v2; do
  s=$(pin "$k"); [ -n "$s" ] || { echo "REFUSED: no pin for $k" >&2; exit 2; }
  git -C "$REPO" cat-file -e "$s^{commit}" 2>/dev/null || { echo "REFUSED: $k pin $s not in $REPO" >&2; exit 2; }
done

# Realpath: platform's server.mjs only starts when argv[1] equals its realpath (/tmp is a symlink on macOS).
W=$(cd "$(mktemp -d /tmp/sbs.XXXXXX)" && pwd -P)
echo "workdir $W"
git -C "$REPO" archive "$(pin platform)" tools | tar -x -C "$W"
RUNNER="$W/tools/qollab-runner"
# Reuse an already-downloaded Qollab Qiskit wheel if one exists (else the server GETs it once).
for c in ${QOLLAB_WHEEL_CACHE:-} "$REPO/tools/qollab-runner/.cache" /Users/udsy/agent-org/lanes/platform/wt/*/tools/qollab-runner/.cache; do
  if [ -d "$c" ] && ls "$c"/*.whl >/dev/null 2>&1; then mkdir -p "$RUNNER/.cache" && cp "$c"/*.whl "$RUNNER/.cache/"; break; fi
done

# Our own backend.run counter, in a disposable copy of the RUNNER page (never a product file):
# JS side counts calls through the injected backend proxy; Python side wraps run() on the injected
# instance, so a backend.run made from Python is counted too.
python3 -I - "$RUNNER/frame.js" <<'PY'
import sys
p = sys.argv[1]; s = open(p).read()
old = "const backend = wrapBackend(await py.runPythonAsync(PREAMBLE));"
assert s.count(old) == 1, "runner frame.js changed shape; refusing to patch"
new = """window.sbsJsRuns = 0; window.sbsPyRuns = 0;
    const sbsPy = await py.runPythonAsync(PREAMBLE);
    await py.runPythonAsync('import js\\n_sbs_orig = backend.run\\ndef _sbs_run(*a, **k):\\n    js.sbsPyRuns = js.sbsPyRuns + 1\\n    return _sbs_orig(*a, **k)\\nbackend.run = _sbs_run\\n');
    const sbsWrapped = wrapBackend(sbsPy);
    const backend = new Proxy(sbsWrapped, { get(t, k, r) { const v = Reflect.get(t, k, r); return k === 'run' ? (...a) => { window.sbsJsRuns += 1; return v(...a); } : v; } });"""
open(p, 'w').write(s.replace(old, new))
PY

assemble() {  # assemble <dir> <gameplay sha>
  node "$W/tools/assemble-echo/assemble.mjs" --out "$1" --repo "$REPO" \
    --ref platform="$(pin platform)" --ref quantum="$(pin quantum)" --ref story-ui="$(pin story-ui)" \
    --ref gameplay="$2" --ref art="$(pin art)" > "$1.assemble.log" 2>&1 || true
  [ -f "$1/main.js" ] || { echo "REFUSED: assembler wrote no $1/main.js" >&2; cat "$1.assemble.log" >&2; exit 2; }
}

mkdir -p "$OUT"
STATUS=0
for v in $VARIANTS; do
  T="$W/$v"
  case "$v" in
    A|A-sab) assemble "$T" "$(pin gameplay)" ;;
    B0) assemble "$T" "$(pin gameplay-v2)" ;;
    BB) assemble "$T" "$(pin gameplay-v2)"; cp "$HERE/glue/main.bridged.js" "$T/main.js" ;;
  esac
  if [ "$v" = A-sab ]; then
    # Sabotage (disposable copy): the title's Start button no longer starts anything.
    python3 -I - "$T/ui/menu.js" <<'PY'
import sys, re
p = sys.argv[1]; s = open(p).read()
n = len(re.findall(r"onStart\(\)", s))
assert n >= 1, "sabotage target onStart() not found"
open(p, 'w').write(s.replace("onStart()", "void 0"))
print(f"sabotage: removed {n} onStart() call(s) from ui/menu.js")
PY
  fi
  TOKEN="sbs-$v-$(date +%s)-$RANDOM"
  # Law 16: a token we just made, written into the disposable served copy, read back from the page.
  printf '\n<div id="sbs-token" style="position:fixed;left:4px;top:4px;z-index:99999;font:11px monospace;color:#ff0;background:#000;padding:1px 4px;pointer-events:none">%s</div>\n' "$TOKEN" >> "$T/index.html"
  (cd "$T" && find . -type f | sort | xargs shasum -a 256) > "$OUT/$v.tree.sha256" 2>/dev/null || true
  mkdir -p "$OUT/$v"
  cp "$T.assemble.log" "$OUT/$v/assemble.log"
  node "$RUNNER/server.mjs" --port "$PORT" --project "$T" > "$OUT/$v/server.log" 2>&1 &
  SRV=$!
  for _ in $(seq 1 60); do curl -sf "http://127.0.0.1:$PORT/" >/dev/null 2>&1 && break; sleep 0.5; done
  set +e
  node "$HERE/drive.cjs" --port "$PORT" --variant "$v" --token "$TOKEN" --out "$OUT/$v" 2>&1 | tee "$OUT/$v/drive.log"
  rc=${PIPESTATUS[0]}
  set -e
  kill "$SRV" 2>/dev/null || true; wait "$SRV" 2>/dev/null || true
  echo "variant $v drive exit $rc"
  [ "$rc" = 2 ] && STATUS=2
done
exit $STATUS
