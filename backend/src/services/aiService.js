const axios = require('axios');
const envConfig = require('../config/env');

const aiClient = axios.create({
  baseURL: envConfig.AI_SERVICE_URL,
  timeout: 30000,
});

const proxyRequest = async (path, payload = null, method = 'post') => {
  try {
    const response = await aiClient.request({
      url: path,
      method,
      data: payload || undefined,
    });

    return response.data;
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const detail = error.response?.data?.detail;
    let message = error.response?.data?.message || error.message;

    if (Array.isArray(detail)) {
      message = detail.map(item => item.msg || JSON.stringify(item)).join('; ');
    } else if (detail && typeof detail === 'object') {
      message = detail.msg || JSON.stringify(detail);
    } else if (typeof detail === 'string') {
      message = detail;
    }

    const proxyError = new Error(message);
    proxyError.statusCode = statusCode;
    throw proxyError;
  }
};

const getHealth = async () => {
  try {
    const response = await aiClient.get('/health');
    return response.data;
  } catch (error) {
    const statusCode = error.response?.status || 503;
    const message = error.response?.data?.detail || error.response?.data?.message || error.message;
    const proxyError = new Error(message);
    proxyError.statusCode = statusCode;
    throw proxyError;
  }
};

const isAvailable = async () => {
  try {
    await aiClient.get('/health', { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
};

module.exports = {
  proxyRequest,
  getHealth,
  isAvailable,
};