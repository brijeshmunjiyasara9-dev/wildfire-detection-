# 🔥 WildfireWatch — Full MLOps Platform

> **AI-powered wildfire detection from video footage.** Real-time MobileNetV2-based binary classifier with sliding-window heatmap analysis. 97% accuracy on 30,000+ images.

![WildfireWatch Banner](https://img.shields.io/badge/WildfireWatch-MLOps_Platform-FF6B00?style=for-the-badge&logo=tensorflow)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)](https://react.dev)
[![TensorFlow](https://img.shields.io/badge/TensorFlow-2.16-FF6F00?style=flat&logo=tensorflow)](https://tensorflow.org)

---

## 🏗️ Architecture

```
Browser → Vercel (React) → Railway (FastAPI) → Turso (LibSQL) + Cloudflare R2
```

| Layer | Service | Free Tier |
|---|---|---|
| React Frontend | **Vercel** | ✅ Unlimited |
| FastAPI + ML Backend | **Railway** | ✅ 500 hrs/month |
| Database (metadata) | **Turso (LibSQL)** | ✅ 9GB, 1B reads/month |
| File Storage (videos/models) | **Cloudflare R2** | ✅ 10GB, 1M requests/month |

---

## 📁 Project Structure

```
wildfire-platform/
├── frontend/                      # React.js (Vite + Tailwind + Framer Motion)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx           # 3D landing page with methodology + demo
│   │   │   ├── Detect.jsx         # Video upload & detection job polling
│   │   │   ├── Research.jsx       # Detection archive + Recharts analytics
│   │   │   ├── Admin.jsx          # Admin dashboard (models/training/datasets)
│   │   │   └── AdminLogin.jsx     # JWT-protected login
│   │   ├── components/
│   │   │   ├── FireParticles.jsx  # Canvas-based fire particle animation
│   │   │   ├── NeuralNetwork3D.jsx# Animated neural network visualization
│   │   │   ├── Globe3D.jsx        # 3D rotating globe with hotspots
│   │   │   ├── Navbar.jsx         # Sticky navbar with API health check
│   │   │   └── StatsCard.jsx      # Metric card component
│   │   ├── api/client.js          # Axios API client
│   │   └── context/AuthContext.jsx# JWT auth context
│   ├── .env.example
│   └── vercel.json
│
├── backend/                       # Python FastAPI → Railway
│   ├── main.py                    # App entry, CORS, lifespan events
│   ├── Dockerfile                 # Railway container build
│   ├── railway.toml               # Railway deployment config
│   ├── requirements.txt
│   ├── routers/
│   │   ├── detection.py           # Video upload, job polling, streaming
│   │   ├── admin.py               # Models, training, datasets, demo mgmt
│   │   ├── demo.py                # Public demo video endpoints
│   │   └── research.py            # Detection archive & stats
│   ├── ml/
│   │   ├── inference.py           # MobileNetV2 single-image classifier
│   │   ├── trainer.py             # Transfer learning training pipeline
│   │   └── video_processor.py    # Sliding-window heatmap video processor
│   ├── db/
│   │   └── turso.py               # LibSQL (Turso) async client
│   ├── storage/
│   │   └── r2.py                  # Cloudflare R2 (S3-compatible) client
│   └── .env.example
│
└── docs/                          # Additional documentation
    ├── API.md                     # Full API reference
    └── SETUP.md                   # Detailed setup guide
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- Python 3.10+
- Turso CLI (optional, for local DB)

### 1. Clone & Setup

```bash
git clone https://github.com/YOUR_USERNAME/wildfirewatch.git
cd wildfirewatch
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Fill in your credentials in .env

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend Setup

```bash
cd frontend
cp .env.example .env.local
# Set VITE_API_BASE_URL=http://localhost:8000

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173` 🎉

---

## 🌐 Production Deployment

### Backend → Railway

1. **Create Railway project** at [railway.app](https://railway.app)
2. **Connect GitHub repo**, select `/backend` as root directory
3. **Set environment variables** in Railway dashboard:
   ```
   TURSO_DATABASE_URL=libsql://your-db.turso.io
   TURSO_AUTH_TOKEN=...
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD_HASH=<bcrypt hash>
   JWT_SECRET=<random 256-bit string>
   R2_ACCOUNT_ID=...
   R2_ACCESS_KEY_ID=...
   R2_SECRET_ACCESS_KEY=...
   R2_BUCKET_NAME=wildfirewatch
   R2_PUBLIC_URL=https://pub-xxxx.r2.dev
   ```
4. Railway auto-deploys via Dockerfile

### Frontend → Vercel

1. **Import GitHub repo** at [vercel.com](https://vercel.com)
2. Set **Root Directory** to `frontend`
3. **Add environment variable**:
   ```
   VITE_API_BASE_URL=https://your-app.up.railway.app
   ```
4. Deploy!

---

## 🧠 ML Model

### Architecture
```
MobileNetV2 (ImageNet pretrained, frozen)
    ↓
GlobalAveragePooling2D
    ↓
Dense(128, ReLU)
    ↓
Dense(1, Sigmoid)  → P(wildfire)
```

### Training
- **Dataset**: Wildfire Prediction Dataset — 30,250 train / 6,300 val / 6,300 test
- **Optimizer**: Adam (lr=0.001)
- **Loss**: Binary Crossentropy
- **Callbacks**: EarlyStopping(patience=3), ModelCheckpoint

### Performance (Test Set)
| Metric | Value |
|--------|-------|
| Accuracy | **97.02%** |
| Precision | 97.63% |
| Recall | 96.95% |
| F1 Score | **0.9729** |
| True Positives | 3,374 |
| False Positives | 82 |

### Video Detection Parameters
```python
IMAGE_SIZE = 224          # Model input resolution
CONFIDENCE_THRESHOLD = 0.6 # Wildfire alert threshold
DETECT_INTERVAL = 30       # Process every 30th frame
WINDOW_SIZE = 32           # Sliding window patch size
PROCESS_SCALE = 0.15       # Frame downscale factor
BATCH_SIZE = 2             # Windows per inference batch
MAX_FRAMES = 500           # Maximum frames to process
```

---

## 🔌 API Reference

### Detection
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/detect/upload` | Upload video for detection |
| GET | `/api/detect/job/{id}` | Poll job status |
| GET | `/api/detect/video/{id}` | Stream output video |

### Demo
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/demo/videos` | List active demo videos |
| GET | `/api/demo/stream/{id}/{type}` | Stream demo video |

### Research
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/research/detections` | Paginated detection history |
| GET | `/api/research/stats` | Aggregate statistics |

### Admin (JWT Required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/login` | Get JWT token |
| GET | `/api/admin/models` | List all models |
| POST | `/api/admin/models/upload` | Upload `.keras` model |
| POST | `/api/admin/models/{id}/activate` | Set active model |
| POST | `/api/admin/training/start` | Start training job |
| GET | `/api/admin/training/{id}/logs` | Get training logs |
| POST | `/api/admin/dataset/upload` | Upload image dataset (zip) |
| POST | `/api/admin/demo/upload` | Upload featured demo video |

---

## 📊 Database Schema (Turso)

### `models`
Stores ML model metadata — accuracy, version, active status, R2 file key.

### `detection_jobs`
Per-video detection results — status, wildfire %, confidence scores, processing time.

### `training_jobs`
Training run history — hyperparameters, epoch logs, final metrics.

### `dataset_uploads`
Uploaded image datasets — class counts, R2 keys.

### `demo_videos`
Homepage demo videos — both original and detection output R2 keys.

---

## 🔒 Security

- **JWT Authentication** for all admin routes (24h expiry, stored in React state)
- **Bcrypt password hashing** for admin credentials
- **Never expose credentials** in frontend code
- All binary files stored in R2, only R2 keys in database
- CORS configured per environment

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Tailwind CSS, Framer Motion, Recharts |
| Backend | Python 3.10, FastAPI, asyncio |
| ML | TensorFlow 2.16 (CPU), OpenCV, Pillow, NumPy |
| Database | Turso (LibSQL / SQLite edge) |
| Storage | Cloudflare R2 (S3-compatible) |
| Auth | JWT (python-jose), bcrypt (passlib) |
| Deployment | Railway (backend), Vercel (frontend) |

---

## 📝 Getting Your Model Into the System

1. **Train** in Kaggle notebook (see `real-time-wildfire-image-video-classification.ipynb`)
2. **Download** `wildfire_detection_model.keras` from Kaggle output
3. **Upload** to Cloudflare R2: `models/default/model.keras`
4. **Seed** the database:
   ```sql
   INSERT INTO models (id, name, version, file_path, accuracy, is_active, created_at)
   VALUES ('default', 'MobileNetV2-WildfireV1', '1.0',
           'models/default/model.keras', 0.9702, 1, '2025-04-02T00:00:00Z');
   ```
5. Or use the **Admin Panel** → Models tab to upload directly

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit: `git commit -m 'Add amazing feature'`
4. Push: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

*Built with ❤️ for wildfire research and early warning systems.*
