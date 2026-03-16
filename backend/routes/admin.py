from fastapi import APIRouter, HTTPException

from config import DEMO_MODE
from seed import seed

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/reset", status_code=204)
def reset_data():
    """Drop all data and re-seed. Demo mode only."""
    if not DEMO_MODE:
        raise HTTPException(403, "Reset is only available in demo mode")
    seed()
