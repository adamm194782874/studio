"""Finds bills in Gmail and keeps one shared household bills list."""
import logging
from datetime import date, datetime, timedelta

from . import config, google_api, llm
from .db import get_db

log = logging.getLogger("homebase.bills")

GMAIL_QUERY = (
    'newer_than:{days}d -category:promotions -category:social '
    '(bill OR invoice OR statement OR "amount due" OR "payment due" OR "due date" '
    'OR "balance due" OR autopay OR "minimum payment" OR "your payment")'
)

EXTRACT_SCHEMA = {
    "type": "object",
    "properties": {
        "is_bill": {"type": "boolean"},
        "already_paid": {"type": "boolean"},
        "payee": {"type": "string"},
        "amount": {"type": ["number", "null"]},
        "currency": {"type": "string"},
        "due_date": {"type": ["string", "null"]},
        "autopay": {"type": "boolean"},
    },
    "required": ["is_bill", "already_paid", "payee", "amount", "due_date", "autopay"],
}

EXTRACT_PROMPT = """You read one email and decide if it's a bill for a household.

A bill is anything asking for money or showing a balance owed: utility bills, credit card statements,
insurance premiums, subscriptions, medical bills, invoices, tax notices.
Not bills: marketing, newsletters, shipping updates, order receipts for things already bought.
If it's a confirmation that a payment was already made, set is_bill true and already_paid true.

Return JSON with:
  is_bill (bool), already_paid (bool), payee (company name, short),
  amount (number, the amount due, or null if not stated), currency (like "USD"),
  due_date ("YYYY-MM-DD" or null), autopay (true if it says it will be paid automatically).
Today is {today}. Only use facts in the email. Never guess an amount or date.

From: {sender}
Subject: {subject}
Date: {date}

{body}
"""


def _clean_date(value) -> str | None:
    if not value:
        return None
    try:
        return date.fromisoformat(str(value)[:10]).isoformat()
    except ValueError:
        return None


def scan(user_id: int, days: int | None = None, max_emails: int = 40) -> dict:
    """Scan one person's inbox for new bills. Emails already checked are skipped."""
    import json

    days = int(days or config.BILL_SCAN_DAYS)
    candidates = google_api.search_email(user_id, GMAIL_QUERY.format(days=days), max_results=max_emails)
    with get_db() as db:
        done = {r["gmail_id"] for r in db.execute("SELECT gmail_id FROM scanned_emails")}
    found, checked = [], 0
    for c in candidates:
        if c["id"] in done:
            continue
        checked += 1
        mail = google_api.read_email(user_id, c["id"], max_chars=3500)
        prompt = EXTRACT_PROMPT.format(
            today=datetime.now(config.TZ).date().isoformat(), sender=mail["from"],
            subject=mail["subject"], date=mail["date"], body=mail["body"],
        )
        # If Ollama is down this raises LLMError and the email stays unscanned for next time.
        reply = llm.chat([{"role": "user", "content": prompt}], fmt=EXTRACT_SCHEMA, temperature=0)
        try:
            data = json.loads(reply.get("content") or "{}")
        except ValueError as exc:
            log.info("Could not parse bill info for %s: %s", c["id"], exc)
            data = {"is_bill": False}
        is_bill = bool(data.get("is_bill")) and bool(data.get("payee"))
        with get_db() as db:
            db.execute(
                "INSERT OR IGNORE INTO scanned_emails (gmail_id, user_id, is_bill) VALUES (?, ?, ?)",
                (c["id"], user_id, int(is_bill)),
            )
            if is_bill:
                amount = data.get("amount")
                try:
                    amount = float(amount) if amount is not None else None
                except (TypeError, ValueError):
                    amount = None
                bill = {
                    "payee": str(data["payee"])[:120],
                    "amount": amount,
                    "currency": (data.get("currency") or "USD")[:8],
                    "due_date": _clean_date(data.get("due_date")),
                    "autopay": int(bool(data.get("autopay"))),
                    "status": "paid" if data.get("already_paid") else "unpaid",
                    "subject": (mail["subject"] or "")[:200],
                }
                # Reminder emails repeat the same bill. Same payee and due date means same bill.
                if bill["due_date"] and db.execute(
                    "SELECT 1 FROM bills WHERE lower(payee) = lower(?) AND due_date = ?",
                    (bill["payee"], bill["due_date"]),
                ).fetchone():
                    continue
                db.execute(
                    "INSERT OR IGNORE INTO bills (found_by, gmail_id, payee, amount, currency, due_date, autopay, status, subject) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (user_id, c["id"], bill["payee"], bill["amount"], bill["currency"], bill["due_date"],
                     bill["autopay"], bill["status"], bill["subject"]),
                )
                found.append(bill)
    return {"emails_checked": checked, "new_bills": found}


def scan_everyone() -> None:
    for uid in google_api.linked_user_ids():
        try:
            result = scan(uid)
            log.info("Bill scan for user %s: %s", uid, {"checked": result["emails_checked"], "new": len(result["new_bills"])})
        except google_api.NotLinked as exc:
            log.warning("Bill scan skipped for user %s: %s", uid, exc)


def list_bills(status: str = "unpaid", due_within_days: int | None = None) -> list[dict]:
    sql = (
        "SELECT b.id, b.payee, b.amount, b.currency, b.due_date, b.autopay, b.status, b.subject, b.notes, "
        "u.display_name AS found_by FROM bills b LEFT JOIN users u ON u.id = b.found_by WHERE 1=1"
    )
    params: list = []
    if status in ("unpaid", "paid"):
        sql += " AND b.status = ?"
        params.append(status)
    if due_within_days is not None:
        cutoff = (datetime.now(config.TZ).date() + timedelta(days=int(due_within_days))).isoformat()
        sql += " AND b.due_date IS NOT NULL AND b.due_date <= ?"
        params.append(cutoff)
    sql += " ORDER BY b.due_date IS NULL, b.due_date, b.id DESC LIMIT 100"
    with get_db() as db:
        rows = [dict(r) for r in db.execute(sql, params)]
    for r in rows:
        r["autopay"] = bool(r["autopay"])
    return rows


def set_status(bill_id: int, status: str) -> bool:
    with get_db() as db:
        cur = db.execute("UPDATE bills SET status = ? WHERE id = ?", (status, int(bill_id)))
    return cur.rowcount > 0


def add_manual(user_id: int, payee: str, amount: float | None, due_date: str | None, notes: str | None = None) -> dict:
    with get_db() as db:
        bill_id = db.execute(
            "INSERT INTO bills (found_by, payee, amount, currency, due_date, notes) VALUES (?, ?, ?, 'USD', ?, ?)",
            (user_id, payee, amount, _clean_date(due_date), notes),
        ).lastrowid
    return {"id": bill_id, "payee": payee, "amount": amount, "due_date": _clean_date(due_date)}


def delete(bill_id: int) -> bool:
    with get_db() as db:
        cur = db.execute("DELETE FROM bills WHERE id = ?", (int(bill_id),))
    return cur.rowcount > 0
