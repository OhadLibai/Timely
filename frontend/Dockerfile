# frontend/Dockerfile.dev - Development/Test Optimized
# Single-stage build using Parcel dev server for hot reload

FROM node:18-alpine

# Install development tools
RUN apk add --no-cache \
    curl \
    git \
    bash

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install ALL dependencies (including devDependencies)
RUN npm install

# Copy configuration files
COPY .parcelrc ./
COPY .postcssrc ./
COPY tsconfig.json ./
COPY tailwind.config.js ./
COPY index.html ./

# Copy source code (will be overridden by volume mount in dev)
COPY src ./src
COPY public ./public

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose Parcel dev server port
EXPOSE 3000

# Health check for Parcel dev server
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

# Run Parcel development server with hot reload
CMD ["npm", "run", "dev"]

# ============================================================================
# DEVELOPMENT OPTIMIZATIONS:
# 
# ✅ Parcel dev server (hot reload, fast HMR)
# ✅ All dependencies for development
# ✅ Source maps enabled by default
# ✅ Host 0.0.0.0 for Docker networking
# ✅ Development tools included
# ✅ Fast startup time
# ✅ Volume mounts expected for live editing
# 
# DIFFERENCES FROM PRODUCTION:
# ❌ No nginx (uses Parcel dev server)
# ❌ No build step (serves from source)
# ❌ No static file optimization
# ❌ No production bundling
# ❌ Development dependencies included
# ============================================================================