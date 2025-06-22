# backend/Dockerfile - SANITIZED for API Gateway Architecture

# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY src ./src

# Build the TypeScript application
RUN npm run build

# ============================================================================
# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling in containers
RUN apk add --no-cache dumb-init curl

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Change ownership of application directory
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose the application port
EXPOSE 5000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Use dumb-init to handle signals properly in containers
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/server.js"]

# ============================================================================
# REMOVED FEATURES:
# - Upload directory creation (no file uploads)
# - Complex volume configurations (simplified development)
# - File processing tools (no image manipulation)
# - Cron job schedulers (user-initiated actions only)
# - Additional runtime dependencies (minimal footprint)
#
# OPTIMIZATIONS:
# - Multi-stage build for smaller production image
# - Non-root user for security
# - Proper signal handling with dumb-init
# - Health check for container orchestration
# - Minimal production dependencies
# ============================================================================