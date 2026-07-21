"""Static file server WITH HTTP Range support, for watching renders in-app.

Why this exists: Python's stock `http.server` ignores the `Range` header and always
replies 200 with the whole file. A <video> element cannot seek without 206 partial
responses — assigning `currentTime` silently reverts to 0, so the scrubber looks
broken even though the player UI is fine. This serves 206 properly.

Usage: python serve-renders.py [port] [directory]
"""
import os
import re
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
from functools import partial

CHUNK = 64 * 1024


class RangeHandler(SimpleHTTPRequestHandler):
    def do_GET(self):  # noqa: N802
        rng = self.headers.get("Range")
        path = self.translate_path(self.path)

        if not rng or not os.path.isfile(path):
            return super().do_GET()

        size = os.path.getsize(path)
        m = re.match(r"bytes=(\d*)-(\d*)", rng.strip())
        if not m:
            return super().do_GET()

        start = int(m.group(1)) if m.group(1) else 0
        end = int(m.group(2)) if m.group(2) else size - 1
        end = min(end, size - 1)

        if start > end or start >= size:
            self.send_response(416)
            self.send_header("Content-Range", f"bytes */{size}")
            self.end_headers()
            return

        length = end - start + 1
        self.send_response(206)  # end_headers() adds Accept-Ranges
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(length))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()

        with open(path, "rb") as f:
            f.seek(start)
            remaining = length
            while remaining > 0:
                chunk = f.read(min(CHUNK, remaining))
                if not chunk:
                    break
                try:
                    self.wfile.write(chunk)
                except (BrokenPipeError, ConnectionResetError):
                    return  # browser aborted the range (normal while scrubbing)
                remaining -= len(chunk)

    def end_headers(self):
        # Advertise range support on plain 200s too, so the player knows it can seek.
        if not getattr(self, "_ar_sent", False):
            self._ar_sent = True
            self.send_header("Accept-Ranges", "bytes")
        super().end_headers()

    def send_response(self, *a, **kw):
        self._ar_sent = False
        super().send_response(*a, **kw)

    def log_message(self, *a):
        pass  # quiet


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5174
    directory = sys.argv[2] if len(sys.argv) > 2 else "out"
    handler = partial(RangeHandler, directory=directory)
    print(f"renders: http://localhost:{port}/watch.html  (serving {directory}, Range enabled)")
    HTTPServer(("127.0.0.1", port), handler).serve_forever()
