#!/usr/bin/env bash
# G1 proof in one command: grade a git ref with the quantum lane's existing gates, in a DISPOSABLE
# detached worktree under /tmp (the lane checkout is never touched), and write out/<sha>/SUMMARY.md.
#
#   prove.sh <git-ref> [port]        port: the round's local runner (default 5241; not 5193/5213)
#
# Exit  0 every gate at its expected verdict
#       1 at least one gate graded RED / UNEXPECTED, and every gate ran
#       2 REFUSED: a gate could not run or produced no verdict (missing script, timeout, crash, busy
#         port, unparseable output). 2 wins over 1: an instrument that could not grade is reported first.
#
# Gates reused, never reimplemented (each is run from the REF's own tree, so it co-evolves with the
# contracts; the blob of every gate script is printed in SUMMARY.md):
#   pytest echo/tests · tools/contract-check/check.mjs · tools/qollab-caps/check.mjs ·
#   evidence/quantum/engine-bridge-review/seam.mjs · evidence/quantum/pyodide-bridge/round.sh
# The seam's validators/rules are NOT taken from the ref (gate-independence): contracts.js comes from
# PROVE_CONTRACTS_REF (main) and missionRules.js from PROVE_GAMEPLAY_REF, both recorded by SHA.
#
# Every gate: own exit code captured (no pipe), PYTHONDONTWRITEBYTECODE=1, a timeout (124 -> NO VERDICT).
# A verdict is READ FROM THE GATE'S OWN LINE; a crash that exits 1 without that line is NO VERDICT, not red.
# Env: PROVE_PYTHON(python) PROVE_CONTRACTS_REF(main) PROVE_GAMEPLAY_REF(lane/gameplay/integration)
#      PROVE_CAPS_ALLOW(entry-index,entry-main) PROVE_KNOWN_NULLS(sab-bare-toJs sab-plain-call)
#      PROVE_T_<GATE> seconds (PYTEST 600, CONTRACT 300, CAPS 120, SEAM 300, ROUND 3300) PROVE_KEEP=1
set -u
export PYTHONDONTWRITEBYTECODE=1
HERE=$(cd "$(dirname "$0")" && pwd -P)
LANE=$(git -C "$HERE" rev-parse --show-toplevel)
REF=${1:-}; PORT=${2:-5241}
[ -n "$REF" ] || { echo "usage: prove.sh <git-ref> [port]" >&2; exit 2; }
SHA=$(git -C "$LANE" rev-parse --verify --quiet "$REF^{commit}") || { echo "REFUSED: $REF is not a commit" >&2; exit 2; }
PY=${PROVE_PYTHON:-python}
CONTRACTS_REF=${PROVE_CONTRACTS_REF:-main}
GAMEPLAY_REF=${PROVE_GAMEPLAY_REF:-lane/gameplay/integration}
CAPS_ALLOW=${PROVE_CAPS_ALLOW:-entry-index,entry-main}
# Sabotages round.sh cannot make red, written BEFORE their round in report 0013 (bare toJs() is already
# plain in Pyodide 314; plain-call: the only JSPI-needing call was Python's own backend.run, now gone).
KNOWN_NULLS=${PROVE_KNOWN_NULLS:-sab-bare-toJs sab-plain-call}
TMO=$(command -v gtimeout || command -v timeout) || { echo "REFUSED: no timeout/gtimeout on PATH" >&2; exit 2; }
case "$PORT" in 5193|5213) echo "REFUSED: port $PORT is reserved" >&2; exit 2;; esac
if (exec 3<>"/dev/tcp/127.0.0.1/$PORT") 2>/dev/null; then echo "REFUSED: port $PORT is busy" >&2; exit 2; fi

OUT="$HERE/out/$SHA"; rm -rf "$OUT"; mkdir -p "$OUT"
WT=$(cd "$(mktemp -d /tmp/prove-${SHA:0:7}-XXXXXX)" && pwd -P)
cleanup() { [ "${PROVE_KEEP:-0}" = 1 ] || { git -C "$LANE" worktree remove --force "$WT" >/dev/null 2>&1; rm -rf "$WT"; git -C "$LANE" worktree prune; }; }
trap cleanup EXIT
git -C "$LANE" worktree add --detach "$WT" "$SHA" >"$OUT/worktree.log" 2>&1 || { echo "REFUSED: worktree add failed (see $OUT/worktree.log)" >&2; exit 2; }

