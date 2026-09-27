"""Static file server for local viewing that disables browser caching, so edits to the
JavaScript modules in src/ are always picked up on reload.

    uv run --no-project python serve.py [port]
"""

import http.server
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    print(f"Serving on http://localhost:{port}")
    http.server.ThreadingHTTPServer(("127.0.0.1", port), NoCacheHandler).serve_forever()
