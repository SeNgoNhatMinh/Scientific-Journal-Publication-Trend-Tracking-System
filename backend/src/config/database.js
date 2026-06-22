const dns = require('dns');
const mongoose = require('mongoose');
const envConfig = require('./env');

// Override Windows/system DNS with reliable public resolvers.
// This fixes "querySrv ECONNREFUSED" on networks where the default DNS
// cannot resolve MongoDB Atlas SRV records (e.g., school/corporate networks).
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
const ApiSource = require('../models/ApiSource');
const Keyword = require('../models/Keyword');
const authorKeywordService = require('../services/authorKeywordService');

const DEFAULT_API_SOURCES = [
  {
    name: 'openalex',
    baseUrl: 'https://api.openalex.org',
    fieldScope: ['works', 'authors', 'sources'],
    syncFrequency: 'weekly',
    trendingThreshold: 20,
    minPaperCount: 10,
    isActive: true,
  },
  {
    name: 'semantic_scholar',
    baseUrl: 'https://api.semanticscholar.org/graph/v1',
    fieldScope: ['paper', 'author'],
    syncFrequency: 'weekly',
    trendingThreshold: 20,
    minPaperCount: 10,
    isActive: true,
  },
  {
    name: 'crossref',
    baseUrl: 'https://api.crossref.org',
    fieldScope: ['works'],
    syncFrequency: 'weekly',
    trendingThreshold: 20,
    minPaperCount: 10,
    isActive: true,
  },
  {
    name: 'arxiv',
    baseUrl: 'https://export.arxiv.org',
    fieldScope: ['search'],
    syncFrequency: 'weekly',
    trendingThreshold: 20,
    minPaperCount: 10,
    isActive: true,
  },
  {
    name: 'ieee',
    baseUrl: 'https://ieeexploreapi.ieee.org',
    fieldScope: ['articles'],
    syncFrequency: 'weekly',
    trendingThreshold: 20,
    minPaperCount: 10,
    isActive: true,
  },
  {
    name: 'exa',
    baseUrl: 'https://api.exa.ai',
    fieldScope: ['search'],
    syncFrequency: 'weekly',
    trendingThreshold: 20,
    minPaperCount: 10,
    isActive: true,
  },
];

const seedApiSources = async () => {
  for (const source of DEFAULT_API_SOURCES) {
    await ApiSource.findOneAndUpdate({ name: source.name }, source, {
      upsert: true,
      setDefaultsOnInsert: true,
    });
  }
};

const repairLegacyKeywordIndexes = async () => {
  try {
    const indexes = await Keyword.collection.indexes();
    const openAlexIndex = indexes.find(index => index.name === 'openalexId_1');
    const hasExpectedPartialFilter =
      openAlexIndex?.partialFilterExpression?.openalexId?.$type === 'string';

    if (openAlexIndex && (!openAlexIndex.unique || !hasExpectedPartialFilter)) {
      await Keyword.collection.dropIndex('openalexId_1');
      console.log('Dropped legacy Keyword.openalexId index');
    }

    await Keyword.collection.createIndex(
      { openalexId: 1 },
      {
        name: 'openalexId_1',
        unique: true,
        partialFilterExpression: {
          openalexId: { $type: 'string' },
        },
      }
    );
  } catch (error) {
    console.error(`Keyword index repair failed: ${error.message}`);
  }
};

/**
 * Connect to MongoDB Atlas
 * Uses MONGODB_URI from env config (trimmed, no surrounding quotes)
 */
// Track connection state
let isConnected = false;
let isConnecting = false;

const connectDB = async (retryCount = 0) => {
  const uri = envConfig.MONGODB_URI;

  if (!uri) {
    console.error('Error connecting to MongoDB: MONGODB_URI is not set');
    console.log('WARNING: Running in offline/mock mode without database connection');
    return null;
  }

  if (!/^mongodb(\+srv)?:\/\//i.test(uri)) {
    console.error(
      'Error connecting to MongoDB: MONGODB_URI must start with mongodb:// or mongodb+srv://'
    );
    console.error(
      'Hint: Railway Variables — paste Atlas URI without quotes. Service "ai-service" must NOT have MONGODB_URI.'
    );
    console.log('WARNING: Running in offline/mock mode without database connection');
    return null;
  }

  if (isConnecting) return null;
  isConnecting = true;

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: envConfig.isProduction ? 15000 : 8000,
      socketTimeoutMS: envConfig.isProduction ? 45000 : 20000,
      family: 4, // Force IPv4 to avoid DNS resolution issues
    });

    isConnected = true;
    isConnecting = false;
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    await repairLegacyKeywordIndexes();
    await seedApiSources();
    authorKeywordService
      .classifyExistingKeywords()
      .then(count => {
        if (count > 0) console.log(`Keyword classification backfilled: ${count}`);
      })
      .catch(err => console.error(`Keyword classification backfill failed: ${err.message}`));
    return conn;
  } catch (error) {
    isConnecting = false;
    console.error(`Error connecting to MongoDB: ${error.message}`);
    if (/whitelist|ENOTFOUND|ECONNREFUSED|authentication failed/i.test(error.message)) {
      console.error(
        'Hint: Atlas → Network Access → allow 0.0.0.0/0; verify MONGODB_URI user/password; check DNS/firewall.'
      );
    }
    // Do NOT set bufferCommands=false here — that causes immediate errors on all queries.
    // Instead, keep Mongoose in buffering mode and retry connection in background.
    console.log('WARNING: Running in offline/mock mode without database connection');

    // Retry in background (max 5 retries, exponential backoff)
    if (retryCount < 5) {
      const delay = Math.min(5000 * Math.pow(2, retryCount), 60000);
      console.log(`Retrying MongoDB connection in ${delay / 1000}s... (attempt ${retryCount + 1}/5)`);
      setTimeout(() => connectDB(retryCount + 1), delay);
    } else {
      console.error('MongoDB: Max retries reached. Running without database.');
      // Only disable buffering after all retries exhausted to avoid hanging requests
      mongoose.set('bufferCommands', false);
    }
    return null;
  }
};

// Export connection state checker for middleware use
const getDBStatus = () => ({
  isConnected,
  readyState: mongoose.connection.readyState, // 0=disconnected,1=connected,2=connecting,3=disconnecting
});

module.exports = connectDB;
module.exports.getDBStatus = getDBStatus;
