"""统一 API 响应格式"""

from flask import jsonify


def ok(data=None, **kwargs):
    """成功响应
    data=None  → {"ok": true}
    data={...} → {"ok": true, "data": {...}}
    """
    body = {"ok": True}
    if data is not None:
        body["data"] = data
    body.update(kwargs)
    return jsonify(body)


def fail(error, code=None, http_status=400):
    """错误响应"""
    body = {"ok": False, "error": error}
    if code:
        body["code"] = code
    return jsonify(body), http_status


def created(item):
    """201 Created"""
    return jsonify({"ok": True, "data": item}), 201
