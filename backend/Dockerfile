FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application code
COPY src ./src

# Expose port
EXPOSE 5000

# Start application
CMD ["npm", "start"]
