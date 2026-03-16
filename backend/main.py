from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from config import SECRET_KEY, UPLOAD_DIR
from database import create_db
from routes import auth, instruments, log_entries, dashboard, attachments, config


UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db()
    yield


app = FastAPI(title="SMEM Repair Tracker", lifespan=lifespan)

app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY)

# API routes
app.include_router(auth.router, prefix="/api")
app.include_router(instruments.router, prefix="/api")
app.include_router(log_entries.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(attachments.router, prefix="/api")
app.include_router(config.router, prefix="/api")

# Serve uploaded files
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Serve frontend static files (parent directory)
frontend_dir = Path(__file__).resolve().parent.parent
app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")
