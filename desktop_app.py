"""英语词汇 — Desktop launcher (pywebview native window, no browser).

Double-click shortcut → this script runs:
  1. Single-instance lock (prevents double launch)
  2. Show window IMMEDIATELY with loading screen (no blank wait)
  3. Start Flask backend + HTTP static server in parallel background threads
  4. Navigate to Vue app URL once ready
  5. Close window → stop Flask → stop HTTP server

Requirements: pywebview (pip install pywebview), WebView2 runtime (Win 11 preinstalled)
"""

import subprocess
import sys
import os
import time
import ctypes
import ctypes.wintypes
import threading
import http.server
import mimetypes
import socketserver

# Ensure WebView2 accepts ES module scripts
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('application/javascript', '.mjs')
mimetypes.add_type('text/css', '.css')

os.chdir(os.path.dirname(os.path.abspath(__file__)))

FLASK_PORT = 5002
STATIC_PORT = 5178
MUTEX_NAME = r"Global\YuHaiQiuSuo_SingleInstance"

flask: subprocess.Popen | None = None
static_server: socketserver.TCPServer | None = None
window = None  # set in main()


# ── helpers ────────────────────────────────────────────

def _alert(title, msg):
    ctypes.windll.user32.MessageBoxW(0, str(msg), str(title), 0x10)


# ── single-instance lock ──────────────────────────────

def _acquire_single_instance() -> bool:
    kernel32 = ctypes.windll.kernel32
    mutex = kernel32.CreateMutexW(None, False, MUTEX_NAME)
    err = kernel32.GetLastError()
    if err == 183:  # ERROR_ALREADY_EXISTS
        kernel32.CloseHandle(mutex)
        _alert("语海求索", "程序已在运行中，请查看任务栏。")
        return False
    return True


def _set_window_icon(hwnd):
    icon_path = os.path.join(os.path.dirname(__file__), "public", "icon.ico")
    if not os.path.isfile(icon_path):
        return
    user32 = ctypes.windll.user32
    # Load icon (16x16 for taskbar, 32x32 for title bar)
    for size, which in [(16, 0), (32, 1)]:
        hicon = user32.LoadImageW(0, icon_path, 1, size, size, 0x10)
        if hicon:
            user32.SendMessageW(hwnd, 0x0080, which, hicon)


def _find_pywebview_window():
    result = []
    WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.wintypes.BOOL, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)

    def enum_callback(hwnd, lparam):
        user32 = ctypes.windll.user32
        length = user32.GetWindowTextLengthW(hwnd)
        if length == 0:
            return True
        buf = ctypes.create_unicode_buffer(length + 1)
        user32.GetWindowTextW(hwnd, buf, length + 1)
        if "语海求索" in buf.value:
            result.append(hwnd)
            return False
        return True

    user32 = ctypes.windll.user32
    user32.EnumWindows(WNDENUMPROC(enum_callback), 0)
    return result[0] if result else 0


# ── health checks ──────────────────────────────────────

def _flask_is_alive() -> bool:
    import urllib.request
    try:
        urllib.request.urlopen(f"http://127.0.0.1:{FLASK_PORT}/api/health", timeout=1)
        return True
    except Exception:
        return False


def _static_is_alive() -> bool:
    import urllib.request
    try:
        urllib.request.urlopen(f"http://127.0.0.1:{STATIC_PORT}/", timeout=1)
        return True
    except Exception:
        return False


# ── lifecycle ─────────────────────────────────────────

def _kill_port(port: int):
    """Kill any process holding the given port (fixes ghost occupation)."""
    import subprocess as _sp
    try:
        result = _sp.run(
            ["netstat", "-ano"],
            capture_output=True, text=True, timeout=5,
        )
        for line in result.stdout.splitlines():
            if f":{port}" in line and "LISTENING" in line:
                parts = line.strip().split()
                pid = parts[-1]
                _sp.run(["taskkill", "/F", "/T", "/PID", pid], capture_output=True, timeout=5)
    except Exception:
        pass  # best-effort


