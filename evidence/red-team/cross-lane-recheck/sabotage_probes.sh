#!/usr/bin/env bash
# Falsify THIS round's own probes (law 3/15): break the merged tree on a disposable copy, one way at a
# time, and check each probe's verdict flips. Run after compose.sh and the dumps.
#   bash sabotage_probes.sh <merged-root (holds echo/ and fakeQuantum.js)> <out-dir>
# Exit 0 = every row flipped as expected · 1 = a probe failed to flip (a null in OUR gate) · 2 = refused.
set -u
M=${1:?merged root}; O=${2:?out dir}; H=$(cd "$(dirname "$0")" && pwd); BAD=0
[ -d "$M/echo" ] && [ -f "$M/fakeQuantum.js" ] && [ -f "$O/quantum_results_d9b42d0.json" ] || { echo "REFUSED: run compose.sh and the dumps first"; exit 2; }
copy() { local d; d=$(mktemp -d); cp -R "$M/echo" "$d/echo"; cp "$M/fakeQuantum.js" "$d/"; echo "$d"; }
edit() { python3 - "$1" "$2" "$3" <<'PY'
import sys, pathlib
p, old, new = pathlib.Path(sys.argv[1]), sys.argv[2], sys.argv[3]
t = p.read_text()
if t.count(old) != 1: sys.exit(f"pattern matched {t.count(old)}x in {p}")
p.write_text(t.replace(old, new))
PY
}
row() { # id, want-exit, probe-cmd (uses $D), file, old, new
  local id=$1 want=$2 cmd=$3 D; D=$(copy)
  if [ -n "${4:-}" ]; then edit "$D/echo/$4" "$5" "$6" || { echo "| \`$id\` | REFUSED |"; BAD=2; rm -rf "$D"; return; }; fi
  local rc; (eval "$cmd") >/dev/null 2>&1; rc=$?
  local v="flipped"; [ "$rc" != "$want" ] && { v="**NULL in our probe**"; [ $BAD -lt 1 ] && BAD=1; }
  echo "| \`$id\` | want exit $want | got $rc | $v |"; rm -rf "$D"
}
QW="node $H/quest_walk.mjs \$D/echo fake \$D/fakeQuantum.js"
BP="node $H/bridge_probe.mjs \$D/echo $O/quantum_results_d9b42d0.json $O/teleport_v2_d9b42d0.json"
echo "| sabotage | expectation | probe exit | verdict |"; echo "|---|---|---|---|"
row control_quest_walk 0 "$QW"
QWF="FAULT_FIRST_COMMIT=1 $QW | grep -q 'engine calls=0'"
row control_faulted_commit_latched 0 "$QWF"
row commit_latch_removed_after_refused_result 1 "$QWF" game/state.js "    if (commit !== COMMIT_STATUS.IDLE) return { ok: false, commit, reason: \`commit already \${commit}\` };" "    if (false) return {};"
row transition_deleted 1 "$QW" contracts.js "  LINK_REPAIRED: { RUN_DRY_TEST: 'TELEPORT_DRY_RUN' }," "  LINK_REPAIRED: {},"
row ack_gate_stuck 1 "$QW" game/state.js "  function resultPanelShown() { if (!queue.length) panelSeq = seq; }" "  function resultPanelShown() {}"
row bridge_backend_memo_removed 1 "$BP" quantum/bridge.js "  if (!verification) verification = verifyOnce();" "  verification = verifyOnce();"
row bridge_commit_latch_removed 1 "$BP" quantum/bridge.js "  if (commit) return commit;" ""
exit $BAD
