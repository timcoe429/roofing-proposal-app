# Use Node.js 18 LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install dependencies
RUN npm ci --only=production
RUN cd server && npm ci --only=production
RUN cd client && npm ci --only=production

# Copy source code
COPY . .

# Build client
RUN cd client && npm run build

# Expose port
EXPOSE $PORT

# Start server
CMD ["npm", "start"]
