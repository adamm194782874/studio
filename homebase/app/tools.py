"""The tools the AI can call, described in the format Ollama expects."""
import logging
from datetime import date, datetime, time, timedelta

from . import bills, config, google_api, indexer
from .auth import household

log = logging.getLogger("homebase.tools")


def _fn(name: str, description: str, props: dict, required: list[str] | None = None) -> dict:
    return {
        "type": "function",
        "function": {
            "name": name,
            "description": description,
            "parameters": {"type": "object", "properties": props, "required": required or []},
        },
    }


S = {"type": "string"}
I = {"type": "integer"}

TOOLS = [
    _fn("search_files",
        "Search documents, photos and other files stored on the family NAS by file name, folder name or the text inside documents. "
        "Use short keyword queries, e.g. 'car insurance 2023' or 'dishwasher manual'.",
        {"query": S, "limit": I}, ["query"]),
    _fn("read_file",
        "Read the text inside one NAS file. Use the exact path from search_files.",
        {"path": S}, ["path"]),
    _fn("list_events",
        "List calendar events between two dates. who is 'me', 'everyone', or a household member's name.",
        {"start_date": {**S, "description": "YYYY-MM-DD"}, "end_date": {**S, "description": "YYYY-MM-DD (inclusive)"},
         "who": S}, ["start_date", "end_date"]),
    _fn("create_event",
        "Add an event to the current user's Google Calendar. Times are local, format YYYY-MM-DDTHH:MM. "
        "For all day events use YYYY-MM-DD and all_day true. calendar is optional, e.g. 'Family'.",
        {"title": S, "start": S, "end": S, "all_day": {"type": "boolean"}, "location": S, "notes": S, "calendar": S},
        ["title", "start"]),
    _fn("find_free_time",
        "Find times when everyone in the household is free, checking all linked calendars.",
        {"start_date": {**S, "description": "YYYY-MM-DD"}, "end_date": {**S, "description": "YYYY-MM-DD"},
         "duration_minutes": I, "earliest_hour": {**I, "description": "0 to 23, default 8"},
         "latest_hour": {**I, "description": "1 to 24, default 21"}},
        ["start_date", "end_date"]),
    _fn("search_email",
        "Search the current user's Gmail. Uses Gmail search syntax, e.g. 'from:comcast newer_than:60d' or 'subject:receipt'.",
        {"query": S, "max_results": I}, ["query"]),
    _fn("read_email", "Read the full text of one email by id (from search_email).", {"message_id": S}, ["message_id"]),
    _fn("list_bills",
        "List the household bills list. status is 'unpaid' (default), 'paid' or 'all'. "
        "due_within_days limits to bills due in the next N days (includes overdue).",
        {"status": S, "due_within_days": I}),
    _fn("scan_email_for_bills",
        "Check the current user's recent Gmail for new bills and add them to the bills list. Takes a minute.",
        {"days": I}),
    _fn("update_bill",
        "Mark a bill as 'paid' or 'unpaid', or 'delete' it. Use the id from list_bills.",
        {"bill_id": I, "action": {**S, "description": "paid, unpaid or delete"}}, ["bill_id", "action"]),
    _fn("add_bill", "Manually add a bill to the household list.",
        {"payee": S, "amount": {"type": "number"}, "due_date": {**S, "description": "YYYY-MM-DD"}, "notes": S},
        ["payee"]),
]


def parse_dt(value: str, default_time: time = time(0)) -> datetime:
    value = (value or "").strip().replace("Z", "+00:00").replace(" ", "T")
    if len(value) == 10:
        dt = datetime.combine(date.fromisoformat(value), default_time)
    else:
        dt = datetime.fromisoformat(value)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=config.TZ)
    return dt


def _people(who: str | None, me: dict) -> list[dict]:
    members = household()
    who = (who or "me").strip().lower()
    if who in ("me", "my", "mine", "i", ""):
        return [m for m in members if m["id"] == me["id"]]
    if who in ("everyone", "all", "both", "us", "we", "household", "family"):
        return members
    picked = [m for m in members if who in (m["display_name"] or "").lower() or who == m["username"].lower()]
    return picked or [m for m in members if m["id"] == me["id"]]


class Context:
    """Per request info: who's asking, and which files the answer is based on."""

    def __init__(self, user: dict):
        self.user = user
        self.sources: list[dict] = []
        self.actions: list[str] = []

    def add_source(self, path: str, name: str) -> None:
        if not any(s["path"] == path for s in self.sources):
            self.sources.append({"path": path, "name": name})


def run_tool(name: str, args: dict, ctx: Context):
    try:
        return _dispatch(name, args or {}, ctx)
    except google_api.NotLinked as exc:
        return {"error": str(exc)}
    except Exception as exc:
        log.exception("Tool %s failed", name)
        return {"error": f"{type(exc).__name__}: {exc}"}


