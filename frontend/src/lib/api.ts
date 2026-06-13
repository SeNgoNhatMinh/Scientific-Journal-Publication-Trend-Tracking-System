import axios from 'axios';

// In dev: requests go to localhost:5173/api/v1 → Vite proxies to Railway backend (no CORS)
// In production: VITE_API_BASE_URL should point to the real backend URL
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

export function getBackendAssetUrl(path?: string | null) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;

  const baseUrl = String(api.defaults.baseURL || "");
  if (!baseUrl || baseUrl.startsWith("/")) return path;

  const backendRoot = baseUrl.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");
  return `${backendRoot}${path.startsWith("/") ? path : `/${path}`}`;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle common errors like 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and optionally trigger a global event or redirect to login
      localStorage.removeItem('token');
      // window.location.href = '/login'; // Let the router handle it if possible
    }
    return Promise.reject(error);
  }
);

export default api;
