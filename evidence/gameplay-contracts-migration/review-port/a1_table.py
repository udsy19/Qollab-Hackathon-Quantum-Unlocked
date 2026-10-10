# PORT of evidence/gameplay-quest-review/a1_table.py: the doc parse is unchanged; the table is now
# read from echo/contracts.js (QUEST_STATE_LIST, TRANSITIONS) instead of echo/game/state.js.
import re, json, subprocess, sys
doc = open(sys.argv[1] + '/ECHO_MASTER_VISION.md', encoding='utf-8').read()
s91 = doc.split('## 9.1 Required states', 1)[1].split('```', 2)[1]
states = [l.strip() for l in s91.splitlines() if l.strip()]
s92 = doc.split('## 9.2 Type-safe-ish transition design', 1)[1].split('```', 2)[1]
body = s92.split('const transitions = {', 1)[1].split('\n};', 1)[0]
doc_edges = set()
for row in re.finditer(r"(\w+):\s*\{([^}]*)\}", body):
    for ev, to in re.findall(r"(\w+):\s*'(\w+)'", row.group(2)):
        doc_edges.add((row.group(1), ev, to))
js = "import('" + sys.argv[1] + "/echo/contracts.js').then(m=>console.log(JSON.stringify({s:m.QUEST_STATE_LIST,t:m.TRANSITIONS})))"
out = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', js]))
code_edges = {(f, e, t) for f, row in out['t'].items() for e, t in row.items()}
print('doc states', len(states), 'code states', len(out['s']), 'equal-ordered', states == out['s'])
print('doc edges', len(doc_edges), 'code edges', len(code_edges))
print('in doc not code:', sorted(doc_edges - code_edges))
print('in code not doc:', sorted(code_edges - doc_edges))
adj = {}
for f, e, t in code_edges: adj.setdefault(f, set()).add(t)
seen, q = {'BOOT'}, ['BOOT']
while q:
    s = q.pop()
    for n in adj.get(s, ()):
        if n not in seen: seen.add(n); q.append(n)
print('unreachable from BOOT:', sorted(set(out['s']) - seen))
print('states with no outgoing edge:', sorted(s for s in out['s'] if s not in adj))
print('targets not in state list:', sorted({t for _, _, t in code_edges} - set(out['s'])))
