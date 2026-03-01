import contextlib
import socket
import sys
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

try:
    import webview
except ImportError:
    print("Missing dependency: pywebview")
    print("Run: pip install pywebview")
    sys.exit(1)


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        return


def resolve_web_root() -> Path:
    # When bundled by PyInstaller, static files are unpacked under _MEIPASS.
    if getattr(sys, "frozen", False):
        return Path(sys._MEIPASS)

    # In source mode, serve from repository root so ../savegame-editor.js works.
    return Path(__file__).resolve().parent.parent


def resolve_entry_path(root: Path) -> str:
    if getattr(sys, "frozen", False):
        return "/index.html"

    project_dir = Path(__file__).resolve().parent
    rel = project_dir.relative_to(root).as_posix()
    return f"/{rel}/index.html"


def pick_port(host: str, preferred_port: int, max_tries: int = 20) -> int:
    for offset in range(max_tries):
        port = preferred_port + offset
        with contextlib.closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            if sock.connect_ex((host, port)) != 0:
                return port
    raise RuntimeError("No available port found")


def run_server(server: ThreadingHTTPServer) -> None:
    server.serve_forever(poll_interval=0.2)


def main() -> None:
    host = "127.0.0.1"
    root = resolve_web_root()
    entry_path = resolve_entry_path(root)
    port = pick_port(host, preferred_port=5500)

    handler = lambda *args, **kwargs: QuietHandler(*args, directory=str(root), **kwargs)
    server = ThreadingHTTPServer((host, port), handler)
    server_thread = threading.Thread(target=run_server, args=(server,), daemon=True)
    server_thread.start()

    url = f"http://{host}:{port}{entry_path}"

    try:
        webview.create_window("Zelda BOTW Save Editor", url, width=1280, height=860)
        webview.start(debug=False)
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    main()
