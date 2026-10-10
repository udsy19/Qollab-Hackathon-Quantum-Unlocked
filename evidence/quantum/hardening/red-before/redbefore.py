# Red-before on the PRE-FIX code (HEAD 951ec9f echo/ + the new findings tests), HEAD-era needles.
import pathlib, shutil, subprocess, sys, tempfile
src = pathlib.Path(sys.argv[1])
M = [
 ("F1 bob-bloch-uncorrected", "quantum/teleportation.py", '"bob": bob,', '"bob": partial_trace(post, [0, 1]),'),
 ("F1 bloch-y-sign", "quantum/__init__.py", 'return [float(rho.expectation_value(Pauli(p)).real) for p in "XYZ"]',
  'return [s * float(rho.expectation_value(Pauli(p)).real) for s, p in zip((1, -1, 1), "XYZ")]'),
 ("F5 sampler-hardcoded-uniform", "quantum/teleportation.py", "        cumulative += probs[_key(m0, m1)]", "        cumulative += 0.25"),
 ("F6 clone-by-name-variant", "quantum/cloning.py", "independent = joint_fid > 1 - TOL", "independent = state_name in ('zero', 'one', 'test_basis', 'test_zero_alias')"),
 ("F6 clone-by-name-prefix", "quantum/cloning.py", "independent = joint_fid > 1 - TOL", "independent = state_name in ('zero', 'one') or 'basis' in state_name or 'zero' in state_name"),
 ("F7 job-hand-built-dict", "quantum/qollab_job.py", "    return experiment_result(\n        experiment=\"bell_verification\",", "    return dict(\n        experiment=\"bell_verification\","),
]
for mid, f, old, new in M:
    for with_new in (False, True):
        d = pathlib.Path(tempfile.mkdtemp()) / "echo"
        shutil.copytree(src, d, ignore=shutil.ignore_patterns("__pycache__"))
        if not with_new:
            (d / "tests/test_hardening_findings.py").unlink()
        p = d / f; t = p.read_text(); assert t.count(old) == 1, (mid, t.count(old)); p.write_text(t.replace(old, new))
        r = subprocess.run([sys.executable, "-m", "pytest", str(d / "tests"), "-q", "-p", "no:cacheprovider", "--tb=no"], capture_output=True, text=True, cwd="/tmp")
        fails = [l for l in r.stdout.splitlines() if l.startswith("FAILED")]
        print(f"## {mid} — {'WITH' if with_new else 'WITHOUT'} the new findings tests: exit {r.returncode}, {r.stdout.strip().splitlines()[-1]}")
        for l in fails[:6]: print("   ", l)
        shutil.rmtree(d.parent)
