from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os
import sys


ROOT = Path(__file__).resolve().parent
RUNTIME = ROOT / ".runtime"
PORT = int(os.environ.get("PROMPTWEAVER_PORT", "8765"))


class PromptWeaverHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".css": "text/css",
        ".js": "text/javascript",
        ".svg": "image/svg+xml",
        ".webmanifest": "application/manifest+json",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


def main():
    RUNTIME.mkdir(exist_ok=True)
    (RUNTIME / "server.pid").write_text(str(os.getpid()), encoding="ascii")

    log_file = open(RUNTIME / "server.log", "a", encoding="utf-8", buffering=1)
    sys.stdout = log_file
    sys.stderr = log_file

    handler = partial(PromptWeaverHandler, directory=str(ROOT))
    server = ThreadingHTTPServer(("0.0.0.0", PORT), handler)
    server.allow_reuse_address = True
    print(f"PromptWeaver server listening on 0.0.0.0:{PORT}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