def start_flask():
    global flask
    _kill_port(FLASK_PORT)
    env = os.environ.copy()
    env["FLASK_PORT"] = str(FLASK_PORT)
    # ponytail: script mode loads .env correctly; -m server.run does not
    flask = subprocess.Popen(
        [r".venv\Scripts\pythonw.exe", r"server\run.py"],
        env=env,
        creationflags=subprocess.CREATE_NO_WINDOW,
    )


def start_static_server():
    """Serve dist-desktop/ on STATIC_PORT via Python stdlib HTTP server."""
    global static_server
    dist_dir = os.path.join(os.path.dirname(__file__), "dist-desktop")
    os.makedirs(dist_dir, exist_ok=True)

    class QuietHandler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=dist_dir, **kwargs)
        def log_message(self, format, *args):
            pass  # suppress access logs

    class ReusableTCPServer(socketserver.TCPServer):
        allow_reuse_address = True

    try:
        static_server = ReusableTCPServer(("127.0.0.1", STATIC_PORT), QuietHandler)
    except OSError as e:
        print(f"[ERR] Cannot bind port {STATIC_PORT}: {e}", file=sys.stderr)
        _kill_port(STATIC_PORT)
        time.sleep(0.5)
        try:
            static_server = ReusableTCPServer(("127.0.0.1", STATIC_PORT), QuietHandler)
        except OSError:
            _alert("启动失败", f"端口 {STATIC_PORT} 被占用，请关闭占用程序后重试")
            sys.exit(1)

    threading.Thread(target=static_server.serve_forever, daemon=True).start()


def shutdown():
    global flask, static_server
    if flask and flask.poll() is None:
        pid = flask.pid
        # ponytail: /T kills entire process tree, not just parent pythonw.exe
        subprocess.run(["taskkill", "/F", "/T", "/PID", str(pid)],
                       capture_output=True, timeout=10)
    if static_server:
        static_server.shutdown()
        static_server.server_close()
    # 最后再扫一遍端口确保干净
    _kill_port(FLASK_PORT)


# ── Loading screen HTML ────────────────────────────────

