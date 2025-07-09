#!/bin/sh

# Define a flag file to check if initialization has been done
INIT_FLAG_FILE="./data_initialized.flag"

# --- DATA & ML INITIALIZATION PHASE ---
# Only run this heavy process if the flag file does not exist
if [ ! -f $INIT_FLAG_FILE ]; then
    echo "--- First time setup: Initializing data and pre-computing ML vectors... ---"
    
    # Step 1: Run the data processing pipeline
    # These scripts create the final .json and .csv files
    python ml_microservice/preprocess.py
    python ml_microservice/create_model_data.py
    python ml_microservice/keyset_fold.py --dataset instacart --fold_id 0
    
    # Step 2: Pre-compute the vectors and save them to a file
    # We create a new, simple script for this job
    python ml_microservice/precompute_vectors.py
    
    echo "--- Initialization complete. Creating flag file. ---"
    touch $INIT_FLAG_FILE
else
    echo "--- Flag file found. Skipping data initialization. ---"
fi

# --- EXECUTION PHASE ---
# Now, start the main backend Flask server
echo "--- Starting backend API server... ---"
# This is your command to run the Flask app (e.g., using Gunicorn)
gunicorn --bind 0.0.0.0:5000 backend_app:app