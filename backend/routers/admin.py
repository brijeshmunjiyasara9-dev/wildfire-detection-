"""
Admin API Routes - Protected endpoints for model management, training, datasets.
"""

import os
import uuid
import json
import asyncio
import zipfile
import shutil
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from concurrent.futures import ProcessPoolExecutor

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from passlib.context import CryptContext

from db import turso
from storage import r2
from ml import video_processor as vp

router = APIRouter(prefix="/api/admin", tags=["admin"])
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

TEMP_DIR = os.getenv("TEMP_DIR", "/tmp")
JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD_HASH = os.getenv("ADMIN_PASSWORD_HASH", "")


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        username = payload.get("sub")
        if username != ADMIN_USERNAME:
            raise HTTPException(status_code=403, detail="Forbidden")
        return username
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


# ─── AUTH ───────────────────────────────────────────────────────────────────

@router.post("/login")
async def admin_login(body: dict):
    username = body.get("username", "")
    password = body.get("password", "")

    if username != ADMIN_USERNAME:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Verify bcrypt hash
    if ADMIN_PASSWORD_HASH and not pwd_context.verify(password, ADMIN_PASSWORD_HASH):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    elif not ADMIN_PASSWORD_HASH and password != "admin":
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": username})
    return {"access_token": token, "token_type": "bearer", "expires_in": JWT_EXPIRE_HOURS * 3600}


# ─── MODELS ─────────────────────────────────────────────────────────────────

@router.get("/models")
async def list_models(user=Depends(verify_token)):
    result = await turso.execute(
        "SELECT * FROM models ORDER BY created_at DESC"
    )
    cols = ["id", "name", "version", "file_path", "architecture", "image_size",
            "confidence_threshold", "accuracy", "val_loss", "trained_on",
            "is_active", "created_at", "notes"]
    return [dict(zip(cols, row)) for row in result.rows]


@router.post("/models/upload")
async def upload_model(
    user=Depends(verify_token),
    file: UploadFile = File(...),
    name: str = Form(...),
    version: str = Form(...),
    accuracy: Optional[float] = Form(None),
    notes: Optional[str] = Form(None),
):
    """Upload a .keras or .h5 model file."""
    if not file.filename.endswith((".keras", ".h5")):
        raise HTTPException(status_code=400, detail="Only .keras or .h5 files allowed")

    model_id = str(uuid.uuid4())
    r2_key = f"models/{model_id}/model{os.path.splitext(file.filename)[1]}"
    tmp_path = os.path.join(TEMP_DIR, f"model_upload_{model_id}.keras")

    content = await file.read()
    with open(tmp_path, "wb") as f:
        f.write(content)

    if r2.check_r2_configured():
        await r2.upload_file(tmp_path, r2_key)
        os.remove(tmp_path)
    else:
        # Dev: keep locally and use tmp path as key
        r2_key = tmp_path

    now = utc_now()
    await turso.execute(
        """INSERT INTO models (id, name, version, file_path, accuracy, is_active, created_at, notes)
           VALUES (?, ?, ?, ?, ?, 0, ?, ?)""",
        [model_id, name, version, r2_key, accuracy, now, notes],
    )

    return {"model_id": model_id, "message": "Model uploaded successfully"}


@router.post("/models/{model_id}/activate")
async def activate_model(model_id: str, user=Depends(verify_token)):
    """Set a model as the active inference model."""
    result = await turso.execute("SELECT id FROM models WHERE id = ?", [model_id])
    if not result.rows:
        raise HTTPException(status_code=404, detail="Model not found")

    # Deactivate all
    await turso.execute("UPDATE models SET is_active = 0")
    # Activate selected
    await turso.execute("UPDATE models SET is_active = 1 WHERE id = ?", [model_id])

    # Reload inference model
    r2_key_result = await turso.execute(
        "SELECT file_path FROM models WHERE id = ?", [model_id]
    )
    r2_key = r2_key_result.rows[0][0]

    # Download and reload model in memory
    local_path = os.path.join(TEMP_DIR, f"model_{model_id}.keras")
    if not os.path.exists(local_path):
        if r2.check_r2_configured():
            await r2.download_file(r2_key, local_path)
        else:
            local_path = r2_key

    from ml.inference import set_active_model
    set_active_model(local_path)

    return {"message": f"Model {model_id} activated"}


