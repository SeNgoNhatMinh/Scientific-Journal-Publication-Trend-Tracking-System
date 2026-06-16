import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants/Config';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function getBackendAssetUrl(path?: string | null) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;

  const baseUrl = String(api.defaults.baseURL || "");
  if (!baseUrl || baseUrl.startsWith("/")) return path;

  // Replaces /api/v1 from baseUrl to get root URL
  const backendRoot = baseUrl.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");
  return `${backendRoot}${path.startsWith("/") ? path : `/${path}`}`;
}

api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Failed to get token from storage', error);
  }
  return config;
});

// Response interceptor to handle common errors like 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      try {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
      } catch (e) {
        console.error('Failed to clear credentials on 401', e);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
