/**
 * Mock Database Middleware
 * Provides in-memory mock data when MongoDB is not connected
 */

const mockUsers = new Map();
const mockPapers = new Map();

// Mock user for testing
mockUsers.set('test@example.com', {
  _id: '507f1f77bcf86cd799439011',
  name: 'Test User',
  email: 'test@example.com',
  password: 'hashed_password',
  role: 'researcher',
  institution: 'Test University'
});

module.exports = {
  mockUsers,
  mockPapers,
};
