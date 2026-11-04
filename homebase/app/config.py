"""All settings come from environment variables. See example.env for the full list."""
import os
import secrets
from pathlib import Path
from zoneinfo import ZoneInfo


def _list(name: str, default: str) -> list[str]:
    return [p.strip() for p in os.environ.get(name, default).split(",") if p.strip()]


DATA_DIR = Path(os.environ.get("DATA_DIR", "/data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DATA_DIR / "homebase.db"

ASSISTANT_NAME = os.environ.get("ASSISTANT_NAME", "Homebase")
BASE_URL = os.environ.get("BASE_URL", "http://localhost:8080").rstrip("/")
TIMEZONE_NAME = os.environ.get("TZ", "UTC")
TZ = ZoneInfo(TIMEZONE_NAME)
MAX_USERS = int(os.environ.get("MAX_USERS", "2"))

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://192.168.1.50:11434").rstrip("/")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5:7b")
OLLAMA_NUM_CTX = int(os.environ.get("OLLAMA_NUM_CTX", "8192"))
OLLAMA_TIMEOUT = float(os.environ.get("OLLAMA_TIMEOUT", "300"))

NAS_ROOTS = _list("NAS_ROOTS", "/nas")
MAX_FILE_MB = float(os.environ.get("MAX_FILE_MB", "25"))
INDEX_EVERY_HOURS = float(os.environ.get("INDEX_EVERY_HOURS", "6"))
BILL_SCAN_EVERY_HOURS = float(os.environ.get("BILL_SCAN_EVERY_HOURS", "12"))
BILL_SCAN_DAYS = int(os.environ.get("BILL_SCAN_DAYS", "45"))

GOOGLE_CLIENT_SECRET_FILE = Path(
    os.environ.get("GOOGLE_CLIENT_SECRET_FILE", str(DATA_DIR / "google_client_secret.json"))
)


def secret_key() -> str:
    """Session signing key. Generated once and kept in the data folder."""
    env = os.environ.get("SECRET_KEY")
    if env:
        return env
    path = DATA_DIR / "secret_key"
    if path.exists():
        return path.read_text().strip()
    key = secrets.token_urlsafe(48)
    path.write_text(key)
    os.chmod(path, 0o600)
    return key
