"""Render out/table.jsonl as a per-step matrix (HTML → PNG via headless Chrome). Counts are counted from the table."""
import collections, json, subprocess, sys, pathlib
OUT = pathlib.Path(__file__).parent / "out"
T = [json.loads(l) for l in open(OUT / "table.jsonl")]
def step(t):
    k = t["id"].split(":")[0]; qs = t["questState"]
    if k == "clone": return f"M1 {qs} ({'basis' if t['id'].split(':')[1] in ('zero','one') else 'non-basis'})"
    if k == "bell": return f"M2 {qs}"
    if k == "bits": return "M3 phase-1 bits result"
    if k == "corr":
        s, b, c = t["id"].split(":")[1:]
        right = c == b[1] + b[0]
        gen = t.get("oracleFidelity") is not None and not s in ("zero", "plus", "phase")
        return f"M3 dry run {'RIGHT' if right else 'WRONG'} choice, {'generic' if gen else 'named non-generic'} state{', bits 00' if right and b=='00' else ''}"
    return "M3 COMMIT (story token)"
g = collections.OrderedDict()
for t in T: g.setdefault(step(t), []).append(t)
cols = [("asBuilt", "gameplay as built (v1)"), ("onV2", "gameplay on main v2"), ("onV2Shim", "on v2 + names-only shim")]
rows = []
for s, ts in g.items():
    exp = collections.Counter(t["expected"] or "none" for t in ts).most_common(1)[0][0]
    cells = []
    for k, _ in cols:
        ok = sum(t[k]["verdict"] == "PASS" for t in ts); bad = sum(t[k]["verdict"].startswith("FAIL") for t in ts)
        un = len(ts) - ok - bad
        colr = "#cfe8cf" if bad == 0 else "#f3c4c4"
        cells.append(f"<td style='background:{colr}'>{ok}/{len(ts)} match{'' if not un else f', {un} unsettled'}</td>")
    rows.append(f"<tr><td>{s}</td><td>{exp}</td>{''.join(cells)}</tr>")
plays = json.load(open(OUT / "playthroughs.json"))
html = f"""<html><body style='font:14px -apple-system,Helvetica;padding:16px;width:1180px'>
<h3>Real Qiskit engine (quantum@d9b42d0) → gameplay quest machine (gameplay@c49a922): rows matching the docs</h3>
<table border=1 cellpadding=5 style='border-collapse:collapse'><tr><th>step</th><th>docs expect</th>{''.join(f'<th>{h}</th>' for _, h in cols)}</tr>{''.join(rows)}</table>
<p>Full playthrough BOOT→CREDITS on real results: {' · '.join(f'<b>{k}</b>: {v["reached"]} (commit {v["commit"]})' for k, v in plays.items())}</p>
<p>Source: evidence/gameplay/real-engine-seam/out/table.jsonl (seam.mjs). Green = no row disagrees with the docs.</p></body></html>"""
(OUT / "matrix.html").write_text(html)
chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
png = sys.argv[1] if len(sys.argv) > 1 else str(OUT / "matrix.png")
subprocess.run([chrome, "--headless", "--disable-gpu", f"--screenshot={png}", "--window-size=1220,640", f"file://{OUT / 'matrix.html'}"], check=True, capture_output=True)
print(png)
