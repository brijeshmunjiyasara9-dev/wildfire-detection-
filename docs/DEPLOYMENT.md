# 🚀 WildfireWatch Deployment Guide

## Step-by-Step Deployment

---

## Phase 1: Infrastructure Setup

### 1.1 Turso Database

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Login
turso auth login

# Create database
turso db create wildfirewatch

# Get connection info
turso db show wildfirewatch
# → URL: libsql://wildfirewatch-yourname.turso.io
# → Token: eyJ...

# Connect and verify
turso db shell wildfirewatch
# Run the schema manually or let the app initialize it on startup
```

### 1.2 Cloudflare R2 Storage

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **R2 Object Storage**
3. Create bucket: `wildfirewatch`
4. Enable **Public Access** on the bucket
5. Go to **Manage R2 API Tokens** → Create token
   - Permissions: Object Read & Write
   - Copy: Account ID, Access Key ID, Secret Access Key
6. Copy Public Bucket URL (format: `https://pub-xxxx.r2.dev`)

### 1.3 Upload Your Model

```bash
# Install rclone (or use Cloudflare dashboard)
rclone copy wildfire_detection_model.keras r2:wildfirewatch/models/default/model.keras

# Or use AWS CLI with R2 endpoint:
aws s3 cp wildfire_detection_model.keras \
  s3://wildfirewatch/models/default/model.keras \
  --endpoint-url https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
```

### 1.4 Seed Turso Database

```bash
# Connect to Turso
turso db shell wildfirewatch

# Seed initial model (after schema is initialized by the app)
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

---

## Phase 2: Backend Deployment (Railway)

### 2.1 Push Code to GitHub

```bash
cd backend
git init
git add .
git commit -m "Initial backend deployment"
gh repo create wildfirewatch-backend --public
git push origin main
```

### 2.2 Deploy to Railway

1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub repo → select `wildfirewatch-backend`
3. Railway detects the `Dockerfile` automatically

### 2.3 Set Environment Variables

In Railway dashboard → Variables:

```
TURSO_DATABASE_URL=libsql://wildfirewatch-yourname.turso.io
TURSO_AUTH_TOKEN=eyJ...your-token...
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$12$...bcrypt-hash-of-your-password...
JWT_SECRET=generate-256-bit-random-string-here
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=wildfirewatch
R2_PUBLIC_URL=https://pub-xxxx.r2.dev
MAX_VIDEO_SIZE_MB=500
TEMP_DIR=/tmp
FRONTEND_URL=https://your-vercel-app.vercel.app
```

### 2.4 Generate Admin Password Hash

```python
from passlib.context import CryptContext
ctx = CryptContext(schemes=['bcrypt'])
print(ctx.hash('your-secure-password'))
# Copy the output as ADMIN_PASSWORD_HASH
```

### 2.5 Get Railway URL

After deployment, Railway gives you:
`https://wildfirewatch-production.up.railway.app`

Test health: `curl https://your-app.up.railway.app/health`

---

## Phase 3: Frontend Deployment (Vercel)

### 3.1 Push Code to GitHub

```bash
cd frontend
git init
git add .
git commit -m "Initial frontend deployment"
gh repo create wildfirewatch-frontend --public
git push origin main
```

### 3.2 Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. New Project → Import from GitHub → select `wildfirewatch-frontend`
3. Framework: Vite (auto-detected)

### 3.3 Set Environment Variable

In Vercel → Settings → Environment Variables:
```
VITE_API_BASE_URL = https://your-railway-app.up.railway.app
```

### 3.4 Update Backend CORS

Add your Vercel URL to the backend's CORS config:
```python
# In backend/main.py, add to allowed_origins:
"https://your-project.vercel.app"
```

---

## Phase 4: Verify Deployment

```bash
# Check API health
curl https://your-railway-app.up.railway.app/health

# Expected response:
# {"status":"healthy","model_loaded":true}

# Test detection endpoint
curl -X GET https://your-railway-app.up.railway.app/api/demo/videos

# Admin login test
curl -X POST https://your-railway-app.up.railway.app/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'
```

---

## Common Issues

### Model Not Loading
- Check R2 credentials are correct
- Verify model path in Turso `models` table matches R2 key
- Check Railway logs: `railway logs`

### CORS Errors
- Add frontend URL to `allowed_origins` in `backend/main.py`
- Re-deploy backend

### Video Upload Fails
- Check `MAX_VIDEO_SIZE_MB` is set correctly
- Verify R2 bucket has write permissions
- Check temp directory is writable (`/tmp` on Railway)

### Database Connection
- Verify `TURSO_DATABASE_URL` format: `libsql://name.turso.io`
- Check auth token hasn't expired
- Turso free tier: 500 connections/month
