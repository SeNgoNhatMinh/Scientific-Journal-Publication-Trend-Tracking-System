import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Railway URL
export const PRODUCTION_API_URL = 'https://scientific-journal-publication-trend-tracking-sy-production.up.railway.app/api/v1';

// Local Host API URLs
// Android emulator uses 10.0.2.2 to access localhost of host machine
// iOS simulator can use localhost/127.0.0.1 directly
const getLocalApiUrl = () => {
  const debuggerHost = Constants.expoConfig?.hostUri || '';
  const ip = debuggerHost.split(':')[0];
  if (ip) {
    return `http://${ip}:5000/api/v1`;
  }
  return Platform.OS === 'android' ? 'http://10.0.2.2:5000/api/v1' : 'http://localhost:5000/api/v1';
};

export const LOCAL_API_URL = getLocalApiUrl();

// Set the active API endpoint
// Automatically toggles between LOCAL_API_URL in development and PRODUCTION_API_URL in production.
export const API_BASE_URL = __DEV__ ? LOCAL_API_URL : PRODUCTION_API_URL;
