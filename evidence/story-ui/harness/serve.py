"""Harness server for the story-ui terminals (local tooling, never shipped).

Serves the worktree like `python3 -m http.server`, except that echo/contracts.js, which is
platform-owned and not on this lane's base yet, is served from `git show <ref>:echo/contracts.js`
when the file is absent on disk. Nothing is copied into the tree, so there is no fork to drift.
Usage: python3 evidence/story-ui/harness/serve.py <port> [<git ref>]   (run from the worktree root)
"""
import http.server, os, subprocess, sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8761
REF = sys.argv[2] if len(sys.argv) > 2 else 'lane/platform/integration'


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_GET(self):
        path = self.path.split('?')[0]
        if path == '/echo/contracts.js' and not os.path.exists('echo/contracts.js'):
            body = subprocess.run(['git', 'show', f'{REF}:echo/contracts.js'], capture_output=True, check=True).stdout
            self.send_response(200)
            self.send_header('Content-Type', 'text/javascript')
            self.send_header('Content-Length', str(len(body)))
            self.send_header('X-Served-From', REF)
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()


http.server.ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
