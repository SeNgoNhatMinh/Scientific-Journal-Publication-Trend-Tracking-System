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
    if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
      console.warn(`[SciTrend Network Error] Cannot reach the backend API at: "${api.defaults.baseURL}"`);
      console.warn('Troubleshooting tips:');
      console.warn('1. Check if the backend server is running on port 5000.');
      console.warn('2. If testing on a physical phone, make sure it is connected to the same Wi-Fi network.');
      console.warn('3. Ensure your computer firewall permits incoming connections on port 5000.');
      console.warn('4. To run in dev using the production Railway database, set EXPO_PUBLIC_USE_LOCAL_BACKEND=false in your .env file or environment.');
    }
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
