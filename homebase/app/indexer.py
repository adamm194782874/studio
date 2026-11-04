"""Walks the NAS folders and keeps a full text search index in SQLite.

Every file is searchable by name and folder. Documents (PDF, Word, Excel, text)
are also searchable by what's inside them. Only new or changed files get
re-read, so after the first run it's quick.
"""
import logging
import os
import re
import threading
import time
from datetime import datetime

from . import config
from .db import get_db, set_meta, get_meta
from .extract import EXTRACTABLE, extract_text

log = logging.getLogger("homebase.indexer")

SKIP_DIRS = {
    "@eaDir", "#recycle", "#snapshot", "@tmp", "@sharebin", ".SynologyWorkingDirectory",
    "node_modules", ".git", "__pycache__",
}
STOPWORDS = {"the", "a", "an", "of", "for", "and", "or", "to", "in", "on", "my", "our", "file", "files", "find"}

_lock = threading.Lock()
status = {"running": False, "scanned": 0, "updated": 0, "removed": 0, "error": None}


def _allowed(path: str) -> bool:
    real = os.path.realpath(path)
    for root in config.NAS_ROOTS:
        root_real = os.path.realpath(root)
        if real == root_real or real.startswith(root_real + os.sep):
            return True
    return False


def run_index() -> dict:
    """Index everything under NAS_ROOTS. Safe to call while another run is going (it just skips)."""
    if not _lock.acquire(blocking=False):
        return {"skipped": "an index run is already in progress"}
    status.update(running=True, scanned=0, updated=0, removed=0, error=None)
    started = time.time()
    max_bytes = config.MAX_FILE_MB * 1024 * 1024
    try:
        with get_db() as db:
            existing = {
                r["path"]: (r["id"], r["mtime"], r["size"])
                for r in db.execute("SELECT id, path, mtime, size FROM files")
            }
            seen: set[str] = set()
            pending = 0
            for root in config.NAS_ROOTS:
                if not os.path.isdir(root):
                    log.warning("NAS root %s does not exist, skipping", root)
                    continue
                for dirpath, dirnames, filenames in os.walk(root):
                    dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".")]
                    for fn in filenames:
                        if fn.startswith(".") or fn.startswith("~$") or fn == "Thumbs.db":
                            continue
                        full = os.path.join(dirpath, fn)
                        try:
                            st = os.stat(full)
                        except OSError:
                            continue
                        seen.add(full)
                        status["scanned"] += 1
                        prev = existing.get(full)
                        if prev and prev[1] == st.st_mtime and prev[2] == st.st_size:
                            continue
                        ext = os.path.splitext(fn)[1].lower()
                        content = ""
                        if ext in EXTRACTABLE and st.st_size <= max_bytes:
                            try:
                                content = extract_text(full, ext)
                            except Exception as exc:  # broken or encrypted files are common
                                log.info("Could not read %s: %s", full, exc)
                        if prev:
                            file_id = prev[0]
                            db.execute(
                                "UPDATE files SET name=?, ext=?, size=?, mtime=?, indexed_at=CURRENT_TIMESTAMP WHERE id=?",
                                (fn, ext, st.st_size, st.st_mtime, file_id),
                            )
                            db.execute("DELETE FROM files_fts WHERE rowid = ?", (file_id,))
                        else:
                            file_id = db.execute(
                                "INSERT INTO files (path, name, ext, size, mtime) VALUES (?, ?, ?, ?, ?)",
                                (full, fn, ext, st.st_size, st.st_mtime),
                            ).lastrowid
                        db.execute(
                            "INSERT INTO files_fts (rowid, name, path, content) VALUES (?, ?, ?, ?)",
                            (file_id, fn, full, content),
                        )
                        status["updated"] += 1
                        pending += 1
                        if pending >= 50:
                            db.commit()
                            pending = 0
            for path, (file_id, _, _) in existing.items():
                if path not in seen:
                    db.execute("DELETE FROM files WHERE id = ?", (file_id,))
                    db.execute("DELETE FROM files_fts WHERE rowid = ?", (file_id,))
                    status["removed"] += 1
        set_meta("last_index", datetime.now(config.TZ).isoformat(timespec="seconds"))
        result = {k: status[k] for k in ("scanned", "updated", "removed")}
        result["seconds"] = round(time.time() - started, 1)
        log.info("Index finished: %s", result)
        return result
    except Exception as exc:
        status["error"] = str(exc)
        log.exception("Index run failed")
        raise
    finally:
        status["running"] = False
        _lock.release()


def index_stats() -> dict:
    with get_db() as db:
        count = db.execute("SELECT COUNT(*) FROM files").fetchone()[0]
    return {
        "files": count,
        "last_index": get_meta("last_index"),
        "roots": config.NAS_ROOTS,
        **status,
    }


def _fts_query(text: str, joiner: str) -> str | None:
    tokens = [t for t in re.findall(r"\w+", text.lower()) if t not in STOPWORDS]
    if not tokens:
        tokens = re.findall(r"\w+", text.lower())
    if not tokens:
        return None
    return joiner.join(f'"{t}"*' for t in tokens[:12])


def search(text: str, limit: int = 10) -> list[dict]:
    limit = max(1, min(int(limit or 10), 25))
    results: dict[str, dict] = {}
    sql = (
        "SELECT f.path, f.name, f.size, f.mtime, "
        "snippet(files_fts, 2, '[', ']', ' ... ', 14) AS snippet, "
        "bm25(files_fts, 10.0, 4.0, 1.0) AS score "
        "FROM files_fts JOIN files f ON f.id = files_fts.rowid "
        "WHERE files_fts MATCH ? ORDER BY score LIMIT ?"
    )
    with get_db() as db:
        # Try "all words" first, then loosen to "any word" if that finds too little.
        for joiner in (" ", " OR "):
            q = _fts_query(text, joiner)
            if not q:
                break
            for r in db.execute(sql, (q, limit)).fetchall():
                if r["path"] not in results:
                    results[r["path"]] = {
                        "path": r["path"],
                        "name": r["name"],
                        "folder": os.path.dirname(r["path"]),
                        "size_kb": round((r["size"] or 0) / 1024),
                        "modified": datetime.fromtimestamp(r["mtime"] or 0, config.TZ).strftime("%Y-%m-%d"),
                        "snippet": (r["snippet"] or "").strip()[:400],
                    }
            if len(results) >= min(3, limit):
                break
    return list(results.values())[:limit]


def read(path: str, max_chars: int = 6000) -> dict:
    if not _allowed(path):
        return {"error": "That path is outside the NAS folders I'm allowed to read."}
    with get_db() as db:
        row = db.execute(
            "SELECT t.content FROM files f JOIN files_fts t ON t.rowid = f.id WHERE f.path = ?", (path,)
        ).fetchone()
    text = row["content"] if row else None
    if text is None:
        if not os.path.isfile(path):
            return {"error": "File not found."}
        try:
            text = extract_text(path, os.path.splitext(path)[1])
        except Exception as exc:
            return {"error": f"Could not read file: {exc}"}
    if not text:
        return {"path": path, "text": "", "note": "No readable text (it may be a photo, scan or unsupported type)."}
    return {"path": path, "text": text[:max_chars], "truncated": len(text) > max_chars}


def is_allowed(path: str) -> bool:
    return _allowed(path)
