# backend/ml_engine/build/preprocess.py
"""
Preprocess Instacart dataset for TIFUKNN model
This file outputs `instacart.csv`
Updated paths for new project structure
"""

import pandas as pd
import math
import os

# Updated data paths for new structure
DATA_DIR = "/app/data/dataset"  # Local copy in backend container
OUTPUT_DIR = "/app/data/dataset"

# For simplicity we take the first N users from the dataset, to enable 
# Comparison basket demo feature included in the app.
# The dataset by itself already contains random user purchase history,
# So we do not inflict or avert anything.
# Of course if we take only a fraction of the users due to deployment issues,
# We could pick random user from all over the dataset itself, but since the
# Instacart dataset itself deemed to be random by nature, there is just some level
# Of redundancy here (apperantly).
USER_ORDER_LOAD_FRACTION = float(os.getenv("USER_ORDER_LOAD_FRACTION")) # How many users to load

def preprocess_instacart():
    """
    Preprocess the raw Instacart CSV files into a single clean dataset
    """
    print("Starting Instacart dataset preprocessing...")
    
    # Load all CSV files
    print("Loading CSV files...")
    orders = pd.read_csv(os.path.join(DATA_DIR, 'orders.csv'))
    order_products_prior = pd.read_csv(os.path.join(DATA_DIR, 'order_products__prior.csv'))
    order_products_train = pd.read_csv(os.path.join(DATA_DIR, 'order_products__train.csv'))
    products = pd.read_csv(os.path.join(DATA_DIR, 'products.csv'))
    aisles = pd.read_csv(os.path.join(DATA_DIR, 'aisles.csv'))
    departments = pd.read_csv(os.path.join(DATA_DIR, 'departments.csv'))
    
    print(f"Loaded {len(orders)} orders")
    print(f"Loaded {len(order_products_prior)} prior order products")
    print(f"Loaded {len(order_products_train)} train order products")
    print(f"Loaded {len(products)} products")
    
    # Process data in smaller chunks to reduce memory usage
    print("Processing data in chunks to reduce memory usage...")
    
    # Sample the data to reduce processing time and memory usage
    print("Sampling data for deployment...")
    
    # Take a sample of orders
    unique_users = orders['user_id'].unique()
    n_users = math.ceil(len(unique_users) * USER_ORDER_LOAD_FRACTION)
    sampled_users = pd.Series(unique_users).iloc[:n_users]
    sampled_orders = orders[orders['user_id'].isin(sampled_users)]
    
    print(f"Sampled {len(sampled_orders)} orders from {len(sampled_users)} users")
    
    # Filter order products to only include sampled orders
    sampled_order_ids = set(sampled_orders['order_id'])
    
    print("Filtering order products...")
    order_products_prior_sample = order_products_prior[order_products_prior['order_id'].isin(sampled_order_ids)]
    order_products_train_sample = order_products_train[order_products_train['order_id'].isin(sampled_order_ids)]
    
    print(f"Filtered to {len(order_products_prior_sample)} prior + {len(order_products_train_sample)} train order products")
    
    # Combine sampled data
    order_products_prior_sample = order_products_prior_sample.copy()
    order_products_train_sample = order_products_train_sample.copy()
    order_products_prior_sample['eval_set'] = 'prior'
    order_products_train_sample['eval_set'] = 'train'
    
    all_order_products = pd.concat([
        order_products_prior_sample,
        order_products_train_sample
    ], ignore_index=True)
    
    print(f"Combined total: {len(all_order_products)} order products")
    
    # Merge with orders to get user and order information
    print("Merging with orders data...")
    # Use suffixes to avoid column conflicts
    merged = all_order_products.merge(sampled_orders, on='order_id', how='left', suffixes=('', '_order'))
    
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

if __name__ == "__main__":
    preprocess_instacart()