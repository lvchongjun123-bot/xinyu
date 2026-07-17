"""后端启动入口"""

import os
import sys

# 确保项目根目录在 sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# ponytail: load .env manually — no extra dependency
_env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
if os.path.isfile(_env_path):
    with open(_env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                k = k.strip(); v = v.strip().strip('"').strip("'")
                if k not in os.environ:
                    os.environ[k] = v

from server import create_app

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("FLASK_PORT", 5002))
    debug = os.environ.get("FLASK_ENV", "development") != "production"
    print(f"\n  http://localhost:{port}  (debug={'on' if debug else 'off'})\n")
    app.run(host="127.0.0.1", port=port, debug=debug)
