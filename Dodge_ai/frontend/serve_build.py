from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os


BUILD_DIR = Path(__file__).resolve().parent / "build"
PORT = int(os.environ.get("PORT", "3000"))


class SpaHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BUILD_DIR), **kwargs)

    def do_GET(self):
        requested = self.translate_path(self.path)
        if self.path.startswith("/api/") or self.path.startswith("/sockjs-node"):
            self.send_error(404, "Not found")
            return

        if self.path in ("/", ""):
            self.path = "/index.html"
        elif not Path(requested).exists():
            self.path = "/index.html"

        return super().do_GET()


if __name__ == "__main__":
    if not BUILD_DIR.exists():
        raise SystemExit("Frontend build directory not found. Run `npm run build` first.")

    server = ThreadingHTTPServer(("0.0.0.0", PORT), SpaHandler)
    print(f"Serving frontend build from {BUILD_DIR} at http://localhost:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
