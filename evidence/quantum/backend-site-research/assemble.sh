#!/usr/bin/env bash
# Build a DISPOSABLE runnable copy under /tmp: platform's local runner + platform's contracts.js +
# echo/quantum/*.py from HEAD + one variant of the selected-backend route + this harness as entry.
# Nothing in the repo is modified (git archive, no worktree entry).
#   assemble.sh <dest> <build-token> <variant>
#   variant: B-baseline   bridge-rewire's bridge.js + HEAD qollab_job.py (Python submits)
#            A            proposed/bridge.js + proposed/qollab_job.py (JS submits)
#   suffixes: -control (X on q0 instead of the Bell circuit) · -sab-no-memo · -sab-parse-left · -sab-python-also-runs
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(git -C "$HERE" rev-parse --show-toplevel)
DEST=$1; TOKEN=$2; VARIANT=$3
RUNNER_REF=lane/platform/integration; CONTRACTS_REF=lane/platform/integration
case "$DEST" in /tmp/*|/private/tmp/*|"${TMPDIR:-/nonexistent}"*) ;; *) echo "refusing: dest must be under /tmp or \$TMPDIR" >&2; exit 2;; esac
rm -rf "$DEST"; mkdir -p "$DEST/echo"
git -C "$REPO" archive "$RUNNER_REF" tools/qollab-runner | tar -x -C "$DEST"
git -C "$REPO" archive HEAD echo/quantum | tar -x -C "$DEST"
git -C "$REPO" show "$CONTRACTS_REF:echo/contracts.js" > "$DEST/echo/contracts.js"
case "$VARIANT" in
  B-baseline*) cp "$HERE/proposed/bridge.base.js" "$DEST/echo/quantum/bridge.js" ;;
  A*) cp "$HERE/proposed/bridge.js" "$DEST/echo/quantum/bridge.js"; cp "$HERE/proposed/qollab_job.py" "$DEST/echo/quantum/qollab_job.py" ;;
  *) echo "unknown variant $VARIANT" >&2; exit 2 ;;
esac
cp "$HERE/project/index.html" "$HERE/project/main.css" "$HERE/project/bs_spy.py" "$DEST/echo/"
sed -e "s/__BUILD_TOKEN__/$TOKEN/" -e "s/__VARIANT__/$VARIANT/" "$HERE/project/main.js" > "$DEST/echo/main.js"
# apply <file> <python-literal-old> <python-literal-new>: exact replace, exit 2 if the pattern is absent
apply() { python3 -I -c 'import sys;p,o,n=sys.argv[1:];s=open(p).read();sys.exit(2) if o not in s else open(p,"w").write(s.replace(o,n,1))' "$@" || { echo "sabotage pattern not found in $1" >&2; exit 2; }; }
case "$VARIANT" in *-control*) apply "$DEST/echo/bs_spy.py" "CONTROL = False" "CONTROL = True" ;; esac
case "$VARIANT" in *-sab-no-memo*) apply "$DEST/echo/quantum/bridge.js" "if (!verification) verification = submitOnce();
  return verification;" "return submitOnce();" ;; esac
case "$VARIANT" in *-sab-python-also-runs*) apply "$DEST/echo/quantum/qollab_job.py" "    return interpret_counts(raw_counts, _backend_label(backend)" "    backend.run(build_backend_verification_circuit(), shots=shots_requested)
    return interpret_counts(raw_counts, _backend_label(backend)" ;; esac
case "$VARIANT" in *-sab-parse-left*) apply "$DEST/echo/quantum/qollab_job.py" "int(key[-1 - clbit])" "int(key[clbit])" ;; esac
mkdir -p "$DEST/tools/qollab-runner/.cache"
W=qiskit-2.5.2-cp310-abi3-pyemscripten_2026_0_wasm32.whl
for c in "${PB_WHEEL_CACHE:-$HOME/.cache/echo-qiskit-wheel}/$W" /Users/udsy/agent-org/lanes/*/wt/*/tools/qollab-runner/.cache/$W; do
  [ -f "$c" ] && { cp "$c" "$DEST/tools/qollab-runner/.cache/$W"; break; }
done
{
  echo "{"
  echo "  \"token\": \"$TOKEN\", \"variant\": \"$VARIANT\","
  echo "  \"runnerRef\": \"$RUNNER_REF@$(git -C "$REPO" rev-parse --short "$RUNNER_REF")\","
  echo "  \"contractsRef\": \"$CONTRACTS_REF@$(git -C "$REPO" rev-parse --short "$CONTRACTS_REF")\","
  echo "  \"pythonRef\": \"HEAD@$(git -C "$REPO" rev-parse --short HEAD)\","
  echo "  \"harnessDirty\": $(git -C "$REPO" diff --quiet HEAD -- "$HERE" ":(exclude)$HERE/out" && echo false || echo true),"
  echo "  \"sha256\": {"
  (cd "$DEST/echo" && find . -type f | sort | while read -r f; do echo "    \"${f#./}\": \"$(shasum -a 256 "$f" | cut -c1-16)\","; done) | sed '$ s/,$//'
  echo "  }"
  echo "}"
} > "$DEST/ASSEMBLY.json"
echo "assembled $DEST ($VARIANT, token $TOKEN)"
