# ml-service/src/services/feature_engineering.py
import pandas as pd
import numpy as np
import os
from typing import List, Dict

class FeatureEngineer:
    def __init__(self, processed_data_path: str):
        """
        Loads pre-computed, aggregated dataframes created by the offline
        data_preprocessing.py script. These dataframes contain global statistics
        about users and products.
        """
        self.path = processed_data_path
        self.products_df = None
        self.user_features_df = None
        self.prod_features_df = None
        self._load_precomputed_features()

    def _load_precomputed_features(self):
        """Loads the necessary CSVs into pandas DataFrames."""
        try:
            # Contains global features for every product (e.g., total purchases, reorder rate)
            self.prod_features_df = pd.read_csv(os.path.join(self.path, "prod_features.csv")).set_index('product_id')
            
            # Contains global features for every user (e.g., total orders, avg days between orders)
            self.user_features_df = pd.read_csv(os.path.join(self.path, "user_features.csv")).set_index('user_id')

            # Contains basic product info like aisle_id, department_id
            self.products_df = pd.read_csv(os.path.join(self.path, "products.csv"))

            print("FeatureEngineer: Pre-computed feature data loaded successfully.")
        except FileNotFoundError as e:
            print(f"ERROR in FeatureEngineer: Could not load pre-computed feature data from {self.path}. Details: {e}")
            # This is a critical error; the engineer cannot function without this data.
            raise e

    def generate_features_for_user(self, user_id: str, order_history: List[Dict]) -> pd.DataFrame:
        """
        Generates a feature DataFrame for a single user for real-time prediction.

        Args:
            user_id: The ID of the user from our application database.
            order_history: A list of the user's past orders, where each order is a 
                           dictionary containing keys like 'order_number', 'days_since_prior_order', 
                           and 'products' (a list of product_ids).

        Returns:
            A pandas DataFrame where each row represents a user-product pair,
            and columns are the features needed for the model to predict.
        """
        if order_history is None or len(order_history) < 1:
            return pd.DataFrame()

        # --- 1. Create a DataFrame from the user's personal order history ---
        # This transforms the JSON-like history into a structured DataFrame.
        user_history_df = pd.DataFrame([
            {'order_number': o['order_number'], 'product_id': p}
            for o in order_history for p in o.get('products', [])
        ])

        if user_history_df.empty:
            return pd.DataFrame()

        # --- 2. Create the "candidate" items for prediction ---
        # These are all the unique products the user has ever ordered.
        # The model will predict a reorder probability for each of these.
        candidate_products = user_history_df['product_id'].unique()
        features_df = pd.DataFrame({'product_id': candidate_products})
        features_df['user_id'] = user_id

        # --- 3. Merge Pre-computed GLOBAL Features ---
        # Here we are being "loyal to the pre-computed global aggregate".
        # We merge in the globally calculated features for the user and products.
        features_df = features_df.merge(self.user_features_df, on='user_id', how='left')
        features_df = features_df.merge(self.prod_features_df, on='product_id', how='left')

        # --- 4. Calculate DYNAMIC User-Product Features ---
        # This is the most sophisticated part. We calculate features based on this user's
        # specific interaction with each product.

        # Calculate how many times this user has ordered each product.
        up_total_orders = user_history_df.groupby('product_id').size().reset_index(name='up_total_orders')
        features_df = features_df.merge(up_total_orders, on='product_id', how='left')

        # Calculate the user's reorder rate for each product.
        features_df['up_reorder_rate'] = features_df['up_total_orders'] / features_df['user_total_orders']

        # Calculate when the user last ordered each product.
        last_order_numbers = user_history_df.groupby('product_id')['order_number'].max().reset_index(name='last_order_num')
        features_df = features_df.merge(last_order_numbers, on='product_id', how='left')
        
        # Calculate how many orders have passed since the last purchase of each item.
        latest_order_num = max(o['order_number'] for o in order_history)
        features_df['up_orders_since_last_order'] = latest_order_num - features_df['last_order_num']

        # --- 5. Final Cleanup ---
        # Select only the feature columns that the model was trained on.
        # This list must exactly match the columns from the training data.
        final_feature_columns = [
            'user_total_orders', 'user_mean_days_since_prior', 'user_total_items',
            'prod_total_purchases', 'prod_reorder_rate', 'prod_avg_add_to_cart_order',
            'up_total_orders', 'up_reorder_rate', 'up_orders_since_last_order'
            # ... and any other features your model was trained on
        ]
        
        # Ensure all required columns exist, filling missing ones with 0
        for col in final_feature_columns:
            if col not in features_df.columns:
                features_df[col] = 0
        
        final_features = features_df[final_feature_columns]

        # Fill any potential NaN values with 0
        final_features.fillna(0, inplace=True)
        
        print(f"Successfully generated a feature matrix of shape {final_features.shape} for user {user_id}")
        return final_features