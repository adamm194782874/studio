"""Web server: login, chat, bills, settings, Google linking and file downloads."""
import logging
import mimetypes
import os
import threading
import time
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from starlette.middleware.sessions import SessionMiddleware

from . import agent, bills, config, google_api, indexer, llm
from .auth import current_user, hash_password, household, user_count, verify_password
from .db import get_db, init_db

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("homebase")

STATIC = Path(__file__).parent / "static"

app = FastAPI(title=config.ASSISTANT_NAME, docs_url=None, redoc_url=None)
app.add_middleware(
    SessionMiddleware,
    secret_key=config.secret_key(),
    session_cookie="homebase_session",
    max_age=60 * 60 * 24 * 30,
    same_site="lax",
    https_only=config.BASE_URL.startswith("https://"),
)
app.mount("/static", StaticFiles(directory=STATIC), name="static")


# ---------------------------------------------------------------- background jobs

def _scheduler() -> None:
    time.sleep(15)
    last_index = last_bills = 0.0
    while True:
        now = time.time()
        if config.INDEX_EVERY_HOURS > 0 and now - last_index >= config.INDEX_EVERY_HOURS * 3600:
            last_index = now
            try:
                indexer.run_index()
            except Exception:
                log.exception("Scheduled index failed")
        if config.BILL_SCAN_EVERY_HOURS > 0 and now - last_bills >= config.BILL_SCAN_EVERY_HOURS * 3600:
            last_bills = now
            try:
                bills.scan_everyone()
            except llm.LLMError as exc:
                log.warning("Bill scan postponed, Ollama unavailable: %s", exc)
                last_bills = now - config.BILL_SCAN_EVERY_HOURS * 3600 + 1800  # retry in 30 minutes
            except Exception:
                log.exception("Scheduled bill scan failed")
        time.sleep(60)


@app.on_event("startup")
def startup() -> None:
    init_db()
    threading.Thread(target=_scheduler, daemon=True, name="scheduler").start()
    log.info("%s started. NAS folders: %s. Ollama: %s (%s)",
             config.ASSISTANT_NAME, config.NAS_ROOTS, config.OLLAMA_URL, config.OLLAMA_MODEL)


# ---------------------------------------------------------------- pages

@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    if not request.session.get("user_id"):
        return RedirectResponse("/login")
    return FileResponse(STATIC / "index.html")


@app.get("/login", response_class=HTMLResponse)
def login_page():
    return FileResponse(STATIC / "login.html")


@app.get("/healthz")
def healthz():
    return {"ok": True}


# ---------------------------------------------------------------- accounts

class LoginIn(BaseModel):
    username: str = Field(min_length=1, max_length=40)
    password: str = Field(min_length=1, max_length=200)


class RegisterIn(LoginIn):
    display_name: str = Field(min_length=1, max_length=40)
    password: str = Field(min_length=8, max_length=200)


_failed: dict[str, list[float]] = {}


@app.get("/api/setup")
def setup_status():
    count = user_count()
    return {"users": count, "can_register": count < config.MAX_USERS, "name": config.ASSISTANT_NAME}


@app.post("/api/register")
def register(body: RegisterIn, request: Request):
    if user_count() >= config.MAX_USERS:
        raise HTTPException(403, "All household accounts are already set up.")
    username = body.username.strip().lower()
    with get_db() as db:
        if db.execute("SELECT 1 FROM users WHERE username = ?", (username,)).fetchone():
            raise HTTPException(400, "That username is taken.")
        user_id = db.execute(
            "INSERT INTO users (username, display_name, password_hash) VALUES (?, ?, ?)",
            (username, body.display_name.strip(), hash_password(body.password)),
        ).lastrowid
    request.session["user_id"] = user_id
    return {"ok": True}


@app.post("/api/login")
def login(body: LoginIn, request: Request):
    ip = request.client.host if request.client else "?"
    recent = [t for t in _failed.get(ip, []) if time.time() - t < 900]
    if len(recent) >= 10:
        raise HTTPException(429, "Too many tries. Wait 15 minutes.")
    with get_db() as db:
        row = db.execute(
            "SELECT id, password_hash FROM users WHERE username = ?", (body.username.strip().lower(),)
        ).fetchone()
    if not row or not verify_password(body.password, row["password_hash"]):
        _failed[ip] = recent + [time.time()]
        time.sleep(1)
        raise HTTPException(401, "Wrong username or password.")
    _failed.pop(ip, None)
    request.session["user_id"] = row["id"]
    return {"ok": True}


@app.post("/api/logout")
def logout(request: Request):
    request.session.clear()
    return {"ok": True}


