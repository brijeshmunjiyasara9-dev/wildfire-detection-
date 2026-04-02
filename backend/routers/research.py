"""
Public Research Routes - No auth required.
"""

from fastapi import APIRouter
from db import turso

router = APIRouter(prefix="/api/research", tags=["research"])


@router.get("/detections")
async def public_detections(page: int = 1, limit: int = 50):
    """Public list of all completed detection jobs for research."""
    offset = (page - 1) * limit
    result = await turso.execute(
        """SELECT id, status, total_frames, wildfire_frames, detection_percentage,
           max_confidence, avg_confidence, processing_time_seconds, created_at, completed_at
           FROM detection_jobs
           WHERE status = 'completed'
           ORDER BY created_at DESC LIMIT ? OFFSET ?""",
        [limit, offset],
    )
    cols = ["id", "status", "total_frames", "wildfire_frames", "detection_percentage",
            "max_confidence", "avg_confidence", "processing_time_seconds",
            "created_at", "completed_at"]

    total_result = await turso.execute(
        "SELECT COUNT(*) FROM detection_jobs WHERE status = 'completed'"
    )
    total = total_result.rows[0][0] if total_result.rows else 0

    return {
        "items": [dict(zip(cols, row)) for row in result.rows],
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.get("/stats")
async def research_stats():
    """Aggregate statistics for research charts."""
    total = await turso.execute("SELECT COUNT(*) FROM detection_jobs WHERE status = 'completed'")
    wildfire_count = await turso.execute(
        "SELECT COUNT(*) FROM detection_jobs WHERE status = 'completed' AND detection_percentage > 5"
    )
    avg_conf = await turso.execute(
        "SELECT AVG(max_confidence) FROM detection_jobs WHERE status = 'completed'"
    )
    daily = await turso.execute(
        """SELECT substr(created_at, 1, 10) as day, COUNT(*) as count
           FROM detection_jobs WHERE status = 'completed'
           GROUP BY day ORDER BY day DESC LIMIT 30"""
    )

    return {
        "total_detections": total.rows[0][0] if total.rows else 0,
        "wildfire_detections": wildfire_count.rows[0][0] if wildfire_count.rows else 0,
        "avg_max_confidence": round(float(avg_conf.rows[0][0] or 0), 4),
        "daily_counts": [{"date": r[0], "count": r[1]} for r in daily.rows],
    }
