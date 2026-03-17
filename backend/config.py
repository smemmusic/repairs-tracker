import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'smem.db'}")
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", str(BASE_DIR / "uploads")))
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-in-production")
DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() == "true"
DEMO_PASSWORD = "smem"

DISPLAY_READY_THRESHOLD = 7
DASHBOARD_FEED_LIMIT = 10
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB
