# 🔥 WildfireWatch — AI MLOps Platform

> Real-time wildfire detection from video footage using **MobileNetV2 transfer learning** with sliding-window heatmap analysis. Full-stack MLOps platform with model registry, training pipeline, and research archive.

[![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?logo=react)](./frontend)
[![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](./backend)
[![Model](https://img.shields.io/badge/ML-TensorFlow%20%2B%20MobileNetV2-FF6F00?logo=tensorflow)](./backend/ml)
[![DB](https://img.shields.io/badge/Database-Turso%20LibSQL-4FC3F7)](https://turso.tech)
[![Storage](https://img.shields.io/badge/Storage-Cloudflare%20R2-F48120?logo=cloudflare)](https://cloudflare.com)

---

## 📊 Model Performance

| Metric | Value |
|--------|-------|
| Test Accuracy | **97.02%** |
| Precision | **97.63%** |
| Recall | **96.95%** |
| F1 Score | **0.9729** |
| Training Images | 30,250 |
| Architecture | MobileNetV2 + Custom Head |

---

## 🏗️ Architecture

```
Browser → Vercel (React SPA) → Railway (FastAPI) → Turso (LibSQL) + Cloudflare R2
```

| Layer | Service | Purpose |
|-------|---------|---------|
| Frontend | **Vercel** | React.js SPA with Tailwind + Framer Motion |
| Backend | **Railway** | Python FastAPI with TensorFlow (persistent) |
| Database | **Turso** | All metadata: jobs, models, training records |
| Storage | **Cloudflare R2** | Binary files: videos, .keras models, datasets |

---

## 📁 Project Structure

```
wildfire-platform/
├── frontend/                    # React.js (Vite + Tailwind CSS)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx         # Landing page + methodology + demo
│   │   │   ├── Detect.jsx       # Video upload & real-time detection
│   │   │   ├── Research.jsx     # Public detection archive + charts
│   │   │   ├── Admin.jsx        # Protected admin panel
│   │   │   └── AdminLogin.jsx   # JWT auth login
│   │   ├── components/
│   │   │   ├── Navbar.jsx       # Navigation + API health status
│   │   │   ├── FireParticles.jsx # Canvas fire animation
│   │   │   └── StatsCard.jsx    # Metric display cards
│   │   ├── api/
│   │   │   └── client.js        # Axios API client
│   │   └── context/
│   │       └── AuthContext.jsx  # JWT state management
│   ├── vercel.json              # Vercel deployment config
│   └── .env.example
│
├── backend/                     # Python FastAPI → Railway
│   ├── main.py                  # FastAPI app entry point
│   ├── Dockerfile               # Railway container
│   ├── railway.toml             # Railway config
│   ├── requirements.txt
│   ├── routers/
│   │   ├── detection.py         # Video upload & job management
│   │   ├── demo.py              # Public demo video routes
│   │   ├── admin.py             # Protected admin routes
│   │   └── research.py         # Public research data routes
│   ├── ml/
│   │   ├── inference.py         # Single image + batch classification
│   │   ├── trainer.py           # MobileNetV2 transfer learning
│   │   └── video_processor.py  # Sliding window heatmap detection
│   ├── db/
│   │   └── turso.py             # Turso LibSQL connection
│   └── storage/
│       └── r2.py                # Cloudflare R2 (S3-compatible)
│
└── README.md
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Python 3.10+
- Node.js 18+
- Turso account (free at turso.tech)
- Cloudflare account with R2 enabled (free 10GB)

### 1. Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Copy and fill environment variables
cp .env.example .env
# Edit .env with your Turso URL, R2 credentials, etc.

# Start the server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will auto-initialize the database schema on first start.

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy and configure
cp .env.example .env.local
# Set VITE_API_BASE_URL=http://localhost:8000

# Start development server
npm run dev
```

Visit `http://localhost:5173`

### 3. Seed Initial Model

After training your model in Kaggle:

1. Download `wildfire_detection_model.keras` from Kaggle output
2. Upload to Cloudflare R2 at path: `models/default/model.keras`
3. Insert seed record in Turso:

```sql
INSERT INTO models (id, name, version, file_path, accuracy, is_active, created_at)
VALUES (
  'default',
  'MobileNetV2-WildfireV1',
  '1.0',
  'models/default/model.keras',
  0.9702,
  1,
  '2025-04-02T00:00:00Z'
);
```

Or use the Admin panel → Models → Upload Model

---

## 🌐 Production Deployment

### Backend → Railway

1. Push `backend/` to GitHub
2. Connect repo to Railway (railway.app)
3. Set all environment variables in Railway dashboard:

```
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$12$...
JWT_SECRET=your-256-bit-secret
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-key-id
R2_SECRET_ACCESS_KEY=your-secret
R2_BUCKET_NAME=wildfirewatch
R2_PUBLIC_URL=https://pub-xxxx.r2.dev
MAX_VIDEO_SIZE_MB=500
TEMP_DIR=/tmp
FRONTEND_URL=https://your-app.vercel.app
```

4. Railway auto-builds from Dockerfile

### Frontend → Vercel

1. Push `frontend/` to GitHub
2. Import in Vercel
3. Set environment variable:
   - `VITE_API_BASE_URL` = Your Railway URL (e.g., `https://wildfirewatch.up.railway.app`)
4. Deploy

---

## 🔑 Admin Panel

- Navigate to `/admin/login`
- Default credentials (set in `.env`): `admin` / your password
- Token expires in 24 hours
- **Never stored in localStorage** — re-login on refresh for security

### Admin Capabilities:
- **Dashboard**: Model stats, today's job count
- **Models**: Upload .keras models, activate deployment model
- **Training**: Start new training runs with custom hyperparameters, live log viewer
- **Datasets**: Upload ZIP datasets for training (wildfire/nowildfire structure)
- **Demo Videos**: Upload featured detection demo for homepage
- **Research Export**: Full detection archive in CSV/JSON

---

## 🧠 ML Pipeline Details

### Model Architecture
```
Input (224×224×3)
  → MobileNetV2 (frozen ImageNet weights, 2.26M params)
  → GlobalAveragePooling2D
  → Dense(128, ReLU)
  → Dense(1, Sigmoid)
Output: P(wildfire)
```

### Video Detection Algorithm
```
For each video:
  For every 30th frame:
    1. Resize frame to 15% scale for speed
    2. Slide 32×32 window across resized frame
    3. Batch-predict windows (batch_size=2)
    4. Build confidence heatmap
    5. Threshold at 0.6 → fire regions
    6. Find contours → bounding boxes
    7. Overlay heatmap (red/orange gradient)
    8. Track: wildfire_frames, max_conf, avg_conf
```

---

## 📡 API Reference

### Public Endpoints
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Health & info |
| `GET` | `/health` | Health check + model status |
| `POST` | `/api/detect/upload` | Upload video for detection |
| `GET` | `/api/detect/job/{id}` | Poll job status |
| `GET` | `/api/detect/video/{id}` | Stream output video |
| `GET` | `/api/demo/videos` | List demo videos |
| `GET` | `/api/research/detections` | Public detection archive |
| `GET` | `/api/research/stats` | Aggregate statistics |

### Admin Endpoints (Bearer JWT required)
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/admin/login` | Get JWT token |
| `GET` | `/api/admin/models` | List all models |
| `POST` | `/api/admin/models/upload` | Upload .keras model |
| `POST` | `/api/admin/models/{id}/activate` | Set active model |
| `POST` | `/api/admin/training/start` | Start training job |
| `GET` | `/api/admin/training/{id}/logs` | Poll training logs |
| `POST` | `/api/admin/dataset/upload` | Upload ZIP dataset |
| `POST` | `/api/admin/demo/upload` | Upload demo video |

Interactive docs available at `/docs` when backend is running.

---

## 🗃️ Database Schema (Turso LibSQL)

- **models**: Model registry with accuracy, architecture, R2 path
- **detection_jobs**: All detection runs with stats and video paths  
- **training_jobs**: Training history with epoch-by-epoch logs
- **dataset_uploads**: Dataset catalog with image counts
- **demo_videos**: Homepage demo configuration

---

## 🛡️ Security

- JWT tokens stored in **React state only** (not localStorage)
- Admin password stored as **bcrypt hash** in env vars
- All API tokens stored as **Railway environment variables**
- R2 presigned URLs for temporary video access
- CORS configured to allow only your frontend domain

---

## 📝 License

MIT License — Free for academic and research use.

---

## 🙏 Acknowledgments

- **Dataset**: Wildfire Prediction Dataset (Kaggle)
- **Architecture**: MobileNetV2 (Google Brain)
- **Framework**: FastAPI + React
- **Deployment**: Railway + Vercel + Turso + Cloudflare
