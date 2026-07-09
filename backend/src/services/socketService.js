const jwt = require('jsonwebtoken');
const envConfig = require('../config/env');

let io;
// Map to keep track of connected users: userId -> Set of socketIds
const userSockets = new Map();

const init = (server) => {
  const { Server } = require('socket.io');
  
  const corsOrigins = envConfig.CORS_ORIGIN.split(',').map(o => o.trim()).filter(Boolean);
  
  io = new Server(server, {
    cors: {
      origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
    }
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, envConfig.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);
    
    console.log(`User ${userId} connected (Socket ID: ${socket.id})`);

    socket.on('disconnect', () => {
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
        }
      }
      console.log(`User ${userId} disconnected (Socket ID: ${socket.id})`);
    });
  });
};

const sendNotificationToUser = (userId, payload) => {
  if (!io) return;
  const userIdStr = userId.toString();
  const sockets = userSockets.get(userIdStr);
  
  if (sockets && sockets.size > 0) {
    sockets.forEach(socketId => {
      io.to(socketId).emit('newNotification', payload);
    });
  }
};

const getIo = () => io;

module.exports = {
  init,
  getIo,
  sendNotificationToUser
};
