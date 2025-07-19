#!/bin/bash
# backend/init_backend.sh
# Initialization script for backend service

set -e

echo "=========================================="
echo "TIMELY BACKEND INITIALIZATION"
echo "=========================================="

# Define flag files in shared volume
ML_DATA_FLAG="/shared/flags/ml_data_initialized.flag"
VECTORS_FLAG="/shared/flags/vectors_initialized.flag"
DB_POPULATED_FLAG="/shared/flags/db_populated.flag"

# Create flags directory if it doesn't exist
mkdir -p /shared/flags

# Wait for database to be ready
echo "Waiting for database health check..."
while ! python -c "import psycopg2; psycopg2.connect(host='database', database='timely_db', user='timely_user', password='timely_password')" 2>/dev/null; do
    sleep 2
done
echo "✅ Database is ready!"

# Wait for database population to complete
echo "Waiting for database population to complete..."
while [ ! -f "$DB_POPULATED_FLAG" ]; do
    echo "⏳ Waiting for database population flag..."
    sleep 5
done
echo "✅ Database population completed!"

# Copy dataset to local data directory for ML processing
echo "Setting up ML data directories..."
mkdir -p /app/data/dataset
if [ ! -f "$ML_DATA_FLAG" ]; then
    echo "📊 Copying dataset for ML processing..."
    cp -r /shared/dataset/* /app/data/dataset/
    echo "✅ Dataset copied successfully!"
fi

# Run ML data preprocessing
if [ ! -f "$ML_DATA_FLAG" ]; then
    echo "🔧 Running ML data preprocessing..."
    cd /app/ml_engine/build
    
    # Run preprocessing pipeline with updated paths
    echo "Step 1: Running preprocess.py..."
    if python preprocess.py; then
        echo "✅ preprocess.py completed successfully"
    else
        echo "❌ preprocess.py failed with exit code $?"
        exit 1
    fi
    
    echo "Step 2: Running create_model_data.py..."
    if python create_model_data.py; then
        echo "✅ create_model_data.py completed successfully"
    else
        echo "❌ create_model_data.py failed with exit code $?"
        exit 1
    fi
    
    echo "Step 3: Running keyset_fold.py..."
    if python keyset_fold.py; then
        echo "✅ keyset_fold.py completed successfully"
    else
        echo "❌ keyset_fold.py failed with exit code $?"
        exit 1
    fi
    
    cd /app
    touch "$ML_DATA_FLAG"
    echo "✅ ML data preprocessing complete!"
else
    echo "✅ ML data already preprocessed, skipping..."
fi

# Pre-compute user vectors
if [ ! -f "$VECTORS_FLAG" ]; then
    echo "🧮 Pre-computing recommender user vectors..."
    if python -c "
from ml_engine import get_engine
engine = get_engine()
engine.precompute_recommender_vectors()
"; then
    echo "✅ Vector pre-computation complete!"
    touch "$VECTORS_FLAG"
    else
        echo "❌ precomputing vectors failed with exit code $?"
        exit 1
    fi
else
    echo "✅ Vectors already computed, skipping..."
fi

echo "⭐ ML Engine ready!"

echo "=========================================="
echo "🚀 Starting Flask backend server..."
echo "=========================================="

# Start the Flask app
exec python app.py