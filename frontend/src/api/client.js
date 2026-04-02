import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 300000, // 5 min for video processing
});

// Inject JWT token for admin requests
api.interceptors.request.use((config) => {
  const token = window.__adminToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Detection ────────────────────────────────────────────────────────────────

export const uploadVideo = (file, sessionId, onProgress) => {
  const form = new FormData();
  form.append('file', file);
  if (sessionId) form.append('session_id', sessionId);
  return api.post('/api/detect/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress,
  });
};

export const getJobStatus = (jobId) => api.get(`/api/detect/job/${jobId}`);

export const getVideoStreamUrl = (jobId) => `${API_BASE}/api/detect/video/${jobId}`;

// ─── Demo ─────────────────────────────────────────────────────────────────────

export const getDemoVideos = () => api.get('/api/demo/videos');

export const getDemoStreamUrl = (demoId, type) =>
  `${API_BASE}/api/demo/stream/${demoId}/${type}`;

// ─── Research ─────────────────────────────────────────────────────────────────

export const getResearchDetections = (page = 1, limit = 50) =>
  api.get('/api/research/detections', { params: { page, limit } });

export const getResearchStats = () => api.get('/api/research/stats');

// ─── Admin ────────────────────────────────────────────────────────────────────

export const adminLogin = (username, password) =>
  api.post('/api/admin/login', { username, password });

export const getAdminModels = () => api.get('/api/admin/models');

export const uploadModel = (file, name, version, accuracy, notes) => {
  const form = new FormData();
  form.append('file', file);
  form.append('name', name);
  form.append('version', version);
  if (accuracy) form.append('accuracy', accuracy);
  if (notes) form.append('notes', notes);
  return api.post('/api/admin/models/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const activateModel = (modelId) =>
  api.post(`/api/admin/models/${modelId}/activate`);

export const startTraining = (body) => api.post('/api/admin/training/start', body);
export const getTrainingLogs = (jobId) => api.get(`/api/admin/training/${jobId}/logs`);
export const getTrainingJobs = () => api.get('/api/admin/training');

export const uploadDataset = (file, label) => {
  const form = new FormData();
  form.append('file', file);
  form.append('label', label);
  return api.post('/api/admin/dataset/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const getDatasets = () => api.get('/api/admin/datasets');

export const uploadDemoVideo = (file, title, description) => {
  const form = new FormData();
  form.append('file', file);
  form.append('title', title);
  if (description) form.append('description', description);
  return api.post('/api/admin/demo/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const getAdminDetections = (params) =>
  api.get('/api/admin/research/detections', { params });

export const healthCheck = () => api.get('/health');
