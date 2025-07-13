# backend/ml_engine/build/create_model_data.py
"""
Create model-specific data files from preprocessed Instacart data
Updated paths for new project structure
"""

import pandas as pd
import json
from tqdm import tqdm
import os

# Updated data paths for new structure
DATA_DIR = "/app/data/dataset"

def create_model_data():
    try:
        """
        Transform cleaned data into model format
        Creates history/future splits and JSON format for TIFUKNN
        """
        print("Creating model data from preprocessed dataset...")
        
        # Load the output from preprocess.py
        input_path = os.path.join(DATA_DIR, 'instacart.csv')
        try:
            baskets = pd.read_csv(input_path)
            print(f"✅ Loaded {len(baskets)} records from {input_path}")
        except FileNotFoundError:
            print(f"❌ Error: '{input_path}' not found.")
            print("Please make sure you have run preprocess.py successfully first.")
            raise SystemExit(1)
        
        print("Splitting data into history and future sets...")
        # The 'eval_set' column is 'train' for the last basket and 'prior' for all others
        history_df = baskets[baskets['eval_set'] == 'prior']
        future_df = baskets[baskets['eval_set'] == 'train']
        
        print(f"📊 History records: {len(history_df)}")
        print(f"📊 Future records: {len(future_df)}")
        
        # Save the two CSV files needed by keyset_fold.py
        history_path = os.path.join(DATA_DIR, 'instacart_history.csv')
        future_path = os.path.join(DATA_DIR, 'instacart_future.csv')
        
        history_df.to_csv(history_path, index=False)
        future_df.to_csv(future_path, index=False)
        print(f"✅ Created '{history_path}'")
        print(f"✅ Created '{future_path}'")
        
        print("\nCreating JSON history file for TIFUKNN model...")
        # Create the data_history.json file needed by the ML engine
        data_history = {}
        
        # Group by user, then iterate through each user's baskets in order
        for user_id, user_df in tqdm(history_df.groupby('user_id'), desc="Processing users"):
            # Sort baskets by order number to maintain sequence
            user_baskets = user_df.sort_values('order_number').groupby('order_number')['product_id'].apply(list).tolist()
            
            # The first item in the list is a placeholder for the user_id itself,
            # followed by the list of baskets.
            data_history[str(user_id)] = [user_id] + user_baskets
        
        # Save the final JSON file
        history_json_path = os.path.join(DATA_DIR, 'data_history.json')
        with open(history_json_path, 'w') as f:
            json.dump(data_history, f)
        
        print(f"✅ Created '{history_json_path}'")
        print(f"👥 Processed {len(data_history)} users for ML model")
        print("\n🎯 Model data creation complete!")
    
    except Exception as e:
        print(f"⚠️ Got into a problem: {e}")
        raise SystemExit(1)


if __name__ == "__main__":
    create_model_data()

