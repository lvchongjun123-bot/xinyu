"""JWT 认证中间件"""

import jwt
from functools import wraps
from flask import request

from server.config import JWT_SECRET
from server.respond import fail


def require_auth(f):
    """装饰器：要求请求头带 Authorization: Bearer <token>"""

    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return fail("未登录，请先登录", code="UNAUTHORIZED", http_status=401)

        token = auth_header[7:]  # 去掉 "Bearer " 前缀
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            request.user_id = payload["user_id"]
            request.username = payload["username"]
        except jwt.ExpiredSignatureError:
            return fail("登录已过期，请重新登录", code="TOKEN_EXPIRED", http_status=401)
        except jwt.InvalidTokenError:
            return fail("无效的登录凭证", code="INVALID_TOKEN", http_status=401)

        return f(*args, **kwargs)

    return decorated
