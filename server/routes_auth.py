"""认证相关路由"""

import re
import time
import datetime

import bcrypt
import jwt
from flask import Blueprint, request

from server.config import JWT_SECRET, JWT_EXPIRY_HOURS
from server.db import query, insert_one, execute, get_db
from server.respond import ok, fail, created
from server.middleware import require_auth

auth_bp = Blueprint("auth", __name__)

# 用户名规则：2-20 字符，字母/数字/中文/下划线
_USERNAME_RE = re.compile(r"^[\w一-鿿]{2,20}$")

# 简单内存限流器
_rate_store = {}  # { "login:127.0.0.1": [t1, t2, ...] }

def _check_rate(key, max_req, window_sec):
    now = time.time()
    bucket = _rate_store.get(key, [])
    bucket = [t for t in bucket if now - t < window_sec]
    if len(bucket) >= max_req:
        return False
    bucket.append(now)
    _rate_store[key] = bucket
    return True

def _rate_limit(action_key, max_req=5, window_sec=60):
    ip = request.remote_addr or "127.0.0.1"
    return _check_rate(f"{action_key}:{ip}", max_req, window_sec)


def _hash_pw(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _check_pw(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def _make_token(user_id: int, username: str) -> str:
    payload = {
        "user_id": user_id,
        "username": username,
        "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=JWT_EXPIRY_HOURS),
        "iat": datetime.datetime.now(datetime.timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


# ── POST /api/auth/register ──────────────────────────

@auth_bp.route("/api/auth/register", methods=["POST"])
def register():
    if not _rate_limit("register", max_req=3, window_sec=3600):
        return fail("注册过于频繁，请稍后再试", code="RATE_LIMITED", http_status=429)

    data = request.get_json(silent=True)
    if data is None:
        return fail("请求体需为 JSON 格式", code="BAD_JSON", http_status=415)
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()

    # 校验
    if not username or not password:
        return fail("用户名和密码不能为空")
    if not _USERNAME_RE.match(username):
        return fail("用户名需 2-20 位，支持字母、数字、中文、下划线")
    if len(password) < 8:
        return fail("密码至少 8 位")
    if len(password) > 128:
        return fail("密码不能超过 128 位")

    # 创建用户 + 默认设置（单事务）
    conn = get_db()
    try:
        conn.start_transaction()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO vocab_users (username, password_hash) VALUES (%s, %s)",
            (username, _hash_pw(password)),
        )
        user_id = cursor.lastrowid
        cursor.execute(
            "INSERT INTO vocab_settings (user_id) VALUES (%s)",
            (user_id,),
        )
        conn.commit()
    except Exception as e:
        conn.rollback()
        if "Duplicate entry" in str(e) or getattr(e, "errno", 0) == 1062:
            return fail("用户名已被注册", code="USERNAME_TAKEN", http_status=409)
        raise
    finally:
        conn.close()

    token = _make_token(user_id, username)
    return created({"id": user_id, "username": username, "token": token})


# ── POST /api/auth/login ─────────────────────────────

@auth_bp.route("/api/auth/login", methods=["POST"])
def login():
    if not _rate_limit("login", max_req=5, window_sec=60):
        return fail("登录过于频繁，请稍后再试", code="RATE_LIMITED", http_status=429)

    data = request.get_json(silent=True)
    if data is None:
        return fail("请求体需为 JSON 格式", code="BAD_JSON", http_status=415)
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()

    if not username or not password:
        return fail("用户名和密码不能为空")

    user = query(
        "SELECT id, username, password_hash, avatar FROM vocab_users WHERE username = %s",
        (username,),
    )
    if not user:
        # 防时序攻击：用户名不存在也跑一次 hash 比较
        _check_pw(password, "$2b$12$" + "0" * 53)
        return fail("用户名或密码错误", code="BAD_CREDENTIALS", http_status=401)

    u = user[0]
    if not _check_pw(password, u["password_hash"]):
        return fail("用户名或密码错误", code="BAD_CREDENTIALS", http_status=401)

    token = _make_token(u["id"], u["username"])
    return ok({
        "id": u["id"],
        "username": u["username"],
        "avatar": u["avatar"] or "",
        "token": token,
    })


# ── GET /api/auth/profile ────────────────────────────

@auth_bp.route("/api/auth/profile", methods=["GET"])
@require_auth
def get_profile():
    user = query(
        "SELECT id, username, avatar, created_at FROM vocab_users WHERE id = %s",
        (request.user_id,),
    )
    if not user:
        return fail("用户不存在", http_status=404)

    u = user[0]
    settings = query(
        "SELECT daily_quota, active_book, dark_mode FROM vocab_settings WHERE user_id = %s",
        (request.user_id,),
    )
    s = settings[0] if settings else {}

    return ok({
        "id": u["id"],
        "username": u["username"],
        "avatar": u["avatar"] or "",
        "createdAt": u["created_at"].isoformat() if u["created_at"] else "",
        "settings": {
            "dailyQuota": s.get("daily_quota", 20),
            "activeBook": s.get("active_book", "gaokao"),
            "darkMode": bool(s.get("dark_mode", 0)),
        },
    })


# ── PUT /api/auth/profile ────────────────────────────

@auth_bp.route("/api/auth/profile", methods=["PUT"])
@require_auth
def update_profile():
    data = request.get_json(silent=True)
    if data is None:
        return fail("请求体需为 JSON 格式", code="BAD_JSON", http_status=415)

    # 更新用户名
    if "username" in data:
        username = data["username"].strip()
        if not _USERNAME_RE.match(username):
            return fail("用户名需 2-20 位，支持字母、数字、中文、下划线")
        existing = query(
            "SELECT id FROM vocab_users WHERE username = %s AND id != %s",
            (username, request.user_id),
        )
        if existing:
            return fail("用户名已被占用", code="USERNAME_TAKEN", http_status=409)
        execute(
            "UPDATE vocab_users SET username = %s WHERE id = %s",
            (username, request.user_id),
        )

    # 更新头像
    if "avatar" in data:
        avatar = data["avatar"]
        if len(avatar) > 200 * 1024:
            return fail("头像数据过大", code="AVATAR_TOO_LARGE", http_status=413)
        execute(
            "UPDATE vocab_users SET avatar = %s WHERE id = %s",
            (avatar, request.user_id),
        )

    return ok({"message": "更新成功"})
