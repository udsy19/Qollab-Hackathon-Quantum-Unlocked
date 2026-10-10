"""Count `backend.run` call sites in a Qollab project tree, and a counting fake backend.

Static half:  python evidence/red-team/physics-oracle/backend_run_audit.py echo/
  exit 0 = at most one live call site · 1 = more than one · 2 = refused (no such dir / no files).
  A count of ONE site is necessary, not sufficient: one site inside a click handler still runs
  once per click. The runtime half (CountingBackend, or the JS shim in the README) settles that.

Detected: `backend.run(`, `backend["run"](`, `getattr(backend, "run")`, `<x>backend.run(` such as
`this.backend.run` / `selectedBackend.run`, aliases (`const b = backend` / `b = backend`) followed
by `b.run(`, and destructuring `{ run } = backend` / `{ run: r } = backend`. Comment lines are
listed separately and not counted.
"""
from __future__ import annotations

import pathlib
import re
import sys

EXTS = {".js", ".mjs", ".py", ".html"}
DIRECT = re.compile(r"""\b\w*backend\w*\s*(?:\.\s*run|\[\s*['"]run['"]\s*\])\s*\(""", re.I)
GETATTR = re.compile(r"""getattr\(\s*\w*backend\w*\s*,\s*['"]run['"]""", re.I)
ALIAS = re.compile(r"""(?:\b(?:const|let|var)\s+)?\b(\w+)\s*=\s*(?:globalThis\.|window\.|self\.)?backend\b(?!\s*[.\[(\w])""")
DESTRUCT = re.compile(r"""\{[^}]*\brun\b(?:\s*:\s*(\w+))?[^}]*\}\s*=\s*\w*backend\b""", re.I)


def _is_comment(line: str) -> bool:
    s = line.strip()
    return s.startswith(("//", "#", "*", "/*", "<!--"))


def scan(root: pathlib.Path) -> dict:
    files = [p for p in sorted(root.rglob("*")) if p.is_file() and p.suffix in EXTS]
    sites, comments, aliases = [], [], []
    for p in files:
        lines = p.read_text(errors="replace").splitlines()
        names = set()
        for ln in lines:
            if _is_comment(ln):
                continue
            for m in ALIAS.finditer(ln):
                names.add(m.group(1))
            for m in DESTRUCT.finditer(ln):
                names.add("__run__" if not m.group(1) else "__run__" + m.group(1))
        alias_re = [re.compile(rf"\b{re.escape(n)}\s*\.\s*run\s*\(") for n in names if not n.startswith("__run__")]
        bare = [n[len("__run__"):] or "run" for n in names if n.startswith("__run__")]
        bare_re = [re.compile(rf"(?<![.\w]){re.escape(b)}\s*\(") for b in bare]
        aliases += [f"{p}: {n}" for n in sorted(names)]
        for i, ln in enumerate(lines, 1):
            hit = DIRECT.search(ln) or GETATTR.search(ln) or any(r.search(ln) for r in alias_re) \
                or any(r.search(ln) for r in bare_re)
            if not hit:
                continue
            (comments if _is_comment(ln) else sites).append(f"{p}:{i}: {ln.strip()[:120]}")
    return {"files": len(files), "sites": sites, "comments": comments, "aliases": aliases}


class CountingBackend:
    """Inject in place of Qollab's `backend` when calling product Python in CPython. Mirrors the
    IonQ rule: the second `run` in one process raises, as Qollab stops the run."""

    def __init__(self, inner=None):
        self.calls, self.inner = [], inner

    def run(self, circuits, **kw):
        self.calls.append((circuits, kw))
        if len(self.calls) > 1:
            raise RuntimeError(f"second backend.run in one run (call #{len(self.calls)}) — IonQ allows one job per run")
        if self.inner is None:
            raise RuntimeError("CountingBackend has no inner backend; pass BasicSimulator() to get counts")
        return self.inner.run(circuits, **kw)


def main(argv: list[str]) -> int:
    root = pathlib.Path(argv[1] if len(argv) > 1 else "echo")
    if not root.is_dir():
        print(f"REFUSED: {root} is not a directory")
        return 2
    r = scan(root)
    if r["files"] == 0:
        print(f"REFUSED: no {sorted(EXTS)} files under {root}")
        return 2
    print(f"scanned {r['files']} files under {root}")
    print(f"live backend.run call sites: {len(r['sites'])}")
    for s in r["sites"]:
        print("  SITE    " + s)
    for s in r["comments"]:
        print("  comment " + s)
    for a in r["aliases"]:
        print("  alias   " + a)
    return 0 if len(r["sites"]) <= 1 else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