# ─── TRAINING ────────────────────────────────────────────────────────────────

@router.post("/training/start")
async def start_training(body: dict, background_tasks: BackgroundTasks, user=Depends(verify_token)):
    base_model_id = body.get("base_model_id")
    dataset_ids = body.get("dataset_ids", [])
    epochs = body.get("epochs", 15)
    learning_rate = body.get("learning_rate", 0.001)
    batch_size = body.get("batch_size", 32)

    if not dataset_ids:
        raise HTTPException(status_code=400, detail="At least one dataset_id required")

    # Validate datasets exist
    for ds_id in dataset_ids:
        result = await turso.execute(
            "SELECT id, file_path FROM dataset_uploads WHERE id = ?", [ds_id]
        )
        if not result.rows:
            raise HTTPException(status_code=404, detail=f"Dataset {ds_id} not found")

    job_id = str(uuid.uuid4())
    now = utc_now()

    # Use first dataset path (could be merged for multi-dataset)
    ds_result = await turso.execute(
        "SELECT file_path FROM dataset_uploads WHERE id = ?", [dataset_ids[0]]
    )
    dataset_path = ds_result.rows[0][0]

    await turso.execute(
        """INSERT INTO training_jobs
           (id, status, dataset_path, base_model_id, epochs, batch_size, learning_rate, created_at)
           VALUES (?, 'queued', ?, ?, ?, ?, ?, ?)""",
        [job_id, dataset_path, base_model_id, epochs, batch_size, learning_rate, now],
    )

    background_tasks.add_task(
        _run_training_background, job_id, dataset_path, base_model_id,
        epochs, learning_rate, batch_size
    )

    return {"job_id": job_id, "status": "queued"}


async def _run_training_background(job_id, dataset_path, base_model_id, epochs, lr, batch_size):
    from ml.trainer import run_training_job

    try:
        now = utc_now()
        await turso.execute(
            "UPDATE training_jobs SET status = 'running', started_at = ? WHERE id = ?",
            [now, job_id],
        )

        # Get base model path if specified
        base_model_path = None
        if base_model_id:
            res = await turso.execute(
                "SELECT file_path FROM models WHERE id = ?", [base_model_id]
            )
            if res.rows:
                base_model_path = res.rows[0][0]
                if not os.path.exists(base_model_path):
                    local_path = os.path.join(TEMP_DIR, f"model_{base_model_id}.keras")
                    await r2.download_file(base_model_path, local_path)
                    base_model_path = local_path

        new_model_id = str(uuid.uuid4())
        output_path = os.path.join(TEMP_DIR, f"trained_{new_model_id}.keras")

        async def log_cb(log_json):
            await turso.execute(
                "UPDATE training_jobs SET log = ? WHERE id = ?",
                [log_json, job_id],
            )

        # Run in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: run_training_job(
                job_id=job_id,
                dataset_path=dataset_path,
                output_model_path=output_path,
                base_model_path=base_model_path,
                epochs=epochs,
                learning_rate=lr,
                batch_size=batch_size,
            ),
        )

        # Upload model to R2
        r2_key = f"models/{new_model_id}/model.keras"
        if r2.check_r2_configured():
            await r2.upload_file(output_path, r2_key)
        else:
            r2_key = output_path

        # Save model record
        model_now = utc_now()
        await turso.execute(
            """INSERT INTO models (id, name, version, file_path, accuracy, val_loss,
               trained_on, is_active, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)""",
            [
                new_model_id,
                f"AutoTrained-{job_id[:8]}",
                "auto",
                r2_key,
                result["final_accuracy"],
                result["final_val_loss"],
                result["train_images"],
                model_now,
            ],
        )

        # Update training job
        complete_now = utc_now()
        await turso.execute(
            """UPDATE training_jobs SET
               status = 'completed', new_model_id = ?,
               train_images = ?, val_images = ?,
               final_accuracy = ?, final_val_loss = ?,
               log = ?, completed_at = ?
               WHERE id = ?""",
            [
                new_model_id,
                result["train_images"],
                result["val_images"],
                result["final_accuracy"],
                result["final_val_loss"],
                result["training_log"],
                complete_now,
                job_id,
            ],
        )

    except Exception as e:
        print(f"[Training BG] Job {job_id} failed: {e}")
        await turso.execute(
            "UPDATE training_jobs SET status = 'failed', log = ? WHERE id = ?",
            [str(e), job_id],
        )


