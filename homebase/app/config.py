"""Settings come from settings.env in the Homebase folder (see example.env).

Real environment variables win over the file, which is handy for testing.
"""
import os
import secrets
from pathlib import Path
from zoneinfo import ZoneInfo

APP_DIR = Path(__file__).resolve().parent.parent


def _load_settings_file() -> dict:
    values = {}
    path = Path(os.environ.get("HOMEBASE_SETTINGS", APP_DIR / "settings.env"))
    if path.exists():
        for line in path.read_text(encoding="utf-8-sig").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip().strip('"').strip("'")
    return values


_env = {**_load_settings_file(), **os.environ}


def _get(name: str, default: str) -> str:
    value = _env.get(name, "")
    return value if value != "" else default


def _list(name: str, default: str) -> list[str]:
    return [p.strip() for p in _get(name, default).split(",") if p.strip()]


DATA_DIR = Path(_get("DATA_DIR", str(APP_DIR / "data")))
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DATA_DIR / "homebase.db"
LOG_PATH = DATA_DIR / "homebase.log"

ASSISTANT_NAME = _get("ASSISTANT_NAME", "Homebase")
HOST = _get("HOST", "127.0.0.1")
PORT = int(_get("PORT", "8080"))
BASE_URL = _get("BASE_URL", f"http://localhost:{PORT}").rstrip("/")
TIMEZONE_NAME = _get("TIMEZONE", _get("TZ", "UTC"))
TZ = ZoneInfo(TIMEZONE_NAME)
MAX_USERS = int(_get("MAX_USERS", "2"))

OLLAMA_URL = _get("OLLAMA_URL", "http://127.0.0.1:11434").rstrip("/")
OLLAMA_MODEL = _get("OLLAMA_MODEL", "qwen2.5:7b")
OLLAMA_NUM_CTX = int(_get("OLLAMA_NUM_CTX", "8192"))
OLLAMA_TIMEOUT = float(_get("OLLAMA_TIMEOUT", "600"))
# How long Ollama keeps the model loaded after the last question. Reloading is slow on older machines.
OLLAMA_KEEP_ALIVE = _get("OLLAMA_KEEP_ALIVE", "4h")
# How many past messages the AI sees. Fewer is faster.
HISTORY_TURNS = int(_get("HISTORY_TURNS", "8"))

NAS_ROOTS = _list("NAS_ROOTS", "")
MAX_FILE_MB = float(_get("MAX_FILE_MB", "25"))
INDEX_EVERY_HOURS = float(_get("INDEX_EVERY_HOURS", "6"))
BILL_SCAN_EVERY_HOURS = float(_get("BILL_SCAN_EVERY_HOURS", "12"))
BILL_SCAN_DAYS = int(_get("BILL_SCAN_DAYS", "45"))

GOOGLE_CLIENT_SECRET_FILE = Path(
    _get("GOOGLE_CLIENT_SECRET_FILE", str(DATA_DIR / "google_client_secret.json"))
)


def secret_key() -> str:
    """Session signing key. Generated once and kept in the data folder."""
    env = _env.get("SECRET_KEY")
    if env:
        return env
    path = DATA_DIR / "secret_key"
    if path.exists():
        return path.read_text().strip()
    key = secrets.token_urlsafe(48)
    path.write_text(key)
    try:
        os.chmod(path, 0o600)
    except OSError:
        pass
    return key