class PasswordIn(BaseModel):
    current: str
    new: str = Field(min_length=8, max_length=200)


@app.post("/api/password")
def change_password(body: PasswordIn, user=Depends(current_user)):
    with get_db() as db:
        row = db.execute("SELECT password_hash FROM users WHERE id = ?", (user["id"],)).fetchone()
        if not verify_password(body.current, row["password_hash"]):
            raise HTTPException(400, "Current password is wrong.")
        db.execute("UPDATE users SET password_hash = ? WHERE id = ?", (hash_password(body.new), user["id"]))
    return {"ok": True}


@app.get("/api/me")
def me(user=Depends(current_user)):
    members = household()
    mine = next((m for m in members if m["id"] == user["id"]), {})
    return {
        "user": user,
        "google_email": mine.get("google_email"),
        "google_configured": google_api.configured(),
        "household": members,
        "assistant": config.ASSISTANT_NAME,
    }


@app.get("/api/status")
def status(user=Depends(current_user)):
    return {"ollama": llm.health(), "index": indexer.index_stats()}


# ---------------------------------------------------------------- chat

class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=4000)


@app.post("/api/chat")
def chat(body: ChatIn, user=Depends(current_user)):
    try:
        return agent.respond(user, body.message.strip())
    except llm.LLMError as exc:
        raise HTTPException(503, str(exc))


@app.get("/api/history")
def get_history(user=Depends(current_user)):
    return {"messages": agent.history(user["id"])}


@app.post("/api/history/clear")
def clear(user=Depends(current_user)):
    agent.clear_history(user["id"])
    return {"ok": True}


# ---------------------------------------------------------------- bills

@app.get("/api/bills")
def get_bills(status: str = "unpaid", user=Depends(current_user)):
    return {"bills": bills.list_bills(status)}


class BillUpdate(BaseModel):
    action: str


@app.post("/api/bills/{bill_id}")
def update_bill(bill_id: int, body: BillUpdate, user=Depends(current_user)):
    if body.action == "delete":
        ok = bills.delete(bill_id)
    elif body.action in ("paid", "unpaid"):
        ok = bills.set_status(bill_id, body.action)
    else:
        raise HTTPException(400, "Unknown action")
    return {"ok": ok}


@app.post("/api/bills-scan")
def scan_bills(user=Depends(current_user)):
    try:
        return bills.scan(user["id"])
    except google_api.NotLinked as exc:
        raise HTTPException(400, str(exc))
    except llm.LLMError as exc:
        raise HTTPException(503, str(exc))


# ---------------------------------------------------------------- files

@app.post("/api/index")
def reindex(user=Depends(current_user)):
    if indexer.status["running"]:
        return {"started": False, "message": "Already running"}
    threading.Thread(target=indexer.run_index, daemon=True).start()
    return {"started": True}


@app.get("/files/download")
def download(path: str, user=Depends(current_user)):
    if not indexer.is_allowed(path) or not os.path.isfile(path):
        raise HTTPException(404, "File not found")
    media_type = mimetypes.guess_type(path)[0] or "application/octet-stream"
    inline = media_type.startswith(("image/", "text/", "video/", "audio/")) or media_type == "application/pdf"
    return FileResponse(
        path, media_type=media_type, filename=os.path.basename(path),
        content_disposition_type="inline" if inline else "attachment",
    )


# ---------------------------------------------------------------- google

@app.get("/auth/google/start")
def google_start(request: Request, user=Depends(current_user)):
    if not google_api.configured():
        raise HTTPException(400, "Google isn't set up yet. Put google_client_secret.json in the data folder.")
    url, state, verifier = google_api.start_link()
    request.session["oauth_state"] = state
    request.session["oauth_verifier"] = verifier
    return RedirectResponse(url)


@app.get("/auth/google/callback")
def google_callback(request: Request, user=Depends(current_user)):
    state = request.session.pop("oauth_state", None)
    verifier = request.session.pop("oauth_verifier", None)
    if not state or request.query_params.get("state") != state:
        raise HTTPException(400, "Google sign in got mixed up. Go back and try again.")
    if request.query_params.get("error"):
        return RedirectResponse("/#settings")
    # Rebuild the URL with the public address so it matches what Google expects.
    callback_url = config.BASE_URL + google_api.REDIRECT_PATH + "?" + request.url.query
    try:
        google_api.finish_link(user["id"], callback_url, state, verifier)
    except Exception as exc:
        log.exception("Google link failed")
        raise HTTPException(400, f"Google sign in failed: {exc}")
    return RedirectResponse("/#settings")


@app.post("/api/google/disconnect")
def google_disconnect(user=Depends(current_user)):
    google_api.unlink(user["id"])
    return {"ok": True}
