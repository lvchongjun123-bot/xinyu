"""学习数据同步路由"""

from flask import Blueprint, request

from server.db import query, execute, get_db
from server.respond import ok, fail
from server.middleware import require_auth

study_bp = Blueprint("study", __name__)


# ── GET /api/study/plan ──────────────────────────────

@study_bp.route("/api/study/plan", methods=["GET"])
@require_auth
def get_plan():
    """获取用户的学习计划数据"""
    rows = query(
        "SELECT book_id, word_id, first_learned, last_reviewed, review_count, next_review "
        "FROM vocab_study_plan WHERE user_id = %s",
        (request.user_id,),
    )

    # 转成前端 useStudyPlan 同款数据结构
    plan = {}
    for r in rows:
        book = r["book_id"]
        if book not in plan:
            plan[book] = {"words": {}}
        plan[book]["words"][str(r["word_id"])] = {
            "firstLearned": r["first_learned"].isoformat() if r["first_learned"] else None,
            "lastReviewed": r["last_reviewed"].isoformat() if r["last_reviewed"] else None,
            "reviewCount": r["review_count"],
            "nextReview": r["next_review"].isoformat() if r["next_review"] else None,
        }

    # 合并设置
    settings = query(
        "SELECT daily_quota, active_book, streak, last_study_date, dark_mode "
        "FROM vocab_settings WHERE user_id = %s",
        (request.user_id,),
    )
    if settings:
        s = settings[0]
        for book in plan:
            plan[book]["dailyQuota"] = s["daily_quota"]
            plan[book]["streak"] = s.get("streak", 0)
            plan[book]["lastStudyDate"] = (
                s["last_study_date"].isoformat()
                if s.get("last_study_date")
                else ""
            )

    return ok(plan)


# ── PUT /api/study/plan ──────────────────────────────

@study_bp.route("/api/study/plan", methods=["PUT"])
@require_auth
def sync_plan():
    """批量同步学习计划（前端全量推送，单事务）"""
    data = request.get_json(silent=True)
    if data is None:
        return fail("请求体需为 JSON 格式", code="BAD_JSON", http_status=415)
    plan_data = data.get("plan", {})

    conn = get_db()
    try:
        conn.start_transaction()
        cursor = conn.cursor()

        for book_id, book_data in plan_data.items():
            cursor.execute(
                """INSERT INTO vocab_settings (user_id, daily_quota, active_book, streak, last_study_date)
                   VALUES (%s, %s, %s, %s, %s)
                   ON DUPLICATE KEY UPDATE
                   daily_quota = VALUES(daily_quota),
                   streak = VALUES(streak),
                   last_study_date = VALUES(last_study_date)""",
                (
                    request.user_id,
                    book_data.get("dailyQuota", 20),
                    book_id,
                    book_data.get("streak", 0),
                    book_data.get("lastStudyDate") or None,
                ),
            )

            words = book_data.get("words", {})
            for word_id, record in words.items():
                try:
                    wid = int(word_id)
                except (ValueError, TypeError):
                    conn.rollback()
                    conn.close()
                    return fail("无效的 word_id", code="BAD_WORD_ID", http_status=400)
                cursor.execute(
                    """INSERT INTO vocab_study_plan
                       (user_id, book_id, word_id, first_learned, last_reviewed, review_count, next_review)
                       VALUES (%s, %s, %s, %s, %s, %s, %s)
                       ON DUPLICATE KEY UPDATE
                       first_learned = VALUES(first_learned),
                       last_reviewed = VALUES(last_reviewed),
                       review_count = VALUES(review_count),
                       next_review = VALUES(next_review)""",
                    (
                        request.user_id,
                        book_id,
                        wid,
                        record.get("firstLearned") or None,
                        record.get("lastReviewed") or None,
                        record.get("reviewCount", 0),
                        record.get("nextReview") or None,
                    ),
                )

        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    return ok({"message": "同步成功"})


# ── GET /api/study/progress ──────────────────────────

@study_bp.route("/api/study/progress", methods=["GET"])
@require_auth
def get_progress():
    """获取用户掌握进度（返回 mastered word IDs 集合）"""
    book_id = request.args.get("bookId", "")
    if not book_id:
        return fail("缺少 bookId 参数")

    rows = query(
        "SELECT DISTINCT word_id FROM vocab_study_plan "
        "WHERE user_id = %s AND book_id = %s AND review_count >= 1",
        (request.user_id, book_id),
    )
    return ok([r["word_id"] for r in rows])


# ── PUT /api/study/progress ──────────────────────────

@study_bp.route("/api/study/progress", methods=["PUT"])
@require_auth
def sync_progress():
    """标记单词为已掌握（批量，单事务）"""
    data = request.get_json(silent=True)
    if data is None:
        return fail("请求体需为 JSON 格式", code="BAD_JSON", http_status=415)
    book_id = data.get("bookId", "")
    word_ids = data.get("wordIds", [])

    if not book_id:
        return fail("缺少 bookId 参数")
    if not isinstance(word_ids, list) or not word_ids:
        return ok({"synced": 0})

    # 类型守卫
    safe_ids = []
    for wid in word_ids:
        try:
            safe_ids.append(int(wid))
        except (ValueError, TypeError):
            return fail("无效的 word_id", code="BAD_WORD_ID", http_status=400)

    from datetime import date
    today = date.today().isoformat()

    # 批量查询已存在的记录
    placeholders = ",".join(["%s"] * len(safe_ids))
    existing_rows = query(
        f"SELECT word_id FROM vocab_study_plan "
        f"WHERE user_id = %s AND book_id = %s AND word_id IN ({placeholders})",
        (request.user_id, book_id, *safe_ids),
    )
    existing_set = {r["word_id"] for r in existing_rows}

    conn = get_db()
    try:
        conn.start_transaction()
        cursor = conn.cursor()

        for wid in safe_ids:
            if wid in existing_set:
                cursor.execute(
                    "UPDATE vocab_study_plan SET review_count = review_count + 1, "
                    "last_reviewed = %s WHERE user_id = %s AND book_id = %s AND word_id = %s",
                    (today, request.user_id, book_id, wid),
                )
            else:
                cursor.execute(
                    "INSERT INTO vocab_study_plan "
                    "(user_id, book_id, word_id, first_learned, last_reviewed, review_count, next_review) "
                    "VALUES (%s, %s, %s, %s, %s, 1, %s)",
                    (request.user_id, book_id, wid, today, today, today),
                )

        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    return ok({"synced": len(safe_ids)})
