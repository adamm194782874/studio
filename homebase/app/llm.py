"""Talks to Ollama running on a PC on the home network."""
import re

import httpx

from . import config


class LLMError(RuntimeError):
    pass


def chat(messages: list[dict], tools: list[dict] | None = None, fmt=None, temperature: float = 0.3) -> dict:
    payload = {
        "model": config.OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "keep_alive": "30m",
        "options": {"num_ctx": config.OLLAMA_NUM_CTX, "temperature": temperature},
    }
    if tools:
        payload["tools"] = tools
    if fmt is not None:
        payload["format"] = fmt
    try:
        r = httpx.post(f"{config.OLLAMA_URL}/api/chat", json=payload, timeout=config.OLLAMA_TIMEOUT)
    except httpx.HTTPError as exc:
        raise LLMError(
            f"Can't reach Ollama at {config.OLLAMA_URL}. Is the PC on and Ollama running? ({exc})"
        ) from exc
    if r.status_code != 200:
        raise LLMError(f"Ollama returned {r.status_code}: {r.text[:300]}")
    msg = r.json().get("message", {})
    if msg.get("content"):
        msg["content"] = strip_thinking(msg["content"])
    return msg


def strip_thinking(text: str) -> str:
    return re.sub(r"(?s)<think>.*?</think>", "", text).strip()


def health() -> dict:
    try:
        r = httpx.get(f"{config.OLLAMA_URL}/api/tags", timeout=5)
        r.raise_for_status()
        names = [m.get("name", "") for m in r.json().get("models", [])]
    except Exception as exc:
        return {"ok": False, "url": config.OLLAMA_URL, "model": config.OLLAMA_MODEL, "error": str(exc)}
    wanted = config.OLLAMA_MODEL
    has_model = any(n == wanted or n == f"{wanted}:latest" or n.split(":")[0] == wanted for n in names)
    return {
        "ok": has_model,
        "url": config.OLLAMA_URL,
        "model": wanted,
        "error": None if has_model else f"Ollama is up but model '{wanted}' isn't pulled. Run: ollama pull {wanted}",
    }