LOADING_HTML = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="color-scheme" content="light dark">
<style>
:root {
    --bg: #f5f5f7; --text: #1d1d1f; --sub: #86868b;
    --accent: #3b82f6; --bar-bg: rgba(0,0,0,0.06);
}
@media (prefers-color-scheme: dark) {
    :root { --bg: #09090b; --text: #f5f5f7; --sub: #98989d; --bar-bg: rgba(255,255,255,0.08); }
}
*, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
body {
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", "Microsoft YaHei", sans-serif;
    display: flex; align-items: center; justify-content: center;
    height: 100vh; background: var(--bg);
    -webkit-font-smoothing: antialiased;
}
.loading-card { text-align: center; animation: fadeIn 0.5s cubic-bezier(0.16,1,0.3,1); }
@keyframes fadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
.logo-icon {
    width: 32px; height: 32px; color: var(--accent);
    margin: 0 auto 24px; display: block;
    animation: pulse 1.5s ease-in-out infinite;
}
@keyframes pulse { 0%,100% { transform:scale(1); opacity:1; } 50% { transform:scale(1.08); opacity:0.7; } }
h1 {
    font-size: 22px; font-weight: 680; letter-spacing: -0.02em;
    color: var(--text); margin-bottom: 8px;
}
.status {
    font-size: 14px; color: var(--sub); margin-bottom: 28px;
}
.progress {
    width: 200px; height: 3px; background: var(--bar-bg); border-radius: 2px;
    margin: 0 auto; overflow: hidden;
}
.progress-bar {
    height: 100%; width: 30%;
    background: var(--accent); border-radius: 2px;
    animation: shimmer 1.2s ease-in-out infinite;
}
@keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(430%); }
}
.error-msg { color: #ef4444; font-size: 13px; margin-top: 20px; display: none; }
</style>
</head>
<body>
<div class="loading-card">
    <svg class="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        <line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="14" y2="11"/>
    </svg>
    <h1>语海求索</h1>
    <div class="status" id="status">正在启动服务...</div>
    <div class="progress"><div class="progress-bar"></div></div>
    <div class="error-msg" id="error"></div>
</div>
<script>
var msgs = [
    "检查静态资源...",
    "启动 API 服务...",
    "加载界面...",
];
var i = 0;
function nextStep() {
    if (i < msgs.length) document.getElementById('status').textContent = msgs[i++];
}
nextStep();
window._nextStep = nextStep;
window._showError = function(msg) {
    document.getElementById('status').style.display = 'none';
    document.querySelector('.progress').style.display = 'none';
    document.getElementById('error').style.display = 'block';
    document.getElementById('error').textContent = msg;
};
</script>
</body>
</html>"""


# ── main ───────────────────────────────────────────────

def _start_services_and_navigate():
    global window

    # Step 1: Start Flask backend
    window.evaluate_js('_nextStep && _nextStep();')
    start_flask()

    deadline = time.time() + 15
    while time.time() < deadline:
        if _flask_is_alive():
            break
        time.sleep(0.3)
    else:
        window.evaluate_js(
            '_showError && _showError("API 服务启动超时\\n\\n请确认端口 ' +
            str(FLASK_PORT) + ' 是否被占用")'
        )
        return

    # Set window icon (polling, not blind sleep)
    def _set_icon_later():
        for _ in range(30):
            hwnd = _find_pywebview_window()
            if hwnd:
                _set_window_icon(hwnd)
                return
            time.sleep(0.1)
    threading.Thread(target=_set_icon_later, daemon=True).start()

    # Step 2: Start static file server
    window.evaluate_js('_nextStep && _nextStep();')
    start_static_server()

    deadline = time.time() + 5
    while time.time() < deadline:
        if _static_is_alive():
            break
        time.sleep(0.2)
    else:
        window.evaluate_js(
            '_showError && _showError("静态服务启动超时\\n\\n请确认 dist-desktop/ 目录存在\\n先运行 npm run build:desktop")'
        )
        return

    # Step 3: Navigate to app
    window.evaluate_js('_nextStep && _nextStep();')
    time.sleep(0.3)
    window.load_url(f"http://127.0.0.1:{STATIC_PORT}/?desktop=1")


def main():
    global window

    # ponytail: 启动前清理上次异常退出残留的端口占用
    _kill_port(FLASK_PORT)

    if not _acquire_single_instance():
        sys.exit(0)

    try:
        ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID("YuHaiQiuSuo.App")
    except Exception:
        pass

    import webview

    class Api:
        def toggle_fullscreen(self):
            window.toggle_fullscreen()

        def restart_flask(self):
            global flask
            if flask and flask.poll() is None:
                pid = flask.pid
                subprocess.run(
                    ["taskkill", "/F", "/T", "/PID", str(pid)],
                    capture_output=True, timeout=10,
                )
                try:
                    flask.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    pass
            deadline = time.time() + 10
            while time.time() < deadline:
                if not _flask_is_alive():
                    break
                time.sleep(0.5)
            start_flask()
            deadline = time.time() + 15
            while time.time() < deadline:
                if _flask_is_alive():
                    break
                time.sleep(0.3)
            window.evaluate_js('location.reload()')

    window = webview.create_window(
        title="语海求索",
        html=LOADING_HTML,
        maximized=True,
        resizable=True,
        min_size=(800, 600),
        js_api=Api(),
    )

    # Start icon setter immediately — runs in parallel with service startup
    def _set_icon_early():
        for _ in range(30):
            hwnd = _find_pywebview_window()
            if hwnd:
                _set_window_icon(hwnd)
                return
            time.sleep(0.1)
    threading.Thread(target=_set_icon_early, daemon=True).start()

    threading.Thread(target=_start_services_and_navigate, daemon=True).start()

    webview.start(gui='edgechromium', private_mode=False)

    shutdown()


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        _alert("语海求索 — 启动失败", f"程序发生未预期的错误：\n\n{str(e)[:300]}")
        sys.exit(1)