ROWS=(); ANY_RED=0; ANY_REF=0
# gate <name> <timeout-s> <cmd...>  -> sets G_CODE; log at $OUT/<name>.log; runs in the worktree
gate() { local n=$1 t=$2; shift 2; ( cd "$WT" && "$TMO" -k 15 "$t" "$@" ) >"$OUT/$n.log" 2>&1; G_CODE=$?; }
# record <name> <command> <exit> <STATUS> <verdict-line>
record() {
  local line=${5//|/\/}; line=${line:0:200}
  ROWS+=("| $1 | \`${2//|/\/}\` | $3 | **$4** | $line | \`out/${SHA:0:7}…/$1.log\` |")
  case $4 in PASS) ;; RED|UNEXPECTED) ANY_RED=1;; *) ANY_REF=1;; esac
  echo "$1: exit $3 -> $4  $line"
}
# Exit triage: returns 0 if G_CODE is one of the gradable codes ($3...); else records NO VERDICT/REFUSED.
triage() {
  local n=$1 c=$2; shift 2
  case $G_CODE in 124|137) record "$n" "$c" "$G_CODE" "NO VERDICT" "timed out (a hang is not a red)"; return 1;; esac
  for ok in "$@"; do [ "$G_CODE" = "$ok" ] && return 0; done
  record "$n" "$c" "$G_CODE" "REFUSED" "exit $G_CODE is not a verdict: $(tail -n 1 "$OUT/$n.log" | cut -c1-100)"; return 1
}
need() { git -C "$LANE" cat-file -e "$SHA:$2" 2>/dev/null || { record "$1" "(missing $2 in $REF)" "-" "REFUSED" "gate script absent from the ref: did not run"; return 1; }; }

# ---------------------------------------------------------------- 1 pytest
C="$PY -m pytest echo/tests -q -p no:cacheprovider"
if need pytest echo/tests/conftest.py; then
  gate pytest "${PROVE_T_PYTEST:-600}" $C
  if triage pytest "$C" 0 1; then
    V=$(grep -E '[0-9]+ (passed|failed)' "$OUT/pytest.log" | tail -n 1)
    N=$(printf '%s' "$V" | grep -Eo '[0-9]+ passed' | grep -Eo '[0-9]+')
    if [ "$G_CODE" = 0 ] && [ "${N:-0}" -gt 0 ] && ! printf '%s' "$V" | grep -Eq 'failed|error'; then record pytest "$C" 0 PASS "$V"
    elif [ "$G_CODE" = 1 ] && [ -n "$V" ]; then record pytest "$C" 1 RED "$V"
    else record pytest "$C" "$G_CODE" REFUSED "no readable pytest summary / zero tests"; fi
  fi
fi

# ---------------------------------------------------------------- 2 echo/ hygiene (feeds the caps file count)
PYC=$(cd "$WT" && find echo \( -name __pycache__ -o -name .pytest_cache -o -name '*.pyc' \) | wc -l | tr -d ' ')
if [ "$PYC" = 0 ]; then record echo-clean "find echo -name __pycache__ -o -name .pytest_cache" 0 PASS "0 bytecode/cache entries under echo/ after pytest"
else record echo-clean "find echo -name __pycache__ -o -name .pytest_cache" 1 RED "$PYC bytecode/cache entries under echo/ inflate the caps file count"; fi

# ---------------------------------------------------------------- 3 contract-check
C="node tools/contract-check/check.mjs"
if need contract-check tools/contract-check/check.mjs; then
  gate contract-check "${PROVE_T_CONTRACT:-300}" $C
  if triage contract-check "$C" 0 1; then
    V=$(grep -E '^contract-check: (GREEN|RED)' "$OUT/contract-check.log" | tail -n 1)
    if [ -z "$V" ]; then record contract-check "$C" "$G_CODE" "NO VERDICT" "no 'contract-check: GREEN|RED' line (crash?)"
    elif [ "$G_CODE" = 0 ] && printf '%s' "$V" | grep -Eq 'GREEN — ([0-9]+)/\1 checks' && ! printf '%s' "$V" | grep -q ' 0/0 '; then record contract-check "$C" 0 PASS "$V"
    elif [ "$G_CODE" = 1 ]; then record contract-check "$C" 1 RED "$V"
    else record contract-check "$C" "$G_CODE" UNEXPECTED "exit/verdict disagree: $V"; fi
  fi
fi

