const axios = require('axios');
const envConfig = require('../config/env');

// Dùng v1 (không phải v1beta) + model thực sự tồn tại
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1/models';
const MODELS = ['gemini-3.1-flash-lite', 'gemini-1.5-flash', 'gemini-2.5-flash', 'gemini-3.5-flash'];

const callGemini = async (model, prompt, apiKey) => {
  const url = `${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`;
  const response = await axios.post(
    url,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 256 },
    },
    { timeout: 15000 }
  );
  return response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
};

/**
 * Gọi Gemini API để sinh 5 từ khóa nghiên cứu liên quan đến keyword đầu vào.
 * @param {string} keyword
 * @returns {Promise<string[]>}
 */
const suggestResearchKeywords = async keyword => {
  const apiKey = envConfig.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured in .env');

  const prompt = `You are an academic research assistant.
The user searched for: "${keyword}"

Generate exactly 5 related academic research keywords or short phrases (2-5 words each).
Focus on specific, scientifically relevant terms researchers would search for.

Rules:
- Return ONLY a JSON array of 5 strings, nothing else
- No numbering, no explanation, no markdown
- Each keyword must be distinct and academically relevant

Example: ["deep learning optimization", "neural network architectures", "gradient descent methods", "convolutional networks", "transfer learning"]

Output:`;

  let lastError = null;
  for (const model of MODELS) {
    try {
      console.log(`[gemini] Trying model: ${model} for keyword: "${keyword}"`);
      const rawText = await callGemini(model, prompt, apiKey);
      console.log(`[gemini] Raw response (${model}):`, rawText?.slice(0, 200));

      const match = rawText.match(/\[[\s\S]*?\]/);
      if (!match) { console.warn(`[gemini] ${model}: no JSON array`); continue; }

      const suggestions = JSON.parse(match[0]);
      if (!Array.isArray(suggestions) || !suggestions.length) continue;

      const result = suggestions.filter(s => typeof s === 'string' && s.trim()).slice(0, 5).map(s => s.trim());
      console.log(`[gemini] Success (${model}):`, result);
      return result;
    } catch (err) {
      lastError = err;
      const status = err.response?.status;
      const errMsg = err.response?.data?.error?.message || err.message;
      console.error(`[gemini] ${model} failed (${status}):`, errMsg);
      if (status === 400 || status === 401 || status === 403) break; // Lỗi xác thực hoặc request sai -> dừng hẳn
    }
  }
  throw lastError || new Error('All Gemini models failed');
};

module.exports = { suggestResearchKeywords };
