"""Start Homebase. Used by start.bat / start.sh, and by Windows Task Scheduler with pythonw.exe."""
import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
os.chdir(HERE)
sys.path.insert(0, str(HERE))

if sys.version_info < (3, 10):
    sys.exit("Homebase needs Python 3.10 or newer. Install Python 3.12 from python.org.")

import uvicorn  # noqa: E402

from app import config  # noqa: E402

if __name__ == "__main__":
    print(f"Homebase is starting on http://{config.HOST}:{config.PORT}  (logs: {config.LOG_PATH})")
    uvicorn.run(
        "app.main:app",
        host=config.HOST,
        port=config.PORT,
        proxy_headers=True,
        forwarded_allow_ips="*",
        log_config=None,
    )
