const swaggerJsdoc = require('swagger-jsdoc');
const envConfig = require('../config/env');

/**
 * Swagger Configuration
 * API documentation with Swagger/OpenAPI
 * Access at: http://localhost:3001/api-docs
 */

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Scientific Journal Publication Trend Tracking System',
    version: '1.0.0',
    description:
      'AI-Enhanced backend API for analyzing research publication trends, detecting emerging topics, and providing insights',
    contact: {
      name: 'API Support',
      email: 'support@journal-trends.com',
    },
  },
  servers: [
    ...(envConfig.PUBLIC_API_URL
      ? [
          {
            url: `${envConfig.PUBLIC_API_URL.replace(/\/$/, '')}/api/v1`,
            description: 'Production (Railway / deployed)',
          },
        ]
      : []),
    {
      url: `http://localhost:${envConfig.PORT}/api/v1`,
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token required for authenticated endpoints',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          role: {
            type: 'string',
            enum: ['researcher', 'student', 'lecturer', 'admin'],
          },
          institution: { type: 'string' },
          bookmarks: { type: 'array', items: { type: 'string' } },
        },
      },
      Paper: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          abstract: { type: 'string' },
          doi: { type: 'string' },
          publishedDate: { type: 'string', format: 'date' },
          publicationYear: { type: 'number' },
          authors: { type: 'array' },
          journalName: { type: 'string' },
          citationCount: { type: 'number' },
          url: { type: 'string' },
        },
      },
      Topic: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          trendStatus: {
            type: 'string',
            enum: ['exploding', 'growing', 'stable', 'declining'],
          },
          growthRate: { type: 'number' },
          paperCount: { type: 'number' },
          yearlyData: { type: 'array' },
        },
      },
    },
  },
  externalDocs: {
    description: 'External academic APIs',
    url: 'https://docs.openalex.org/',
  },
};

const path = require('path');

const options = {
  definition: swaggerDefinition,
  apis: [path.join(__dirname, '..', 'routes', '*.js')],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
