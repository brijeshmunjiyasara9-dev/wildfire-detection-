# WildfireWatch API Reference

Base URL: `https://your-backend.up.railway.app`

## Authentication

Admin endpoints require a Bearer JWT token:
```
Authorization: Bearer <token>
```

Get token via `POST /api/admin/login`.

---

## Public Endpoints

### `GET /health`
Health check.
```json
{"status": "healthy", "model_loaded": true}
```

### `POST /api/detect/upload`
Upload video for detection.

**Request:** `multipart/form-data`
- `file` (required): Video file (MP4, AVI, MOV, max 500MB)
- `session_id` (optional): String session identifier

**Response:**
```json
{
  "job_id": "uuid",
  "status": "queued",
  "message": "Video uploaded successfully"
}
```

### `GET /api/detect/job/{job_id}`
Poll job status.

**Response:**
```json
{
  "id": "uuid",
  "status": "completed",
  "detection_percentage": 45.2,
  "max_confidence": 0.94,
  "avg_confidence": 0.71,
  "total_frames": 500,
  "wildfire_frames": 226,
  "processing_time_seconds": 42.1,
  "output_video_url": "https://..."
}
```

Status values: `queued | processing | completed | failed`

### `GET /api/detect/video/{job_id}`
Stream the processed output video.

### `GET /api/demo/videos`
List active demo videos for homepage.

### `GET /api/research/detections?page=1&limit=50`
Public detection archive (completed jobs only).

### `GET /api/research/stats`
Aggregate statistics for charts.
```json
{
  "total_detections": 142,
  "wildfire_detections": 67,
  "avg_max_confidence": 0.78,
  "daily_counts": [{"date": "2025-04-01", "count": 5}, ...]
}
```

---

## Admin Endpoints

All require `Authorization: Bearer <jwt>`

### `POST /api/admin/login`
```json
{"username": "admin", "password": "your-password"}
```
Response:
```json
{"access_token": "eyJ...", "token_type": "bearer", "expires_in": 86400}
```

### `GET /api/admin/models`
List all models in registry.

### `POST /api/admin/models/upload`
Upload `.keras` or `.h5` model file.

**Request:** `multipart/form-data`
- `file`: Model file
- `name`: Model name
- `version`: Version string
- `accuracy` (optional): Float 0-1
- `notes` (optional): Text

### `POST /api/admin/models/{model_id}/activate`
Set model as active for all future detections.

### `POST /api/admin/training/start`
```json
{
  "base_model_id": "uuid-or-null",
  "dataset_ids": ["uuid1", "uuid2"],
  "epochs": 15,
  "learning_rate": 0.001,
  "batch_size": 32
}
```

### `GET /api/admin/training/{job_id}/logs`
Poll training progress.
```json
{
  "status": "running",
  "log": [
    {"epoch": 1, "accuracy": 0.92, "val_accuracy": 0.95, "loss": 0.21, "val_loss": 0.14}
  ],
  "final_accuracy": null
}
```

### `POST /api/admin/dataset/upload`
Upload ZIP dataset.

**Request:** `multipart/form-data`
- `file`: ZIP file with `wildfire/` and `nowildfire/` dirs
- `label`: `wildfire | nowildfire | mixed`

### `POST /api/admin/demo/upload`
Upload demo video (triggers detection automatically).

**Request:** `multipart/form-data`
- `file`: Video file
- `title`: Display title
- `description` (optional): Text

### `GET /api/admin/research/detections`
Full detection archive with all metadata (paginated).
Query params: `page`, `limit`, `min_confidence`, `status`
