from fastapi import APIRouter

from seed import seed

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/reset", status_code=204)
def reset_data():
    """Drop all data and re-seed. Demo mode only."""
    seed()