# ---------------------------------------------------------------- 4 qollab-caps (judged BY RULE ID, not exit code)
C="node tools/qollab-caps/check.mjs"
if need qollab-caps tools/qollab-caps/check.mjs; then
  gate qollab-caps "${PROVE_T_CAPS:-120}" $C
  if triage qollab-caps "$C" 0 1; then
    FRE='^[^ ]+:[0-9]+ [a-z0-9-]+ '
    RULES=$(grep -E "$FRE" "$OUT/qollab-caps.log" | awk '{print $2}' | sort -u | paste -sd, -)
    NF=$(grep -cE "$FRE" "$OUT/qollab-caps.log")
    SUMLINE=$(grep -E '^(RED|GREEN)' "$OUT/qollab-caps.log" | tail -n 1)
    SITE=$(grep -E 'info: backend.run: ' "$OUT/qollab-caps.log" | tail -n 1 | sed 's/^ *info: //')
    CLAIM=$(printf '%s' "$SUMLINE" | grep -Eo '^RED: [0-9]+' | grep -Eo '[0-9]+')
    BAD=""
    for r in $(printf '%s' "$RULES" | tr , ' '); do case ",$CAPS_ALLOW," in *",$r,"*) ;; *) BAD="$BAD $r";; esac; done
    if [ -z "$SUMLINE" ]; then record qollab-caps "$C" "$G_CODE" "NO VERDICT" "no RED/GREEN summary line"
    elif [ "$G_CODE" = 1 ] && [ "$NF" != "${CLAIM:-x}" ]; then record qollab-caps "$C" 1 REFUSED "summary claims ${CLAIM:-?} failures, I counted $NF finding lines"
    elif [ -n "$BAD" ]; then record qollab-caps "$C" "$G_CODE" RED "unexpected rule(s):$BAD (allowed: $CAPS_ALLOW) · ${SITE:-no backend.run site line}"
    elif ! printf '%s' "$SITE" | grep -q 'exactly one call site, echo/quantum/bridge.js:'; then record qollab-caps "$C" "$G_CODE" RED "backend.run is not 'exactly one call site' in echo/quantum/bridge.js: ${SITE:-no site line}"
    else record qollab-caps "$C" "$G_CODE" PASS "rules red: ${RULES:-none} (allowed $CAPS_ALLOW) · $SITE"; fi
  fi
fi

# ---------------------------------------------------------------- 5 seam (real engine output -> main validators + gameplay rules)
E=evidence/quantum/engine-bridge-review
C="$PY engine_dump.py echo > dump.json; node seam.mjs <$CONTRACTS_REF contracts + $GAMEPLAY_REF rules> dump.json"
SEAMDIR="$OUT/seam-inputs"; mkdir -p "$SEAMDIR/game"
if need seam $E/seam.mjs && need seam $E/engine_dump.py; then
  if ! { git -C "$LANE" show "$CONTRACTS_REF:echo/contracts.js" >"$SEAMDIR/contracts.js" \
      && git -C "$LANE" show "$GAMEPLAY_REF:echo/game/missionRules.js" >"$SEAMDIR/game/missionRules.js"; } 2>"$OUT/seam-inputs.log"; then
    record seam "$C" "-" REFUSED "cannot read validators/rules from $CONTRACTS_REF / $GAMEPLAY_REF: $(head -c 100 "$OUT/seam-inputs.log")"
  else
    gate seam-dump "${PROVE_T_SEAM:-300}" bash -c "$PY $E/engine_dump.py echo > '$OUT/dump.json'"
    if [ "$G_CODE" != 0 ]; then record seam "$C" "$G_CODE" REFUSED "engine_dump.py failed (see seam-dump.log)"
    else
      gate seam "${PROVE_T_SEAM:-300}" node $E/seam.mjs "$SEAMDIR" "$OUT/dump.json"
      if triage seam "$C" 0 1; then
        V=$(grep -E '^[0-9]+ checks, [0-9]+ FAIL' "$OUT/seam.log" | tail -n 1)
        NC=$(printf '%s' "$V" | awk '{print $1}'); NFAIL=$(printf '%s' "$V" | awk '{print $3}')
        NP=$(grep -c '^PASS ' "$OUT/seam.log"); NX=$(grep -c '^FAIL ' "$OUT/seam.log")
        TAIL="$V · $(grep '^validateCommitResult' "$OUT/seam.log" | cut -c1-110) · contracts@$(git -C "$LANE" rev-parse --short "$CONTRACTS_REF") gameplay@$(git -C "$LANE" rev-parse --short "$GAMEPLAY_REF")"
        if [ -z "$V" ]; then record seam "$C" "$G_CODE" "NO VERDICT" "no 'N checks, M FAIL' line (crash? $(grep -m1 -E 'Error' "$OUT/seam.log" | cut -c1-80))"
        elif [ "${NC:-0}" -lt 1 ]; then record seam "$C" "$G_CODE" REFUSED "zero checks ran"
        elif [ "$G_CODE" = 0 ] && [ "$NFAIL" = 0 ] && [ "$NX" = 0 ] && [ "$NP" -ge "$((NC-1))" ]; then record seam "$C" 0 PASS "$TAIL"
        else record seam "$C" "$G_CODE" RED "$TAIL (counted $NP PASS / $NX FAIL lines)"; fi
      fi
    fi
  fi
