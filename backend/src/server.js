require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const os = require('os');
const path = require('path');

const connectDB = require('./config/database');
const envConfig = require('./config/env');
const swaggerSpec = require('./swagger/swaggerConfig');
const errorHandler = require('./middlewares/errorHandler');
const authMiddleware = require('./middlewares/auth');

// Import routes
const authRoutes = require('./routes/authRoutes');
const aiRoutes = require('./routes/aiRoutes');
const paperRoutes = require('./routes/paperRoutes');
const trendRoutes = require('./routes/trendRoutes');
const sourceRoutes = require('./routes/sourceRoutes');
const corpusRoutes = require('./routes/corpusRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const workspaceRoutes = require('./routes/workspaceRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

// Connect to MongoDB (async, non-blocking)
connectDB().catch(err => {
  console.error('Failed to connect to MongoDB:', err);
});

// Middleware
app.use(helmet()); // Security headers
const corsOrigins = envConfig.CORS_ORIGIN.split(',').map(o => o.trim()).filter(Boolean);
app.use(cors({ origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// OpenAPI JSON (cho FE codegen: openapi-typescript-codegen, orval, ...)
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
}));

// Health check endpoint
/**
 * @swagger
 * /health:
 *   get:
 *     tags:
 *       - System
 *     summary: Kiểm tra sức khỏe API
 *     description: Check if API is running
 *     responses:
 *       200:
 *         description: API is healthy
 */
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date(),
  });
});

// API Routes (v1)
const apiPrefix = '/api/v1';

app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/ai`, aiRoutes);
app.use(`${apiPrefix}/papers`, paperRoutes);
app.use(`${apiPrefix}/trends`, trendRoutes);
app.use(`${apiPrefix}/sources`, sourceRoutes);
app.use(`${apiPrefix}/corpus`, corpusRoutes);
app.use(`${apiPrefix}/notifications`, notificationRoutes);
app.use(`${apiPrefix}/workspaces`, workspaceRoutes);
app.use(`${apiPrefix}/users`, userRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = envConfig.PORT;

const server = app.listen(PORT, '0.0.0.0', () => {
  const nets = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }

  console.log(`
╔════════════════════════════════════════════════════════╗
║  Scientific Journal Publication Trend Tracking System  ║
║  Backend Server                                        ║
╠════════════════════════════════════════════════════════╣
║  Server running on port: ${PORT}
║  Environment: ${envConfig.NODE_ENV}
║  API Docs: http://localhost:${PORT}/api-docs
║  Health Check: http://localhost:${PORT}/health
╚════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app;
