const mongoose = require('mongoose');
const envConfig = require('./env');
const ApiSource = require('../models/ApiSource');

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
];

const seedApiSources = async () => {
  for (const source of DEFAULT_API_SOURCES) {
    await ApiSource.findOneAndUpdate({ name: source.name }, source, {
      upsert: true,
      setDefaultsOnInsert: true,
    });
  }
};

/**
 * Connect to MongoDB Atlas
 * Uses MONGODB_URI from env config (trimmed, no surrounding quotes)
 */
const connectDB = async () => {
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

  try {
    const conn = await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: envConfig.isProduction ? 15000 : 5000,
      socketTimeoutMS: envConfig.isProduction ? 45000 : 10000,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    await seedApiSources();
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    if (/whitelist|ENOTFOUND|authentication failed/i.test(error.message)) {
      console.error(
        'Hint: Atlas → Network Access → allow 0.0.0.0/0 for Railway; verify MONGODB_URI user/password.'
      );
    }
    console.log('WARNING: Running in offline/mock mode without database connection');
    return null;
  }
};

module.exports = connectDB;
