"""Google sign in (one per household member), Calendar and Gmail."""
import base64
import json
import logging
import os
from datetime import date, datetime, time, timedelta

from . import config
from .db import get_db
from .extract import html_to_text

# Google sometimes returns scopes in a different order (or adds "openid"); don't treat that as an error.
os.environ.setdefault("OAUTHLIB_RELAX_TOKEN_SCOPE", "1")
if config.BASE_URL.startswith("http://"):
    # Only for local testing on http://localhost. Real setups use the Tailscale https address.
    os.environ.setdefault("OAUTHLIB_INSECURE_TRANSPORT", "1")

log = logging.getLogger("homebase.google")

SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/gmail.readonly",
]
REDIRECT_PATH = "/auth/google/callback"


class NotLinked(Exception):
    pass


def configured() -> bool:
    return config.GOOGLE_CLIENT_SECRET_FILE.exists()


# ---------------------------------------------------------------- sign in

def _flow(**kwargs):
    from google_auth_oauthlib.flow import Flow

    return Flow.from_client_secrets_file(
        str(config.GOOGLE_CLIENT_SECRET_FILE),
        scopes=SCOPES,
        redirect_uri=config.BASE_URL + REDIRECT_PATH,
        **kwargs,
    )


def start_link() -> tuple[str, str, str]:
    """Returns (url to send the user to, state, pkce code verifier)."""
    flow = _flow(autogenerate_code_verifier=True)
    url, state = flow.authorization_url(
        access_type="offline", prompt="consent", include_granted_scopes="true"
    )
    return url, state, flow.code_verifier


def finish_link(user_id: int, authorization_response: str, state: str, code_verifier: str) -> str:
    from googleapiclient.discovery import build

    flow = _flow(state=state, code_verifier=code_verifier)
    flow.fetch_token(authorization_response=authorization_response)
    creds = flow.credentials
    info = build("oauth2", "v2", credentials=creds, cache_discovery=False).userinfo().get().execute()
    email = info.get("email", "")
    _save(user_id, creds, email)
    return email


def _save(user_id: int, creds, email: str | None = None) -> None:
    with get_db() as db:
        if email is None:
            row = db.execute("SELECT email FROM google_tokens WHERE user_id = ?", (user_id,)).fetchone()
            email = row["email"] if row else ""
        db.execute(
            "INSERT INTO google_tokens (user_id, email, token_json, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) "
            "ON CONFLICT(user_id) DO UPDATE SET email = excluded.email, token_json = excluded.token_json, "
            "updated_at = CURRENT_TIMESTAMP",
            (user_id, email, creds.to_json()),
        )


def unlink(user_id: int) -> None:
    with get_db() as db:
        db.execute("DELETE FROM google_tokens WHERE user_id = ?", (user_id,))


def linked_user_ids() -> list[int]:
    with get_db() as db:
        return [r["user_id"] for r in db.execute("SELECT user_id FROM google_tokens")]


def credentials(user_id: int):
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials

    with get_db() as db:
        row = db.execute("SELECT token_json FROM google_tokens WHERE user_id = ?", (user_id,)).fetchone()
    if not row:
        raise NotLinked("This person hasn't connected their Google account yet (Settings > Connect Google).")
    creds = Credentials.from_authorized_user_info(json.loads(row["token_json"]), SCOPES)
    if not creds.valid:
        if creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception as exc:
                raise NotLinked(
                    f"Google sign in expired ({exc}). Reconnect Google in Settings."
                ) from exc
            _save(user_id, creds)
        else:
            raise NotLinked("Google sign in expired. Reconnect Google in Settings.")
    return creds


def _service(user_id: int, api: str, version: str):
    from googleapiclient.discovery import build

    return build(api, version, credentials=credentials(user_id), cache_discovery=False)


# ---------------------------------------------------------------- calendar

def _calendars(svc) -> list[dict]:
    items = svc.calendarList().list().execute().get("items", [])
    return [c for c in items if c.get("selected") or c.get("primary")]


def _fmt_event(ev: dict, cal_name: str) -> dict:
    start, end = ev.get("start", {}), ev.get("end", {})
    all_day = "date" in start
    return {
        "title": ev.get("summary", "(no title)"),
        "start": start.get("date") or start.get("dateTime"),
        "end": end.get("date") or end.get("dateTime"),
        "all_day": all_day,
        "location": ev.get("location"),
        "calendar": cal_name,
        "uid": ev.get("iCalUID") or ev.get("id"),
    }


def list_events(user_id: int, start: datetime, end: datetime) -> list[dict]:
    from googleapiclient.errors import HttpError

    svc = _service(user_id, "calendar", "v3")
    out = []
    for cal in _calendars(svc):
        try:
            items = svc.events().list(
                calendarId=cal["id"], timeMin=start.isoformat(), timeMax=end.isoformat(),
                singleEvents=True, orderBy="startTime", maxResults=100,
            ).execute().get("items", [])
        except HttpError as exc:
            log.info("Skipping calendar %s: %s", cal.get("summary"), exc)
            continue
        name = "primary" if cal.get("primary") else cal.get("summary", "")
        out.extend(_fmt_event(ev, name) for ev in items if ev.get("status") != "cancelled")
    out.sort(key=lambda e: e["start"] or "")
    return out


def list_calendar_names(user_id: int) -> list[str]:
    svc = _service(user_id, "calendar", "v3")
    return [
        c.get("summary", "") for c in svc.calendarList().list().execute().get("items", [])
        if c.get("accessRole") in ("owner", "writer")
    ]


