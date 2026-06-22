import { Platform } from 'react-native';
import Constants from 'expo-constants';

// ==========================================
// CONFIGURATION OPTIONS FOR BACKEND TARGET
// ==========================================

// OPTION 1: Set this boolean to true to force using the production Railway URL.
// Set to false to use the local backend / environment variables.
const FORCE_PRODUCTION = true;

// OPTION 2: Set your computer's local IP address here if testing on a physical device
// and automatic IP detection fails (e.g. '192.168.1.15'). Leave empty '' to use auto-detection.
const MANUAL_DEV_IP = '';

// ==========================================
// ENVIRONMENT VARIABLE FALLBACKS (.env)
// ==========================================
const RAILWAY_URL = 'https://scientific-journal-publication-trend-tracking-sy-production.up.railway.app';

// Dev mặc định dùng backend local. Đặt EXPO_PUBLIC_USE_LOCAL_BACKEND=false trong .env
// hoặc đặt FORCE_PRODUCTION = true ở trên nếu muốn kết nối Railway.
const USE_LOCAL = !FORCE_PRODUCTION && process.env.EXPO_PUBLIC_USE_LOCAL_BACKEND !== 'false';

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
