import { Platform } from 'react-native';
import Constants from 'expo-constants';

const RAILWAY_URL = 'https://scientific-journal-publication-trend-tracking-sy-production.up.railway.app';
const MANUAL_DEV_IP = '';

// Dev mặc định dùng backend local. Set EXPO_PUBLIC_USE_LOCAL_BACKEND=false nếu muốn proxy Railway.
const USE_LOCAL = process.env.EXPO_PUBLIC_USE_LOCAL_BACKEND !== 'true';

const getLocalBackendTarget = () => {
  if (process.env.EXPO_PUBLIC_BACKEND_URL) {
    return process.env.EXPO_PUBLIC_BACKEND_URL;
  }
  if (MANUAL_DEV_IP) {
    return `http://${MANUAL_DEV_IP}:5000`;
  }

  const debuggerHost = Constants.expoConfig?.hostUri || '';
  const ip = debuggerHost.split(':')[0];

  // Verify it is a valid local network IP range (192.168.x.x, 10.x.x.x, 172.x.x.x)
  const isLocalIp = ip && /^(192\.168\.|10\.|172\.)/.test(ip);

  if (isLocalIp) {
    return `http://${ip}:5000`;
  }
  return Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';
};

const BACKEND_TARGET = USE_LOCAL ? getLocalBackendTarget() : RAILWAY_URL;

// Ensure we append /api/v1 if not present, and handle trailing slashes nicely
const formatApiUrl = (url: string) => {
  const cleanUrl = url.replace(/\/$/, ""); // remove trailing slash
  return cleanUrl.endsWith('/api/v1') ? cleanUrl : `${cleanUrl}/api/v1`;
};

// Set the active API endpoint
export const API_BASE_URL = formatApiUrl(BACKEND_TARGET);

// Export for backward compatibility or diagnostics if needed
export const PRODUCTION_API_URL = formatApiUrl(RAILWAY_URL);
export const LOCAL_API_URL = formatApiUrl(getLocalBackendTarget());
