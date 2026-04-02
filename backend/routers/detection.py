"""
Detection API Routes - Video upload, job polling, streaming.
"""

import os
import uuid
import asyncio
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse, JSONResponse

from db import turso
from storage import r2
from ml import inference as infer
from ml import video_processor as vp

router = APIRouter(prefix="/api/detect", tags=["detection"])

TEMP_DIR = os.getenv("TEMP_DIR", "/tmp")
MAX_VIDEO_SIZE_MB = int(os.getenv("MAX_VIDEO_SIZE_MB", "500"))


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


async def _get_active_model_path() -> Optional[str]:
    """Return local path to active model (download from R2 if needed)."""
    result = await turso.execute(
        "SELECT id, file_path FROM models WHERE is_active = 1 LIMIT 1"
    )
    if not result.rows:
        return None
    row = result.rows[0]
    r2_key = row[1]
    local_path = os.path.join(TEMP_DIR, f"model_{row[0]}.keras")
    if not os.path.exists(local_path):
        if r.check_r2_configured():
            await r2.download_file(r2_key, local_path)
        else:
            return None
    return local_path


async def _run_detection_background(
    job_id: str,
    input_r2_key: str,
    model_id: Optional[str],
):
    """Background task: download → process → upload → update DB."""
    input_tmp = os.path.join(TEMP_DIR, f"{job_id}_input.mp4")
    output_tmp = os.path.join(TEMP_DIR, f"{job_id}_output.mp4")

    try:
        # Update status to processing
        await turso.execute(
            "UPDATE detection_jobs SET status = ? WHERE id = ?",
            ["processing", job_id],
        )

        # Get active model
        result = await turso.execute(
            "SELECT id, file_path FROM models WHERE is_active = 1 LIMIT 1"
        )
        if not result.rows:
            raise RuntimeError("No active model found")

        model_row = result.rows[0]
        model_r2_key = model_row[1]
        model_local = os.path.join(TEMP_DIR, f"model_{model_row[0]}.keras")

        # Download model if not cached
        if not os.path.exists(model_local):
            await r2.download_file(model_r2_key, model_local)

        # Download input video
        await r2.download_file(input_r2_key, input_tmp)

        # Process video
        stats = vp.process_video(model_local, input_tmp, output_tmp)

        # Upload output video
        output_r2_key = f"outputs/{job_id}_detected.mp4"
        await r2.upload_file(output_tmp, output_r2_key)

        # Update DB with results
        now = utc_now()
        await turso.execute(
            """UPDATE detection_jobs SET
                status = 'completed',
                output_video_path = ?,
                total_frames = ?,
                wildfire_frames = ?,
                detection_percentage = ?,
                max_confidence = ?,
                avg_confidence = ?,
                processing_time_seconds = ?,
                completed_at = ?
               WHERE id = ?""",
            [
                output_r2_key,
                stats["total_frames"],
                stats["wildfire_frames"],
                stats["detection_percentage"],
                stats["max_confidence"],
                stats["avg_confidence"],
                stats["processing_time_seconds"],
                now,
                job_id,
            ],
        )

    except Exception as e:
        print(f"[Detection BG] Job {job_id} failed: {e}")
        await turso.execute(
            "UPDATE detection_jobs SET status = 'failed', error_message = ? WHERE id = ?",
            [str(e), job_id],
        )
    finally:
        # Clean up temp files
        for f in [input_tmp, output_tmp]:
            if os.path.exists(f):
                try:
                    os.remove(f)
                except:
                    pass


@router.post("/upload")
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    session_id: Optional[str] = None,
):
    """Upload a video for wildfire detection."""
    # Validate file type
    allowed_types = {"video/mp4", "video/avi", "video/quicktime", "video/x-msvideo"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Unsupported file type. Use MP4, AVI, or MOV.")

    job_id = str(uuid.uuid4())
    r2_key = f"uploads/{job_id}_{file.filename}"
    tmp_path = os.path.join(TEMP_DIR, f"{job_id}_upload.mp4")

    try:
        # Save upload to tmp
        content = await file.read()
        size_mb = len(content) / (1024 * 1024)
        if size_mb > MAX_VIDEO_SIZE_MB:
            raise HTTPException(status_code=413, detail=f"File too large. Max {MAX_VIDEO_SIZE_MB}MB.")

        with open(tmp_path, "wb") as f:
            f.write(content)

        # Upload to R2
        if r2.check_r2_configured():
            await r2.upload_file(tmp_path, r2_key)
        else:
            # Dev mode: keep file locally
            r2_key = tmp_path

        # Create DB record
        now = utc_now()
        result = await turso.execute(
            "SELECT id FROM models WHERE is_active = 1 LIMIT 1"
        )
        model_id = result.rows[0][0] if result.rows else None

        await turso.execute(
            """INSERT INTO detection_jobs
               (id, user_session, original_video_path, status, model_id, created_at)
               VALUES (?, ?, ?, 'queued', ?, ?)""",
            [job_id, session_id, r2_key, model_id, now],
        )

        # Queue background processing
        background_tasks.add_task(_run_detection_background, job_id, r2_key, model_id)

        return {"job_id": job_id, "status": "queued", "message": "Video uploaded successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(tmp_path) and r2.check_r2_configured():
            try:
                os.remove(tmp_path)
            except:
                pass


@router.get("/job/{job_id}")
async def get_job_status(job_id: str):
    """Poll detection job status."""
    result = await turso.execute(
        "SELECT * FROM detection_jobs WHERE id = ?", [job_id]
    )
    if not result.rows:
        raise HTTPException(status_code=404, detail="Job not found")

    row = result.rows[0]
    cols = [c[0] for c in result.columns] if hasattr(result, 'columns') else [
        "id", "user_session", "original_video_path", "output_video_path",
        "status", "model_id", "confidence_threshold", "total_frames",
        "wildfire_frames", "detection_percentage", "max_confidence",
        "avg_confidence", "processing_time_seconds", "error_message",
        "is_demo", "created_at", "completed_at",
    ]
    job = dict(zip(cols, row))

    # Add video URL if completed
    if job.get("output_video_path") and job["status"] == "completed":
        if r2.check_r2_configured():
            job["output_video_url"] = r2.get_public_url(job["output_video_path"])
        else:
            job["output_video_url"] = f"/api/detect/video/{job_id}"

    return job


@router.get("/video/{job_id}")
async def stream_output_video(job_id: str):
    """Stream the processed detection video."""
    result = await turso.execute(
        "SELECT output_video_path FROM detection_jobs WHERE id = ? AND status = 'completed'",
        [job_id],
    )
    if not result.rows:
        raise HTTPException(status_code=404, detail="Video not found or not ready")

    r2_key = result.rows[0][0]

    # If local path (dev mode)
    if os.path.exists(r2_key):
        local_path = r2_key
    else:
        local_path = os.path.join(TEMP_DIR, f"{job_id}_stream.mp4")
        if not os.path.exists(local_path):
            await r2.download_file(r2_key, local_path)

    def iter_file():
        with open(local_path, "rb") as f:
            yield from f

    return StreamingResponse(iter_file(), media_type="video/mp4")
