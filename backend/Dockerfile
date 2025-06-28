# backend/Dockerfile.dev - Development/Test Optimized
# Single-stage build for faster development iteration

FROM node:18-alpine

# Install development tools
RUN apk add --no-cache \
    curl \
    git \
    bash

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including devDependencies for development)
RUN npm install

# Copy source code (will be overridden by volume mount in dev)
COPY src ./src

# Create logs directory
RUN mkdir -p logs

# Create non-root user (but with more permissions for development)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Development command with hot reload
CMD ["npm", "run", "dev"]

# ============================================================================
# DEVELOPMENT OPTIMIZATIONS:
# 
# ✅ Single-stage build (faster)
# ✅ All dependencies installed (including dev tools)
# ✅ npm run dev for hot reload
# ✅ Development tools (git, bash) included
# ✅ Simplified health check
# ✅ Volume mounts expected for hot reload
# ✅ Less restrictive user permissions
# 
# DIFFERENCES FROM PRODUCTION:
# ❌ No multi-stage build
# ❌ No production-only dependencies
# ❌ No built artifacts (runs from source)
# ❌ No signal handling optimization
# ❌ More relaxed security (development focus)
# ============================================================================