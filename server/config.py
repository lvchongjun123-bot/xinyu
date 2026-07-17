"""服务端配置"""

import os

# 项目根目录
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# MySQL 连接参数
DB_CONFIG = {
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "database": "personal",
    "charset": "utf8mb4",
    "use_pure": True,
    "collation": "utf8mb4_unicode_ci",
}

# JWT 密钥（生产环境应换成随机字符串）
JWT_SECRET = os.environ.get("VOCAB_JWT_SECRET", "")
JWT_EXPIRY_HOURS = 168  # 7 天

# CORS 允许的前端源
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]
# 生产域名通过环境变量注入
_extra = os.environ.get("CORS_EXTRA_ORIGIN", "").strip()
if _extra:
    CORS_ORIGINS.append(_extra)
