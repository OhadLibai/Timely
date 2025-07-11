#!/bin/bash
# backend/init_backend.sh
# Initialization script for backend service

set -e

echo "=========================================="
echo "TIMELY BACKEND INITIALIZATION"
echo "=========================================="

# Define flag files
ML_DATA_FLAG="/app/data/ml_data_initialized.flag"
VECTORS_FLAG="/app/data/vectors_initialized.flag"
DB_POPULATED_FLAG="/app/data/db_populated.flag"

# Wait for database to be ready
echo "Waiting for database..."
while ! python -c "import psycopg2; psycopg2.connect(host='database', database='timely_db', user='timely_user', password='timely_password')" 2>/dev/null; do
    sleep 2
done
echo "Database is ready!"

# Run database population
if [ ! -f "$DB_POPULATED_FLAG" ]; then
    echo "Populating database with Instacart products..."
    python database/populate_db.py
    touch "$DB_POPULATED_FLAG"
    echo "Database population complete!"
else
    echo "Database already populated, skipping..."
fi

# Run ML data preprocessing
if [ ! -f "$ML_DATA_FLAG" ]; then
    echo "Running ML data preprocessing..."
    cd /app/ml_microservice
    
    # Run preprocessing pipeline
    python preprocess.py
    python create_model_data.py
    python keyset_fold.py
    
    cd /app
    touch "$ML_DATA_FLAG"
    echo "ML data preprocessing complete!"
else
    echo "ML data already preprocessed, skipping..."
fi

# Pre-compute user vectors
if [ ! -f "$VECTORS_FLAG" ]; then
    echo "Pre-computing training user vectors..."
    python -c "
from ml_engine import get_engine
engine = get_engine()
engine.precompute_all_vectors()
"
    touch "$VECTORS_FLAG"
    echo "Vector pre-computation complete!"
else
    echo "Vectors already computed, skipping..."
fi

echo "=========================================="
echo "Starting Flask backend server..."
echo "=========================================="

# Start the Flask app
exec python app.py