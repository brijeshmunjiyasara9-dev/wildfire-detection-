"""
Demo Video Routes - Public access to featured demo detections.
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import os

from db import turso
from storage import r2

router = APIRouter(prefix="/api/demo", tags=["demo"])

TEMP_DIR = os.getenv("TEMP_DIR", "/tmp")


@router.get("/videos")
async def list_demo_videos():
    """List all active demo videos for the homepage."""
    result = await turso.execute(
        "SELECT * FROM demo_videos WHERE is_active = 1 ORDER BY created_at DESC"
    )
    cols = ["id", "title", "description", "original_path", "detection_path",
            "model_id", "detection_percentage", "max_confidence", "is_active", "created_at"]

    demos = []
    for row in result.rows:
        demo = dict(zip(cols, row))
        if r2.check_r2_configured():
            demo["original_url"] = r2.get_public_url(demo["original_path"])
            demo["detection_url"] = r2.get_public_url(demo["detection_path"])
        else:
            demo["original_url"] = f"/api/demo/stream/{demo['id']}/original"
            demo["detection_url"] = f"/api/demo/stream/{demo['id']}/detected"
        demos.append(demo)

    return demos


@router.get("/stream/{demo_id}/{video_type}")
async def stream_demo_video(demo_id: str, video_type: str):
    """Stream a demo video (original or detected)."""
    if video_type not in ("original", "detected"):
        raise HTTPException(status_code=400, detail="video_type must be 'original' or 'detected'")

    result = await turso.execute(
        "SELECT original_path, detection_path FROM demo_videos WHERE id = ?",
        [demo_id],
    )
    if not result.rows:
        raise HTTPException(status_code=404, detail="Demo not found")

    row = result.rows[0]
    r2_key = row[0] if video_type == "original" else row[1]

    if os.path.exists(r2_key):
        local_path = r2_key
    else:
        local_path = os.path.join(TEMP_DIR, f"demo_{demo_id}_{video_type}.mp4")
        if not os.path.exists(local_path):
            await r2.download_file(r2_key, local_path)

    def iter_file():
        with open(local_path, "rb") as f:
            yield from f

    return StreamingResponse(iter_file(), media_type="video/mp4")
