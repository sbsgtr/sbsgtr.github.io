#!/usr/bin/env python3
"""
NEXWAVE Development Server
==========================
Starts a local HTTP server for serving the NEXWAVE static site.
Features:
  - Static file serving with clean MIME types
  - Live reload via injected script (no browser extension needed)
  - Auto-opens browser
  - SPA fallback routing for /pages/ paths
  - Mobile network access (serves on 0.0.0.0)

Usage:
  python dev_server.py          # Default port 5500
  python dev_server.py 8000     # Custom port
  python dev_server.py --no-open  # Don't open browser
"""

import http.server
import socketserver
import os
import webbrowser
import sys
import threading
import time
import mimetypes
import io

# ── Configuration ──
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
DEFAULT_PORT = 5500

# Directories to skip during file-change scanning (large vendored dirs)
SKIP_DIRS = {'node_modules', '__pycache__', '.git', 'fontawesome-free-7.2.0-web'}

LIVERELOAD_SCRIPT = """
<script>
(function() {
  // Live reload — polls the server for changes every 2s
  var lastMod = null;
  function checkReload() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/__livereload_ping?_=' + Date.now(), true);
    xhr.onload = function() {
      var ts = xhr.getResponseHeader('X-Last-Modified');
      if (lastMod && ts && ts !== lastMod) {
        console.log('[NEXWAVE] File change detected — reloading...');
        window.location.reload();
      }
      lastMod = ts || lastMod;
    };
    xhr.send();
  }
  setInterval(checkReload, 3000);
})();
</script>
"""

# ── Track the most recent file modification ──
_last_modified = None
_last_mod_lock = threading.Lock()


def get_last_modified():
    """Scan project files and return the latest modification timestamp."""
    latest = 0.0
    for root, dirs, files in os.walk(PROJECT_ROOT):
        # Skip hidden directories and large vendored dirs
        dirs[:] = [d for d in dirs if not d.startswith('.') and d not in SKIP_DIRS]
        for f in files:
            if f.endswith(('.pyc', '.log')):
                continue
            fp = os.path.join(root, f)
            try:
                mtime = os.path.getmtime(fp)
                if mtime > latest:
                    latest = mtime
            except OSError:
                pass
    return str(latest)


def scan_for_changes():
    """Periodically scan for file changes and update global timestamp."""
    global _last_modified
    while True:
        ts = get_last_modified()
        with _last_mod_lock:
            _last_modified = ts
        time.sleep(3.0)


# ── Custom handler ──
class NEXWAVEHandler(http.server.SimpleHTTPRequestHandler):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PROJECT_ROOT, **kwargs)

    def do_GET(self):
        # Live reload ping endpoint
        if self.path.startswith('/__livereload_ping'):
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.send_header('X-Last-Modified', _last_modified or '')
            self.send_header('Cache-Control', 'no-cache')
            self.end_headers()
            self.wfile.write(b'ok')
            return

        # Normal file serving
        super().do_GET()

    def send_head(self):
        path = self.translate_path(self.path)

        # If the exact file exists, serve it
        if os.path.isfile(path):
            return self._serve_file(path)

        # SPA fallback: if path looks like a page route, try the .html version
        if not os.path.splitext(self.path)[1]:  # no extension
            html_path = path + '.html'
            if os.path.isfile(html_path):
                self.path += '.html'
                return self._serve_file(html_path)

        # Fallback to index.html for unknown routes
        index_path = os.path.join(PROJECT_ROOT, 'index.html')
        if os.path.isfile(index_path):
            self.path = '/index.html'
            return self._serve_file(index_path)

        return super().send_head()

    def _serve_file(self, path):
        content_type = mimetypes.guess_type(path)[0] or 'application/octet-stream'
        try:
            with open(path, 'rb') as f:
                data = f.read()

            # Inject live reload into HTML files
            if content_type == 'text/html':
                data = data.replace(b'</body>', LIVERELOAD_SCRIPT.encode() + b'</body>')

            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            # Return a BytesIO so that SimpleHTTPRequestHandler.copyfile() can .read() it
            return io.BytesIO(data)
        except OSError:
            return super().send_head()

    def log_message(self, format, *args):
        """Clean logging output."""
        status = str(args[1]) if len(args) > 1 else '?'
        method = args[0] if args else '?'
        path = self.path
        if path.startswith('/__livereload'):
            return  # Don't log livereload pings
        icon = '✓' if status.startswith('2') else ('⚠' if status.startswith('3') else '✗')
        print(f"  {icon}  {method} {path} → {status}")


def get_local_ip():
    """Try to get the local network IP for sharing the server on mobile."""
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else DEFAULT_PORT
    no_open = '--no-open' in sys.argv

    # Start file watcher
    watcher = threading.Thread(target=scan_for_changes, daemon=True)
    watcher.start()
    time.sleep(0.1)  # Let it get initial scan

    local_ip = get_local_ip()

    print()
    print("  +----------------------------------------------------+")
    print("  |        NEXWAVE Development Server                 |")
    print("  +----------------------------------------------------+")
    print(f"  |  Local:   http://localhost:{port}                   ")
    print(f"  |  Network: http://{local_ip}:{port}                 ")
    print(f"  |  Root:    {PROJECT_ROOT}")
    print("  +----------------------------------------------------+")
    print("  |  Pages:                                             ")
    print(f"  |  [1] Home    http://localhost:{port}/             ")
    print(f"  |  [2] Login   http://localhost:{port}/pages/login.html")
    print(f"  |  [3] ERP     http://localhost:{port}/erp/corporate.html")
    print(f"  |  [4] Verify  http://localhost:{port}/pages/verify.html")
    print("  +----------------------------------------------------+")
    print("  |  Live reload active  |  Ctrl+C to stop             |")
    print("  +----------------------------------------------------+")
    print()

    # Open browser
    if not no_open:
        webbrowser.open(f'http://localhost:{port}')

    # Start server with address reuse to prevent "Address in use" on restart
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("0.0.0.0", port), NEXWAVEHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n  Server stopped.\n")
            httpd.shutdown()


if __name__ == '__main__':
    main()
