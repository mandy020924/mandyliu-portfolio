"""The local preview server: python3 tools/serve.py [port]. Plain static files from the site root, served with Cache-Control: no-store, so a
browser (Safari above all) never shows a page or stylesheet from an earlier visit while the files are being edited. Production hosting sets its
own caching; this only matters at localhost."""
import http.server, sys, os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate'); self.send_header('Pragma', 'no-cache'); self.send_header('Expires', '0')
        super().end_headers()
    def log_message(self, *a): pass
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
http.server.ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
