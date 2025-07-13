# backend/ml_engine/build/preprocess.py
"""
Preprocess Instacart dataset for TIFUKNN model
Updated paths for new project structure
"""

import pandas as pd
import os
import numpy as np # Import numpy for float16 conversion

# Updated data paths for new structure
DATA_DIR = "/app/data/dataset"  # Local copy in backend container
OUTPUT_DIR = "/app/data/dataset"

def preprocess_instacart():
    try:
        """
        Preprocess the raw Instacart CSV files into a single clean dataset
        """
        print("Starting Instacart dataset preprocessing...")

        # Define optimized data types for initial load (avoiding float16 in read_csv)
        orders_load_dtype = {
            'order_id': 'int32',
            'user_id': 'int32',
            'eval_set': 'category',
            'order_number': 'int8',
            'order_dow': 'int8',
            'order_hour_of_day': 'int8',
            # Load 'days_since_prior_order' as float32 first
            'days_since_prior_order': 'float32'
        }

        order_products_dtype = {
            'order_id': 'int32',
            'product_id': 'int32',
            'add_to_cart_order': 'int16',
            'reordered': 'int8'
        }

        products_dtype = {
            'product_id': 'int32',
            'product_name': 'object',
            'aisle_id': 'int8',
            'department_id': 'int8'
        }

        aisles_dtype = {
            'aisle_id': 'int8',
            'aisle': 'category'
        }

        departments_dtype = {
            'department_id': 'int8',
            'department': 'category'
        }

        # Load all CSV files with optimized dtypes
        print("Loading CSV files with optimized dtypes...")
        orders = pd.read_csv(os.path.join(DATA_DIR, 'orders.csv'), dtype=orders_load_dtype)
        order_products_prior = pd.read_csv(os.path.join(DATA_DIR, 'order_products__prior.csv'), dtype=order_products_dtype)
        order_products_train = pd.read_csv(os.path.join(DATA_DIR, 'order_products__train.csv'), dtype=order_products_dtype)
        products = pd.read_csv(os.path.join(DATA_DIR, 'products.csv'), dtype=products_dtype)
        aisles = pd.read_csv(os.path.join(DATA_DIR, 'aisles.csv'), dtype=aisles_dtype)
        departments = pd.read_csv(os.path.join(DATA_DIR, 'departments.csv'), dtype=departments_dtype)

        # Downcast 'days_since_prior_order' after loading
        print("Downcasting 'days_since_prior_order' to float16...")
        orders['days_since_prior_order'] = orders['days_since_prior_order'].astype(np.float16)

        print(f"Loaded {len(orders)} orders")
        print(f"Loaded {len(order_products_prior)} prior order products")
        print(f"Loaded {len(order_products_train)} train order products")
        print(f"Loaded {len(products)} products")

        # Combine prior and train order products
        print("Combining order products...")
        all_order_products = pd.concat([
            order_products_prior,
            order_products_train
        ], ignore_index=True)

        print(f"Combined total: {len(all_order_products)} order products")

        # Merge with orders to get user and order information
        print("Merging with orders data...")
        merged = all_order_products.merge(orders, on='order_id', how='left')

        print(f"After merging: {len(merged)} records")

        # Select and rename columns for model format
        print("Formatting for model...")
        instacart_data = merged[[
            'user_id',
            'order_id',
            'order_number',
            'product_id',
            'add_to_cart_order',
            'reordered',
            'eval_set'
        ]].copy()

        # Sort by user, then order number, then cart order
        instacart_data = instacart_data.sort_values([
            'user_id',
            'order_number',
            'add_to_cart_order'
        ]).reset_index(drop=True)

        # Save the processed dataset
        output_path = os.path.join(OUTPUT_DIR, 'instacart.csv')
        instacart_data.to_csv(output_path, index=False)

        print(f"✅ Preprocessing complete!")
        print(f"📊 Processed dataset saved to: {output_path}")
        print(f"📈 Final dataset shape: {instacart_data.shape}")
        print(f"👥 Number of unique users: {instacart_data['user_id'].nunique()}")
        print(f"🛒 Number of unique orders: {instacart_data['order_id'].nunique()}")
        print(f"📦 Number of unique products: {instacart_data['product_id'].nunique()}")
    
    except Exception as e:
        print(f"⚠️ Got into a problem: {e}")
        raise SystemExit(1)

if __name__ == "__main__":
    preprocess_instacart()