@router.get("/training/{job_id}/logs")
async def get_training_logs(job_id: str, user=Depends(verify_token)):
    result = await turso.execute(
        "SELECT status, log, final_accuracy, final_val_loss, completed_at FROM training_jobs WHERE id = ?",
        [job_id],
    )
    if not result.rows:
        raise HTTPException(status_code=404, detail="Training job not found")
    row = result.rows[0]
    return {
        "status": row[0],
        "log": json.loads(row[1]) if row[1] else [],
        "final_accuracy": row[2],
        "final_val_loss": row[3],
        "completed_at": row[4],
    }


@router.get("/training")
async def list_training_jobs(user=Depends(verify_token)):
    result = await turso.execute(
        "SELECT * FROM training_jobs ORDER BY created_at DESC"
    )
    cols = ["id", "status", "dataset_path", "base_model_id", "new_model_id",
            "epochs", "batch_size", "learning_rate", "image_size",
            "train_images", "val_images", "final_accuracy", "final_val_loss",
            "log", "started_at", "completed_at", "created_at"]
    return [dict(zip(cols, row)) for row in result.rows]


# ─── DATASETS ────────────────────────────────────────────────────────────────

@router.post("/dataset/upload")
async def upload_dataset(
    user=Depends(verify_token),
    file: UploadFile = File(...),
    label: str = Form(...),
):
    """Upload a zip file with images organized as wildfire/ and nowildfire/ folders."""
    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip files allowed")
    if label not in ("wildfire", "nowildfire", "mixed"):
        raise HTTPException(status_code=400, detail="label must be wildfire, nowildfire, or mixed")

    ds_id = str(uuid.uuid4())
    tmp_zip = os.path.join(TEMP_DIR, f"dataset_{ds_id}.zip")
    extract_dir = os.path.join(TEMP_DIR, f"dataset_{ds_id}")

    content = await file.read()
    with open(tmp_zip, "wb") as f:
        f.write(content)

    # Extract and count images
    os.makedirs(extract_dir, exist_ok=True)
    with zipfile.ZipFile(tmp_zip, "r") as zip_ref:
        zip_ref.extractall(extract_dir)
    os.remove(tmp_zip)

    # Count images
    image_extensions = {".jpg", ".jpeg", ".png", ".bmp"}
    image_count = sum(
        1 for root, _, files in os.walk(extract_dir)
        for f in files
        if os.path.splitext(f)[1].lower() in image_extensions
    )

    # Upload to R2
    r2_key = f"datasets/{ds_id}"
    if r2.check_r2_configured():
        # Re-zip for storage
        rezip_path = tmp_zip
        shutil.make_archive(rezip_path.replace(".zip", ""), "zip", extract_dir)
        await r2.upload_file(rezip_path, r2_key + ".zip")
        r2_key = r2_key + ".zip"
        os.remove(rezip_path)
    else:
        r2_key = extract_dir  # Dev: use local dir

    now = utc_now()
    await turso.execute(
        """INSERT INTO dataset_uploads (id, filename, file_path, label, image_count, created_at)
           VALUES (?, ?, ?, ?, ?, ?)""",
        [ds_id, file.filename, r2_key, label, image_count, now],
    )

    return {
        "dataset_id": ds_id,
        "image_count": image_count,
        "label": label,
        "message": "Dataset uploaded successfully",
    }


@router.get("/datasets")
async def list_datasets(user=Depends(verify_token)):
    result = await turso.execute(
        "SELECT * FROM dataset_uploads ORDER BY created_at DESC"
    )
    cols = ["id", "filename", "file_path", "label", "image_count",
            "uploaded_by", "used_in_training_job", "created_at"]
    return [dict(zip(cols, row)) for row in result.rows]


# ─── DEMO VIDEOS ─────────────────────────────────────────────────────────────