def create_event(
    user_id: int, title: str, start: datetime, end: datetime, all_day: bool = False,
    location: str | None = None, description: str | None = None, calendar_name: str | None = None,
) -> dict:
    svc = _service(user_id, "calendar", "v3")
    cal_id, cal_label = "primary", "primary"
    if calendar_name and calendar_name.lower() not in ("primary", "my calendar", "default"):
        for c in svc.calendarList().list().execute().get("items", []):
            if c.get("accessRole") in ("owner", "writer") and calendar_name.lower() in c.get("summary", "").lower():
                cal_id, cal_label = c["id"], c.get("summary", "")
                break
    body: dict = {"summary": title}
    if location:
        body["location"] = location
    if description:
        body["description"] = description
    if all_day:
        end_day = end.date() if end.date() > start.date() else start.date() + timedelta(days=1)
        body["start"] = {"date": start.date().isoformat()}
        body["end"] = {"date": end_day.isoformat()}
    else:
        body["start"] = {"dateTime": start.isoformat(), "timeZone": config.TIMEZONE_NAME}
        body["end"] = {"dateTime": end.isoformat(), "timeZone": config.TIMEZONE_NAME}
    ev = svc.events().insert(calendarId=cal_id, body=body).execute()
    return {**_fmt_event(ev, cal_label), "link": ev.get("htmlLink")}


def busy_times(user_id: int, start: datetime, end: datetime) -> list[tuple[datetime, datetime]]:
    svc = _service(user_id, "calendar", "v3")
    ids = [{"id": c["id"]} for c in _calendars(svc)][:50] or [{"id": "primary"}]
    resp = svc.freebusy().query(
        body={"timeMin": start.isoformat(), "timeMax": end.isoformat(), "items": ids}
    ).execute()
    busy = []
    for cal in resp.get("calendars", {}).values():
        for b in cal.get("busy", []):
            busy.append((
                datetime.fromisoformat(b["start"].replace("Z", "+00:00")),
                datetime.fromisoformat(b["end"].replace("Z", "+00:00")),
            ))
    return busy


def free_slots(
    busy: list[tuple[datetime, datetime]], first_day: date, last_day: date,
    minutes: int, earliest: int, latest: int, limit: int = 15,
) -> list[dict]:
    busy = sorted(busy)
    slots = []
    day = first_day
    now = datetime.now(config.TZ)
    while day <= last_day and len(slots) < limit:
        cursor = datetime.combine(day, time(earliest), config.TZ)
        day_end = datetime.combine(day, time(min(latest, 23), 59 if latest >= 24 else 0), config.TZ)
        cursor = max(cursor, now.replace(second=0, microsecond=0))
        for b_start, b_end in busy:
            if b_end <= cursor or b_start >= day_end:
                continue
            if (b_start - cursor) >= timedelta(minutes=minutes):
                slots.append((cursor, b_start))
            cursor = max(cursor, b_end)
        if (day_end - cursor) >= timedelta(minutes=minutes):
            slots.append((cursor, day_end))
        day += timedelta(days=1)
    return [
        {"start": s.astimezone(config.TZ).strftime("%a %Y-%m-%d %H:%M"),
         "end": e.astimezone(config.TZ).strftime("%H:%M")}
        for s, e in slots[:limit]
    ]


# ---------------------------------------------------------------- gmail

def _decode(data: str) -> str:
    return base64.urlsafe_b64decode(data + "===").decode("utf-8", errors="replace")


def _body_text(payload: dict) -> str:
    plain, rich = [], []

    def walk(part: dict) -> None:
        mime = part.get("mimeType", "")
        data = part.get("body", {}).get("data")
        if data and mime == "text/plain":
            plain.append(_decode(data))
        elif data and mime == "text/html":
            rich.append(_decode(data))
        for p in part.get("parts", []) or []:
            walk(p)

    walk(payload)
    if plain:
        return "\n".join(plain).strip()
    return html_to_text("\n".join(rich))


def _headers(msg: dict) -> dict:
    return {h["name"].lower(): h["value"] for h in msg.get("payload", {}).get("headers", [])}


def search_email(user_id: int, query: str, max_results: int = 10) -> list[dict]:
    svc = _service(user_id, "gmail", "v1")
    ids = svc.users().messages().list(
        userId="me", q=query, maxResults=max(1, min(int(max_results or 10), 25))
    ).execute().get("messages", [])
    out = []
    for m in ids:
        msg = svc.users().messages().get(
            userId="me", id=m["id"], format="metadata", metadataHeaders=["From", "Subject", "Date"]
        ).execute()
        h = _headers(msg)
        out.append({
            "id": m["id"], "from": h.get("from"), "subject": h.get("subject"),
            "date": h.get("date"), "snippet": msg.get("snippet", ""),
        })
    return out


def read_email(user_id: int, message_id: str, max_chars: int = 6000) -> dict:
    svc = _service(user_id, "gmail", "v1")
    msg = svc.users().messages().get(userId="me", id=message_id, format="full").execute()
    h = _headers(msg)
    body = _body_text(msg.get("payload", {}))
    return {
        "id": message_id, "from": h.get("from"), "to": h.get("to"), "subject": h.get("subject"),
        "date": h.get("date"), "body": body[:max_chars], "truncated": len(body) > max_chars,
    }
