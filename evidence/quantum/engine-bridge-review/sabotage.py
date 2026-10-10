"""Sabotage round on DISPOSABLE copies (git archive HEAD -> /tmp). For each mutation: pytest echo/tests in the copy,
and derive.py against the copy's engine. Prints a table; exit 2 if any pattern did not apply.
Usage: python sabotage.py"""
import os, pathlib, subprocess, sys, tempfile
REPO = pathlib.Path(subprocess.check_output(["git", "rev-parse", "--show-toplevel"], text=True).strip())
PY = sys.executable
# the copy has no .git, so the conformance tests get platform's contracts.js from the env (their documented override)
CJS = pathlib.Path(tempfile.mkdtemp(prefix="ebr-cjs-"), "contracts.js")
CJS.write_text(subprocess.check_output(["git", "-C", str(REPO), "show", "main:echo/contracts.js"], text=True))
ENV = {**os.environ, "ECHO_CONTRACTS_JS": str(CJS)}
HERE = pathlib.Path(__file__).resolve().parent
T = "echo/quantum/teleportation.py"
MUT = {
    "none (baseline control)": (T, []),
    # positive control: X and Z swapped when Bob corrects (the rule broken in the physics itself)
    "swap-correction-gates": (T, [("    if apply_x:\n        fix.x(0)\n    if apply_z:\n        fix.z(0)",
                                   "    if apply_z:\n        fix.x(0)\n    if apply_x:\n        fix.z(0)")]),
    # ruling: the token is consumed only on success; latch it before computing instead
    "latch-before-compute": (T, [("    rng = rng or random.Random(_check_seed(seed))\n    gates, _ = state_gates(TOKEN, story_token=True)",
                                  "    _token_consumed = True\n    rng = rng or random.Random(_check_seed(seed))\n    gates, _ = state_gates(TOKEN, story_token=True)")]),
    # ruling: dry-run states are random; draw the same generic point every time
    "dry-run-fixed-state": (T, [("    while True:\n        z = rng.uniform(-1.0, 1.0)", "    return 1.137, 0.44\n    while True:\n        z = rng.uniform(-1.0, 1.0)")]),
    # vision 2.4: an FTL overclaim spelled with hyphens in the commit fact
    "ftl-hyphenated-fact": (T, [("travelled over the classical link", "travelled faster-than-light over the entangled link")]),
    # m0/m1 labels swapped in every circuitDescription and fact
    "swap-bit-labels": (T, [('M0_LABEL = "SOURCE READOUT m0"', 'M0_LABEL = "LOCAL BELL-HALF READOUT m1"'),
                            ('M1_LABEL = "LOCAL BELL-HALF READOUT m1"', 'M1_LABEL = "SOURCE READOUT m0"')]),
    # the commit applies the rule with the bits swapped
    "commit-rule-bits-swapped": (T, [("    rule = expected_corrections(m0, m1)\n    b = _branch(gates, m0, m1, rule[\"applyX\"], rule[\"applyZ\"])",
                                      "    rule = expected_corrections(m1, m0)\n    b = _branch(gates, m0, m1, rule[\"applyX\"], rule[\"applyZ\"])")]),
}
names = sys.argv[1:] or list(MUT)
refused = 0
print(f"{'mutation':28} {'pytest':>22} {'derive':>8}")
for name in names:
    f, edits = MUT[name]
    with tempfile.TemporaryDirectory(prefix="ebr-sab-") as d:
        subprocess.run(f"git -C {REPO} archive HEAD echo | tar -x -C {d}", shell=True, check=True)
        p = pathlib.Path(d, f); s = p.read_text()
        for old, new in edits:
            if s.count(old) != 1:
                print(f"{name:28} REFUSED: pattern not found once"); refused += 1; break
            s = s.replace(old, new)
        else:
            p.write_text(s)
            t = subprocess.run([PY, "-m", "pytest", "echo/tests", "-q", "-p", "no:cacheprovider"], cwd=d, capture_output=True, text=True, env=ENV)
            tail = t.stdout.strip().splitlines()[-1] if t.stdout.strip() else t.stderr[-200:]
            dv = subprocess.run([PY, str(HERE / "derive.py"), str(pathlib.Path(d, "echo"))], cwd=d, capture_output=True, text=True)
            print(f"{name:28} {('RED ' if t.returncode else 'NULL ') + tail:>40}   derive {'RED' if dv.returncode else 'NULL'}", flush=True)
            if t.returncode:
                fails = [l for l in t.stdout.splitlines() if l.startswith("FAILED")][:3]
                for l in fails: print("      ", l[:160])
sys.exit(2 if refused else 0)
