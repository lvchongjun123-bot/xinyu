"""Flask 应用工厂"""

import os

from flask import Flask

from server.config import CORS_ORIGINS
from server.db import ensure_tables


def create_app():
    app = Flask(__name__)
    app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # 5 MB

    _db_ready = False  # set True after ensure_tables succeeds

    # ── CORS ──────────────────────────────────────────
    @app.after_request
    def add_cors(response):
        origin = request_origin()
        if origin in CORS_ORIGINS or not origin:
            response.headers["Access-Control-Allow-Origin"] = origin or "*"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            response.headers["Access-Control-Max-Age"] = "86400"
        return response

    def request_origin():
        from flask import request as _req
        return _req.headers.get("Origin", "")

    def origin_allowed():
        origin = request_origin()
        return origin in CORS_ORIGINS or not origin

    # ── OPTIONS 预检请求 ─────────────────────────────
    @app.before_request
    def handle_options():
        from flask import request as _req

        if _req.method == "OPTIONS":
            if not origin_allowed():
                from flask import make_response
                return make_response(), 204
            origin = request_origin()
            from flask import make_response

            resp = make_response()
            resp.headers["Access-Control-Allow-Origin"] = origin or "*"
            resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
            resp.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            resp.headers["Access-Control-Max-Age"] = "86400"
            return resp, 204

    # ── 注册蓝图 ──────────────────────────────────────
    from server.routes_auth import auth_bp
    from server.routes_study import study_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(study_bp)

    # ── 健康检查 ──────────────────────────────────────
    @app.route("/api/health")
    def health():
        db_ok = False
        if _db_ready:
            try:
                from server.db import get_db
                conn = get_db()
                conn.ping()
                conn.close()
                db_ok = True
            except Exception:
                pass
        return {
            "ok": db_ok,
            "service": "english-vocab-api",
            "version": "1.0.0",
            "database": "connected" if db_ok else "disconnected"
        }

    # ── 错误处理器（全部返回 JSON） ────────────────────
    from server.respond import fail

    @app.errorhandler(404)
    def not_found(_e):
        return fail("接口不存在", code="NOT_FOUND", http_status=404)

    @app.errorhandler(405)
    def method_not_allowed(_e):
        return fail("方法不允许", code="METHOD_NOT_ALLOWED", http_status=405)

    @app.errorhandler(413)
    def too_large(_e):
        return fail("请求体过大", code="PAYLOAD_TOO_LARGE", http_status=413)

    @app.errorhandler(415)
    def unsupported_media(_e):
        return fail("请求体需为 JSON 格式", code="UNSUPPORTED_MEDIA", http_status=415)

    @app.errorhandler(500)
    def server_error(e):
        import traceback
        traceback.print_exc()
        return fail("服务器内部错误", code="SERVER_ERROR", http_status=500)

    # ── 建表 ──────────────────────────────────────────
    with app.app_context():
        try:
            ensure_tables()
            print("[OK] 数据库表已就绪")
            _db_ready = True
        except Exception as e:
            print(f"[WARN] 建表失败: {e}（MySQL 可能未启动）")
            _db_ready = False

    return app
