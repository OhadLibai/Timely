# database/Dockerfile
FROM postgres:15-alpine

# Install Python and required packages for populate_db.py
RUN apk add --no-cache \
    python3 \
    py3-pip \
    py3-pandas \
    py3-psycopg2 \
    py3-numpy

# Create app directory
RUN mkdir -p /app

# Copy all database source files to /app
COPY init.sql /app/init.sql
COPY populate_db.py /app/populate_db.py
COPY category_details.csv /app/category_details.csv

# Copy orchestration script to entrypoint directory
COPY init_db.sh /docker-entrypoint-initdb.d/init_db.sh

# Ensure proper permissions and create shared directories
RUN chmod +x /docker-entrypoint-initdb.d/init_db.sh && \
    mkdir -p /shared/flags && \
    chown -R postgres:postgres /shared