def _dispatch(name: str, a: dict, ctx: Context):
    uid = ctx.user["id"]

    if name == "search_files":
        hits = indexer.search(a.get("query", ""), a.get("limit") or 8)
        for h in hits[:5]:
            ctx.add_source(h["path"], h["name"])
        if hits:
            return {"results": hits}
        if indexer.status["running"] or not indexer.index_stats()["last_index"]:
            return {"results": [], "note": "The NAS file index is still being built, so results may be missing. "
                                           "Tell the user to try again later."}
        return {"results": [], "note": "Nothing matched. Try different or fewer keywords."}

    if name == "read_file":
        result = indexer.read(a.get("path", ""))
        if "error" not in result:
            ctx.add_source(result["path"], result["path"].rsplit("/", 1)[-1])
        return result

    if name == "list_events":
        start = parse_dt(a["start_date"])
        end = parse_dt(a.get("end_date") or a["start_date"]) + timedelta(days=1)
        out, seen, skipped = [], set(), []
        for person in _people(a.get("who"), ctx.user):
            try:
                events = google_api.list_events(person["id"], start, end)
            except google_api.NotLinked:
                skipped.append(person["display_name"])
                continue
            for ev in events:
                key = (ev["uid"], ev["start"])
                if key in seen:
                    continue
                seen.add(key)
                ev.pop("uid", None)
                ev["whose"] = person["display_name"]
                out.append(ev)
        out.sort(key=lambda e: e["start"] or "")
        result = {"events": out[:80]}
        if skipped:
            result["not_connected"] = skipped
        return result

    if name == "create_event":
        all_day = bool(a.get("all_day")) or len((a.get("start") or "").strip()) == 10
        start = parse_dt(a["start"])
        end = parse_dt(a["end"]) if a.get("end") else (start if all_day else start + timedelta(hours=1))
        ev = google_api.create_event(
            uid, a["title"], start, end, all_day=all_day, location=a.get("location"),
            description=a.get("notes"), calendar_name=a.get("calendar"),
        )
        when = ev["start"] if all_day else start.strftime("%a %b %d, %I:%M %p")
        ctx.actions.append(f"Added to calendar: {ev['title']} ({when})")
        return {"created": ev}

    if name == "find_free_time":
        first = date.fromisoformat(a["start_date"][:10])
        last = date.fromisoformat((a.get("end_date") or a["start_date"])[:10])
        if (last - first).days > 31:
            last = first + timedelta(days=31)
        earliest = int(a.get("earliest_hour") or 8)
        latest = int(a.get("latest_hour") or 21)
        start = datetime.combine(first, time(0), config.TZ)
        end = datetime.combine(last + timedelta(days=1), time(0), config.TZ)
        busy, checked, skipped = [], [], []
        for person in household():
            try:
                busy += google_api.busy_times(person["id"], start, end)
                checked.append(person["display_name"])
            except google_api.NotLinked:
                skipped.append(person["display_name"])
        slots = google_api.free_slots(busy, first, last, int(a.get("duration_minutes") or 60), earliest, latest)
        return {"free_slots": slots, "calendars_checked_for": checked, "not_connected": skipped}

    if name == "search_email":
        return {"emails": google_api.search_email(uid, a.get("query", ""), a.get("max_results") or 10)}

    if name == "read_email":
        return google_api.read_email(uid, a["message_id"])

    if name == "list_bills":
        status = (a.get("status") or "unpaid").lower()
        days = a.get("due_within_days")
        rows = bills.list_bills(status, int(days) if days not in (None, "") else None)
        return {"today": datetime.now(config.TZ).date().isoformat(), "bills": rows}

    if name == "scan_email_for_bills":
        result = bills.scan(uid, a.get("days"))
        if result["new_bills"]:
            ctx.actions.append(f"Found {len(result['new_bills'])} new bill(s) in email")
        return result

    if name == "update_bill":
        action = (a.get("action") or "").lower()
        bill_id = int(a["bill_id"])
        if action == "delete":
            ok = bills.delete(bill_id)
        elif action in ("paid", "unpaid"):
            ok = bills.set_status(bill_id, action)
        else:
            return {"error": "action must be paid, unpaid or delete"}
        if ok:
            ctx.actions.append(f"Bill #{bill_id}: {action}")
        return {"ok": ok}

    if name == "add_bill":
        amount = a.get("amount")
        bill = bills.add_manual(uid, a["payee"], float(amount) if amount not in (None, "") else None,
                                a.get("due_date"), a.get("notes"))
        ctx.actions.append(f"Added bill: {bill['payee']}")
        return {"added": bill}

    return {"error": f"Unknown tool {name}"}