@router.post("/demo/upload")
async def upload_demo_video(
    background_tasks: BackgroundTasks,
    user=Depends(verify_token),
    file: UploadFile = File(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
):
    """Upload a video, run detection, make it the featured demo."""
    demo_id = str(uuid.uuid4())
    orig_r2_key = f"demos/{demo_id}_original.mp4"
    detected_r2_key = f"demos/{demo_id}_detected.mp4"
    tmp_path = os.path.join(TEMP_DIR, f"demo_upload_{demo_id}.mp4")

    content = await file.read()
    with open(tmp_path, "wb") as f:
        f.write(content)

    if r2.check_r2_configured():
        await r2.upload_file(tmp_path, orig_r2_key)
    else:
        orig_r2_key = tmp_path

    # Get active model
    result = await turso.execute("SELECT id FROM models WHERE is_active = 1 LIMIT 1")
    model_id = result.rows[0][0] if result.rows else None

    now = utc_now()
    await turso.execute(
        """INSERT INTO demo_videos (id, title, description, original_path, detection_path,
           model_id, is_active, created_at)
           VALUES (?, ?, ?, ?, '', ?, 0, ?)""",
        [demo_id, title, description, orig_r2_key, model_id, now],
    )

    background_tasks.add_task(
        _run_demo_detection, demo_id, orig_r2_key, detected_r2_key, model_id, tmp_path
    )

    return {"demo_id": demo_id, "status": "processing", "message": "Demo video processing started"}


async def _run_demo_detection(demo_id, orig_r2_key, detected_r2_key, model_id, tmp_path):
    try:
        input_tmp = tmp_path if os.path.exists(tmp_path) else os.path.join(TEMP_DIR, f"demo_{demo_id}_input.mp4")
        output_tmp = os.path.join(TEMP_DIR, f"demo_{demo_id}_output.mp4")

        if not os.path.exists(input_tmp):
            await r2.download_file(orig_r2_key, input_tmp)

        # Get model
        res = await turso.execute("SELECT file_path FROM models WHERE id = ?", [model_id])
        model_r2_key = res.rows[0][0]
        model_local = os.path.join(TEMP_DIR, f"model_{model_id}.keras")
        if not os.path.exists(model_local):
            await r2.download_file(model_r2_key, model_local)

        stats = vp.process_video(model_local, input_tmp, output_tmp)

        if r2.check_r2_configured():
            await r2.upload_file(output_tmp, detected_r2_key)
        else:
            detected_r2_key = output_tmp

        # Deactivate old demos, activate new one
        await turso.execute("UPDATE demo_videos SET is_active = 0")
        await turso.execute(
            """UPDATE demo_videos SET
               detection_path = ?, detection_percentage = ?,
               max_confidence = ?, is_active = 1
               WHERE id = ?""",
            [detected_r2_key, stats["detection_percentage"], stats["max_confidence"], demo_id],
        )
    except Exception as e:
        print(f"[Demo Detection] Failed for {demo_id}: {e}")


# ─── RESEARCH ────────────────────────────────────────────────────────────────

@router.get("/research/detections")
async def get_detection_archive(
    user=Depends(verify_token),
    page: int = 1,
    limit: int = 50,
    min_confidence: Optional[float] = None,
    status: Optional[str] = None,
):
    """Paginated detection archive for research export."""
    offset = (page - 1) * limit
    conditions = []
    params = []

    if min_confidence is not None:
        conditions.append("max_confidence >= ?")
        params.append(min_confidence)
    if status:
        conditions.append("status = ?")
        params.append(status)

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    params.extend([limit, offset])

    result = await turso.execute(
        f"SELECT * FROM detection_jobs {where} ORDER BY created_at DESC LIMIT ? OFFSET ?",
        params,
    )
    cols = ["id", "user_session", "original_video_path", "output_video_path",
            "status", "model_id", "confidence_threshold", "total_frames",
            "wildfire_frames", "detection_percentage", "max_confidence",
            "avg_confidence", "processing_time_seconds", "error_message",
            "is_demo", "created_at", "completed_at"]

    total_result = await turso.execute(f"SELECT COUNT(*) FROM detection_jobs {where}", params[:-2])
    total = total_result.rows[0][0] if total_result.rows else 0

    return {
        "items": [dict(zip(cols, row)) for row in result.rows],
        "total": total,
        "page": page,
        "limit": limit,
    }
