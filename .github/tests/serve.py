# 손안의도구 자동 검사용 로컬 서버: 없는 주소는 404.html을 404로 돌려줘요 (GitHub Pages와 같게)
# 실행: python3 .github/tests/serve.py .   → http://localhost:8765
import http.server, os, sys
ROOT = sys.argv[1]
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(self, *a): pass
    def send_error(self, code, message=None, explain=None):
        if code == 404:
            body = open(os.path.join(ROOT, '404.html'), 'rb').read()
            self.send_response(404); self.send_header('Content-Type', 'text/html; charset=utf-8'); self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body); return
        super().send_error(code, message, explain)
http.server.ThreadingHTTPServer(('127.0.0.1', 8765), H).serve_forever()
