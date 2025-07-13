# frontend/Dockerfile  
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

RUN echo "=========================================="
RUN echo "🚀 Starting React frontend app..."
RUN echo "=========================================="

# Start the application
CMD ["npm", "start"]