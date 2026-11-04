"""The chat loop: send the conversation to Ollama, run any tools it asks for, repeat."""
import json
import logging
from datetime import datetime

from . import config, llm
from .auth import household
from .db import get_db
from .tools import TOOLS, Context, run_tool

log = logging.getLogger("homebase.agent")

MAX_STEPS = 6
MAX_TOOL_CHARS = 7000


def _system_prompt(user: dict) -> str:
    now = datetime.now(config.TZ)
    members = household()
    roster = ", ".join(
        f"{m['display_name']} (Google {'connected' if m['google_email'] else 'not connected'})" for m in members
    )
    return f"""You are {config.ASSISTANT_NAME}, a private assistant for a household, running on their home NAS.
You're talking with {user['display_name']}. Household members: {roster}.
Today is {now:%A, %B %d, %Y} ({config.TIMEZONE_NAME}). The current time is given with each message.

What you can do with tools:
* Find files on the NAS (search_files, read_file). Old documents, tax forms, manuals, photos.
* Read and add calendar events (list_events, create_event, find_free_time).
* Search Gmail (search_email, read_email).
* Track household bills (list_bills, scan_email_for_bills, update_bill, add_bill).

Rules:
* Use tools for facts. Never make up file names, dates, amounts or events.
* If a file search finds nothing, try once more with different keywords before giving up.
* When you mention a file, give its name and folder. The app shows download links automatically.
* Turn relative dates like "next Tuesday" into real dates using today's date above.
* When asked to schedule something with a clear time, just create it, then confirm what you did.
  If the time or day is unclear, ask first. When it involves both people, check find_free_time.
* For "what bills are due", use list_bills. Mention overdue ones first.
* Keep answers short and friendly. They'll often be reading on a phone.
"""


def _history(user_id: int) -> list[dict]:
    with get_db() as db:
        rows = db.execute(
            "SELECT role, content FROM messages WHERE user_id = ? ORDER BY id DESC LIMIT ?",
            (user_id, config.HISTORY_TURNS),
        ).fetchall()
    return [{"role": r["role"], "content": r["content"]} for r in reversed(rows)]


def _save(user_id: int, role: str, content: str) -> None:
    with get_db() as db:
        db.execute("INSERT INTO messages (user_id, role, content) VALUES (?, ?, ?)", (user_id, role, content))


def respond(user: dict, text: str) -> dict:
    ctx = Context(user)
    # The system prompt only changes once a day, so Ollama can reuse its work on it between questions
    # (a big speed win on slower computers). The exact time travels with the question instead.
    now = datetime.now(config.TZ)
    messages = [{"role": "system", "content": _system_prompt(user)}, *_history(user["id"]),
                {"role": "user", "content": f"{text}\n\n(Sent {now:%a %b %d, %I:%M %p})"}]
    _save(user["id"], "user", text)

    answer = ""
    for _ in range(MAX_STEPS):
        msg = llm.chat(messages, tools=TOOLS)
        calls = msg.get("tool_calls") or []
        if not calls:
            answer = msg.get("content", "")
            break
        messages.append({"role": "assistant", "content": msg.get("content", ""), "tool_calls": calls})
        for call in calls:
            fn = call.get("function", {})
            name = fn.get("name", "")
            args = fn.get("arguments") or {}
            if isinstance(args, str):
                try:
                    args = json.loads(args)
                except ValueError:
                    args = {}
            log.info("Tool call %s %s", name, args)
            result = run_tool(name, args, ctx)
            content = json.dumps(result, default=str)
            if len(content) > MAX_TOOL_CHARS:
                content = content[:MAX_TOOL_CHARS] + " ...(cut off)"
            messages.append({"role": "tool", "content": content, "tool_name": name})
    else:
        # Too many tool rounds. Ask for a final answer with what it has.
        messages.append({"role": "user", "content": "Please answer now with what you found."})
        answer = llm.chat(messages).get("content", "")

    answer = answer.strip() or "Sorry, I didn't come up with an answer. Could you try asking another way?"
    _save(user["id"], "assistant", answer)
    return {"reply": answer, "sources": ctx.sources, "actions": ctx.actions}


def clear_history(user_id: int) -> None:
    with get_db() as db:
        db.execute("DELETE FROM messages WHERE user_id = ?", (user_id,))


def history(user_id: int, limit: int = 50) -> list[dict]:
    with get_db() as db:
        rows = db.execute(
            "SELECT role, content, created_at FROM messages WHERE user_id = ? ORDER BY id DESC LIMIT ?",
            (user_id, limit),
        ).fetchall()
    return [dict(r) for r in reversed(rows)]
