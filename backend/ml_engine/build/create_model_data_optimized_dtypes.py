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
        # Define optimized data types for loading instacart.csv
        # These should match the types used when saving in preprocess.py
        instacart_dtypes = {
            'user_id': 'int32',
            'order_id': 'int32',
            'order_number': 'int8',
            'product_id': 'int32',
            'add_to_cart_order': 'int16',
            'reordered': 'int8',
            'eval_set': 'category'
            # Note: days_since_prior_order is not in this specific output, but if it were,
            # ensure it's handled, perhaps with float16 or float32.
        }

        print("Creating model data from preprocessed dataset...")

        # Load the output from preprocess.py with optimized dtypes
        input_path = os.path.join(DATA_DIR, 'instacart.csv')
        try:
            # Apply optimized dtypes when reading
            baskets = pd.read_csv(input_path, dtype=instacart_dtypes)
            print(f"✅ Loaded {len(baskets)} records from {input_path}")
        except FileNotFoundError:
            print(f"❌ Error: '{input_path}' not found.")
            print("Please make sure you have run preprocess.py successfully first.")
            raise SystemExit(1)

        print("Splitting data into history and future sets...")
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
        data_history = {}

        # Group by user, then iterate through each user's baskets in order
        # Ensure that user_id is converted to string for dictionary keys later if necessary
        # Convert product_id to int for JSON serialization if it's not already
        # Using iterrows and building lists manually can be very memory efficient
        # compared to pandas apply(list) on large groups
        
        # We need to sort and group carefully for efficiency
        # First, ensure data is sorted correctly for grouping
        history_df = history_df.sort_values(['user_id', 'order_number', 'add_to_cart_order'])

        # Create a list of lists of product_ids per order per user
        # This is the memory bottleneck. Let's try to optimize it.
        
        # Option 1: Iterative approach for less memory overhead than apply(list).tolist()
        # This still builds all lists in memory.
        current_user_id = None
        current_order_number = None
        current_basket = []
        user_baskets_list = [] # List of lists for current user's orders
        
        for index, row in tqdm(history_df.iterrows(), total=len(history_df), desc="Processing users for JSON"):
            user_id = row['user_id']
            order_number = row['order_number']
            product_id = row['product_id']

            if user_id != current_user_id:
                if current_user_id is not None:
                    # Save the previous user's data
                    data_history[str(current_user_id)] = [current_user_id] + user_baskets_list
                
                # Reset for new user
                current_user_id = user_id
                current_order_number = None # Reset order for new user
                user_baskets_list = []

            if order_number != current_order_number:
                if current_order_number is not None:
                    # Save the previous order's basket
                    user_baskets_list.append(current_basket)
                # Reset for new order
                current_order_number = order_number
                current_basket = []

            current_basket.append(int(product_id)) # Ensure product_id is int for JSON

        # Don't forget to save the last user's data
        if current_user_id is not None:
            if current_basket: # Add the last basket if it's not empty
                user_baskets_list.append(current_basket)
            data_history[str(current_user_id)] = [current_user_id] + user_baskets_list

        # Save the final JSON file
        history_json_path = os.path.join(DATA_DIR, 'data_history.json')
        # Use ensure_ascii=False if your product names can contain non-ASCII characters
        # For data_history.json, it's just product IDs, so ensure_ascii=True is fine.
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
