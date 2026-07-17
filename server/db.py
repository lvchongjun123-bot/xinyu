"""MySQL 连接池 + 查询辅助"""

import os
import json
import atexit
import datetime

import mysql.connector
from mysql.connector.pooling import MySQLConnectionPool

from server.config import DB_CONFIG, BASE_DIR

# ── 连接池（懒加载）─────────────────────────────────

_pool = None


def _read_password():
    """从 .env 文件或环境变量读取 MySQL 密码"""
    pwd = None

    # 1) 尝试从 .env 文件读取
    env_path = os.path.join(BASE_DIR, ".env")
    if os.path.isfile(env_path):
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("MYSQL_PWD="):
                        pwd = line.split("=", 1)[1].strip().strip('"').strip("'")
                        break
        except (FileNotFoundError, PermissionError):
            pass

    # 2) 回退：环境变量
    if not pwd:
        pwd = os.environ.get("MYSQL_PWD") or os.environ.get("MYSQL_PASSWORD")

    if not pwd:
        raise RuntimeError("请设置 MYSQL_PWD 环境变量 或 在 .env 中配置 MYSQL_PWD=xxx")
    return pwd


def _get_pool():
    """懒加载 MySQL 连接池"""
    global _pool
    if _pool is None:
        pwd = _read_password()
        _pool = MySQLConnectionPool(
            pool_name="vocab_pool",
            pool_size=5,
            pool_reset_session=True,
            connection_timeout=5,
            password=pwd,
            **DB_CONFIG,
        )
        atexit.register(lambda: _pool.close() if _pool else None)
    return _pool


def get_db():
    """获取一个 MySQL 连接。调用方必须 close() 归还。"""
    conn = _get_pool().get_connection()
    try:
        conn.ping(reconnect=True)
    except Exception:
        pass  # best-effort: let query fail with clear error if truly dead
    return conn


# ── 查询辅助 ──────────────────────────────────────

def query(sql, params=None):
    """执行 SELECT，返回 dict 列表"""
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(sql, params or ())
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()


def execute(sql, params=None):
    """执行 INSERT/UPDATE/DELETE 并 commit"""
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(sql, params or ())
        conn.commit()
    finally:
        cursor.close()
        conn.close()


def insert_one(sql, params=None):
    """执行 INSERT 并返回新行 ID"""
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(sql, params or ())
        conn.commit()
        return cursor.lastrowid
    finally:
        cursor.close()
        conn.close()


# ── 建表 ──────────────────────────────────────────

def ensure_tables():
    """创建本应用所需的数据库表（幂等）"""
    execute("""
        CREATE TABLE IF NOT EXISTS vocab_users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            avatar TEXT DEFAULT NULL COMMENT 'base64 data URL 或 emoji引用',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """)

    execute("""
        CREATE TABLE IF NOT EXISTS vocab_study_plan (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            book_id VARCHAR(20) NOT NULL,
            word_id INT NOT NULL,
            first_learned DATE DEFAULT NULL,
            last_reviewed DATE DEFAULT NULL,
            review_count INT DEFAULT 0,
            next_review DATE DEFAULT NULL,
            UNIQUE KEY uk_user_book_word (user_id, book_id, word_id),
            FOREIGN KEY (user_id) REFERENCES vocab_users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """)

    execute("""
        CREATE TABLE IF NOT EXISTS vocab_settings (
            user_id INT PRIMARY KEY,
            daily_quota INT DEFAULT 20,
            active_book VARCHAR(20) DEFAULT 'gaokao',
            dark_mode TINYINT(1) DEFAULT 0,
            streak INT DEFAULT 0,
            last_study_date DATE DEFAULT NULL,
            FOREIGN KEY (user_id) REFERENCES vocab_users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """)
