"""DEV-ONLY. The gameplay dev engine (dev/gameplay/dev_engine.py) plus one header, so the world can be
loaded inside <iframe sandbox="allow-scripts"> the way Qollab does. A sandboxed frame has an opaque
origin ("null"), so its module scripts and engine GETs are cross-origin requests; without
Access-Control-Allow-Origin they fail and nothing boots.

    python3 dev/gameplay/qollab-frame/server.py 8691
    → http://127.0.0.1:8691/dev/gameplay/qollab-frame/host.html (the frame itself loads from localhost:8691)
"""
import functools
import http.server
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
import dev_engine  # noqa: E402


class Handler(dev_engine.Handler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8691
    handler = functools.partial(Handler, directory=str(dev_engine.ROOT))
    with http.server.ThreadingHTTPServer(("127.0.0.1", port), handler) as srv:
        print(f"dev engine + static (CORS *) on http://127.0.0.1:{srv.server_address[1]}/", flush=True)
        srv.serve_forever()
