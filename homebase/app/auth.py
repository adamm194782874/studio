"""Password hashing and the logged in user lookup."""
import hashlib
import hmac
import os

from fastapi import HTTPException, Request

from .db import get_db


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
    return f"scrypt${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _, salt_hex, digest_hex = stored.split("$")
    except ValueError:
        return False
    digest = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt_hex), n=2**14, r=8, p=1)
    return hmac.compare_digest(digest.hex(), digest_hex)


def user_count() -> int:
    with get_db() as db:
        return db.execute("SELECT COUNT(*) FROM users").fetchone()[0]


def household() -> list[dict]:
    """Everyone in the household, plus whether their Google account is linked."""
    with get_db() as db:
        rows = db.execute(
            "SELECT u.id, u.username, u.display_name, g.email AS google_email "
            "FROM users u LEFT JOIN google_tokens g ON g.user_id = u.id ORDER BY u.id"
        ).fetchall()
    return [dict(r) for r in rows]


def current_user(request: Request) -> dict:
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not logged in")
    with get_db() as db:
        row = db.execute(
            "SELECT id, username, display_name FROM users WHERE id = ?", (user_id,)
        ).fetchone()
    if not row:
        request.session.clear()
        raise HTTPException(status_code=401, detail="Not logged in")
    return dict(row)