fi

# ---------------------------------------------------------------- 6 round.sh (real Pyodide runner, ~19 runs)
R=evidence/quantum/pyodide-bridge
C="PB_PORT=$PORT bash $R/round.sh"
if need round $R/round.sh; then
  rm -rf "$WT/$R/out"   # the ref may carry old committed logs; only THIS run's rows may be graded
  PB_PORT=$PORT gate round "${PROVE_T_ROUND:-3300}" bash $R/round.sh
  if triage round "$C" 0; then
    SUMF="$WT/$R/out/SUMMARY.md"
    if [ ! -s "$SUMF" ]; then record round "$C" 0 "NO VERDICT" "round.sh wrote no SUMMARY.md"
    else
      mkdir -p "$OUT/round"; cp "$SUMF" "$OUT/round/"; cp "$WT/$R/out/"*.log "$OUT/round/" 2>/dev/null
      NROWS=$(grep -cE '^\| ' "$SUMF"); NROWS=$((NROWS-2))   # minus the header and separator rows
      NLOGS=$(ls "$WT/$R/out/"*.log 2>/dev/null | wc -l | tr -d ' ')
      BADROWS=""; NNULL=0; NOK=0
      while IFS='|' read -r _ tag scen want code verdict checks _; do
        tag=$(echo $tag); verdict=$(echo $verdict); want=$(echo $want); checks=$(echo $checks)
        case $tag in run|---*|'') continue;; esac
        case $verdict in
          OK) NOK=$((NOK+1))
              if [ "$want" = "exit 0" ]; then a=${checks%%/*}; b=${checks#*/}; b=${b%% *}
                { [ -n "$a" ] && [ "$a" = "$b" ] && [ "$a" -gt 0 ] 2>/dev/null; } || BADROWS="$BADROWS $tag(green row checks '$checks')"; fi;;
          NULL) case " $KNOWN_NULLS " in *" $tag "*) NNULL=$((NNULL+1));; *) BADROWS="$BADROWS $tag(NEW-NULL)";; esac;;
          *) BADROWS="$BADROWS $tag(${verdict:-?})";;
        esac
      done < <(grep -E '^\| ' "$SUMF")
      if [ "$NROWS" -lt 1 ] || [ "$NROWS" != "$NLOGS" ]; then record round "$C" 0 REFUSED "SUMMARY has $NROWS rows but $NLOGS run logs exist: round did not complete"
      elif [ -n "$BADROWS" ]; then record round "$C" 0 RED "$NOK OK + $NNULL known-null of $NROWS rows; bad:$BADROWS"
      else record round "$C" 0 PASS "$NROWS rows: $NOK OK + $NNULL known-null (${KNOWN_NULLS// /,}); every green run N/N checks"; fi
    fi
  fi
fi

# ---------------------------------------------------------------- SUMMARY
if [ "$ANY_REF" = 1 ]; then FINAL=2; WORD="REFUSED (a gate could not grade)"
elif [ "$ANY_RED" = 1 ]; then FINAL=1; WORD="RED"; else FINAL=0; WORD="GREEN"; fi
blobs=""   # provenance: the exact gate-script blobs that graded this ref (they are lane files, not on main)
for f in tools/contract-check/check.mjs tools/qollab-caps/check.mjs $E/seam.mjs $E/engine_dump.py $R/round.sh; do
  blobs="$blobs ${f##*/}@$(git -C "$LANE" rev-parse -q --verify --short "$SHA:$f" 2>/dev/null || echo MISSING)"
done
{
  echo "# G1 proof: $REF @ ${SHA}"
  echo
  echo "**Overall: $WORD (exit $FINAL)** · $(date '+%Y-%m-%d %H:%M %Z') · harness $(git -C "$HERE" rev-parse --short HEAD) · $($PY --version 2>&1) · port $PORT"
  echo
  echo "Seam validators: \`$CONTRACTS_REF\`@$(git -C "$LANE" rev-parse --short "$CONTRACTS_REF"), gameplay rules: \`$GAMEPLAY_REF\`@$(git -C "$LANE" rev-parse --short "$GAMEPLAY_REF") (not the ref's own). Local runner, **not Qollab, not IonQ**."
  echo "Gate script blobs (run from the ref's own tree):$blobs"
  echo
  echo "| gate | command | exit | verdict | verdict line | log |"; echo "|---|---|---|---|---|---|"
  printf '%s\n' "${ROWS[@]}"
} >"$OUT/SUMMARY.md"
echo; cat "$OUT/SUMMARY.md"
exit $FINAL
