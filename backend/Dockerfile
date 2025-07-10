# backend/Dockerfile
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Copy ML microservice code
COPY ml_microservice /app/ml_microservice

# Make initialization script executable
RUN chmod +x init_backend.sh

# Create necessary directories
RUN mkdir -p /app/data/vectors /app/data/dataset

# Run initialization and start server
CMD ["./init_backend.sh"]

