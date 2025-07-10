# database/Dockerfile
FROM postgres:15-alpine

# Copy initialization script
COPY init.sql /docker-entrypoint-initdb.d/

# Ensure proper permissions
RUN chmod 644 /docker-entrypoint-initdb.d/init.sql