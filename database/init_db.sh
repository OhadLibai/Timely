#!/bin/bash
# database/init_db.sh
# Database initialization and population orchestration script

set -e

echo "=========================================="
echo "TIMELY DATABASE INITIALIZATION"
echo "=========================================="

# Define paths
FLAG_FILE="/shared/flags/db_populated.flag"
INIT_SQL="/app/init.sql"
POPULATE_SCRIPT="/app/populate_db.py"

# Create flag directory if it doesn't exist
mkdir -p /shared/flags

echo "Step 1: Running database schema initialization..."
# Run init.sql to create tables, indexes, and default users
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$INIT_SQL"
echo "✅ Database schema initialized successfully!"

echo "Step 2: Checking database population status..."
# Check if database has already been populated
if [ -f "$FLAG_FILE" ]; then
    echo "✅ Database already populated, skipping population step."
else
    echo "📊 Starting database population with Instacart products..."
    
    # === ADDED: Wait for PostgreSQL to be fully ready for connections ===
    echo "Waiting for PostgreSQL to accept connections..."
    until pg_isready -h localhost -p 5432 -U "$POSTGRES_USER" -d "$POSTGRES_DB"; do
      echo "PostgreSQL is unavailable - sleeping"
      sleep 5
    done
    echo "✅ PostgreSQL is ready and accepting connections!"
    # ===================================================================

    # Run the population script
    cd /app
    python3 "$POPULATE_SCRIPT"
    
    # Set the flag to indicate population is complete
    touch "$FLAG_FILE"
    echo "✅ Database population completed successfully!"
fi

echo "=========================================="
echo "DATABASE INITIALIZATION COMPLETE"
echo "✅ Schema: Ready"
echo "✅ Population: Ready" 
echo "✅ Flag: $FLAG_FILE"
echo "=========================================="