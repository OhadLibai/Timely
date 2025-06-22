# ml-service/src/models/training/data_preprocessing.py
# Data preprocessing for Instacart basket prediction model training

# 🚨 CRITICAL WARNING: FEATURE ENGINEERING SYNCHRONIZATION REQUIRED 🚨
# ═══════════════════════════════════════════════════════════════════════
# The feature generation logic in this file MUST be kept in sync with:
# ml-service/src/services/enhanced_feature_engineering.py
# 
# ANY changes to feature engineering MUST be applied to BOTH files to ensure
# model performance consistency between training and inference.
# 
# Last Synchronized: [UPDATE THIS DATE WHEN MAKING CHANGES]
# ═══════════════════════════════════════════════════════════════════════

import pandas as pd
import numpy as np
import json
import os
from datetime import datetime
from typing import Dict, List, Tuple
from ..utils.logger import setup_logger

logger = setup_logger(__name__)

class InstacartDataPreprocessor:
    """
    Preprocesses Instacart dataset for basket prediction model training.
    
    ⚠️  SYNCHRONIZATION CRITICAL: The extract_features method MUST use IDENTICAL
    feature engineering logic as enhanced_feature_engineering.py to ensure
    model performance consistency between training and inference.
    """
    
    def __init__(self, data_path: str):
        """Initialize with path to raw Instacart data files."""
        self.data_path = data_path
        self.orders_df = None
        self.order_products_prior_df = None
        self.order_products_train_df = None
        self.products_df = None
        self.aisles_df = None
        self.departments_df = None
        
    def load_raw_data(self):
        """Load all raw CSV files."""
        logger.info("Loading raw Instacart data files...")
        
        self.orders_df = pd.read_csv(os.path.join(self.data_path, "orders.csv"))
        self.order_products_prior_df = pd.read_csv(os.path.join(self.data_path, "order_products__prior.csv"))
        self.order_products_train_df = pd.read_csv(os.path.join(self.data_path, "order_products__train.csv"))
        self.products_df = pd.read_csv(os.path.join(self.data_path, "products.csv"))
        self.aisles_df = pd.read_csv(os.path.join(self.data_path, "aisles.csv"))
        self.departments_df = pd.read_csv(os.path.join(self.data_path, "departments.csv"))
        
        logger.info("✅ Raw data loaded successfully")
        logger.info(f"Orders: {len(self.orders_df):,}")
        logger.info(f"Prior order products: {len(self.order_products_prior_df):,}")
        logger.info(f"Train order products: {len(self.order_products_train_df):,}")
        logger.info(f"Products: {len(self.products_df):,}")
    
    def create_instacart_history_future(self) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Create history and future datasets from Instacart data.
        History: All prior orders grouped by user
        Future: Train orders (ground truth for prediction)
        """
        logger.info("Creating history and future datasets...")
        
        # Get prior orders with products
        prior_orders = self.orders_df[self.orders_df['eval_set'] == 'prior'].copy()
        train_orders = self.orders_df[self.orders_df['eval_set'] == 'train'].copy()
        
        # Merge orders with products
        prior_with_products = prior_orders.merge(
            self.order_products_prior_df, on='order_id', how='inner'
        )
        train_with_products = train_orders.merge(
            self.order_products_train_df, on='order_id', how='inner'
        )
        
        # Group products by order for history
        history_data = []
        for user_id in prior_orders['user_id'].unique():
            user_orders = prior_with_products[prior_with_products['user_id'] == user_id]
            
            for order_id in user_orders['order_id'].unique():
                order_data = user_orders[user_orders['order_id'] == order_id].iloc[0]
                order_products = user_orders[user_orders['order_id'] == order_id]['product_id'].tolist()
                
                history_data.append({
                    'user_id': int(user_id),
                    'order_id': int(order_id),
                    'order_number': int(order_data['order_number']),
                    'order_dow': int(order_data['order_dow']),
                    'order_hour_of_day': int(order_data['order_hour_of_day']),
                    'days_since_prior_order': float(order_data['days_since_prior_order'] if pd.notna(order_data['days_since_prior_order']) else 0),
                    'products': order_products
                })
        
        # Group products by user for future (ground truth)
        future_data = []
        for user_id in train_orders['user_id'].unique():
            user_products = train_with_products[train_with_products['user_id'] == user_id]['product_id'].tolist()
            
            future_data.append({
                'user_id': int(user_id),
                'products': json.dumps(user_products)  # Store as JSON string
            })
        
        instacart_history = pd.DataFrame(history_data)
        instacart_future = pd.DataFrame(future_data)
        
        logger.info(f"Created history with {len(instacart_history)} orders")
        logger.info(f"Created future with {len(instacart_future)} users")
        
        return instacart_history, instacart_future
    
    def create_keyset_fold(self, instacart_future: pd.DataFrame, 
                          train_ratio: float = 0.8, 
                          valid_ratio: float = 0.1,
                          test_ratio: float = 0.1,
                          random_seed: int = 42) -> Dict:
        """
        Create train/valid/test split following keyset_fold.py logic
        """
        np.random.seed(random_seed)
        
        user_ids = instacart_future.user_id.unique()
        n_users = len(user_ids)
        
        # Shuffle users
        np.random.shuffle(user_ids)
        
        # Calculate split indices
        train_end = int(n_users * train_ratio)
        valid_end = train_end + int(n_users * valid_ratio)
        
        # Split users
        train_users = user_ids[:train_end].tolist()
        valid_users = user_ids[train_end:valid_end].tolist()
        test_users = user_ids[valid_end:].tolist()
        
        keyset = {
            'train': train_users,
            'valid': valid_users,
            'test': test_users,
            'metadata': {
                'total_users': n_users,
                'train_size': len(train_users),
                'valid_size': len(valid_users),
                'test_size': len(test_users),
                'random_seed': random_seed,
                'created_at': datetime.now().isoformat()
            }
        }
        
        logger.info(f"Created keyset: train={len(train_users)}, valid={len(valid_users)}, test={len(test_users)}")
        
        return keyset
    
    def extract_features(self, instacart_history: pd.DataFrame) -> pd.DataFrame:
        """
        Extract features for LightGBM model
        
        ⚠️  CRITICAL: This method implements the EXACT feature engineering logic
        that MUST be synchronized with enhanced_feature_engineering.py to ensure
        model performance consistency between training and inference.
        
        Following jsaikrishna's feature engineering approach
        """
        logger.info("Extracting features from history data...")
        
        # ⚠️  CRITICAL: User-level features (MUST match inference logic)
        user_features = []
        
        for user_id in instacart_history['user_id'].unique():
            user_orders = instacart_history[instacart_history['user_id'] == user_id]
            
            # Calculate user statistics
            user_total_orders = len(user_orders)
            user_avg_days_between_orders = user_orders['days_since_prior_order'].mean()
            user_std_days_between_orders = user_orders['days_since_prior_order'].std()
            user_favorite_dow = user_orders['order_dow'].mode()[0] if not user_orders['order_dow'].empty else 0
            user_favorite_hour = user_orders['order_hour_of_day'].mode()[0] if not user_orders['order_hour_of_day'].empty else 12
            
            # Explode products for user-product features
            user_product_history = user_orders.explode('products').rename(columns={'products': 'product_id'})
            
            # ⚠️  CRITICAL: User-product features (MUST match inference logic)
            for product_id in user_product_history['product_id'].unique():
                if pd.isna(product_id):
                    continue
                    
                product_orders = user_product_history[user_product_history['product_id'] == product_id]
                
                user_product_orders = len(product_orders['order_id'].unique())
                user_product_first_order = product_orders['order_number'].min()
                user_product_last_order = product_orders['order_number'].max()
                user_product_order_rate = user_product_orders / user_total_orders
                user_product_orders_since_last = user_total_orders - user_product_last_order
                
                user_features.append({
                    'user_id': user_id,
                    'product_id': int(product_id),
                    'user_total_orders': user_total_orders,
                    'user_avg_days_between_orders': user_avg_days_between_orders,
                    'user_std_days_between_orders': user_std_days_between_orders,
                    'user_favorite_dow': user_favorite_dow,
                    'user_favorite_hour': user_favorite_hour,
                    'user_product_orders': user_product_orders,
                    'user_product_first_order': user_product_first_order,
                    'user_product_last_order': user_product_last_order,
                    'user_product_order_rate': user_product_order_rate,
                    'user_product_orders_since_last': user_product_orders_since_last
                })
        
        features_df = pd.DataFrame(user_features)
        
        # ⚠️  CRITICAL: Product-level features (MUST match inference logic)
        # Calculate global product statistics
        all_products = instacart_history.explode('products').rename(columns={'products': 'product_id'})
        all_products = all_products[all_products['product_id'].notna()]
        all_products['product_id'] = all_products['product_id'].astype(int)
        
        product_popularity = all_products.groupby('product_id').agg(
            product_total_orders=('order_id', 'nunique')
        ).reset_index()
        
        # Calculate product reorder rate
        product_reorder_data = []
        for product_id in all_products['product_id'].unique():
            product_orders = all_products[all_products['product_id'] == product_id]
            total_orders = len(product_orders)
            reorders = len(product_orders[product_orders['order_number'] > 1])
            reorder_rate = reorders / total_orders if total_orders > 0 else 0
            
            product_reorder_data.append({
                'product_id': product_id,
                'product_reorder_rate': reorder_rate
            })
        
        product_reorder_rate = pd.DataFrame(product_reorder_data).set_index('product_id')['product_reorder_rate']
        
        # Get product information
        products_info = self.products_df.copy()
        
        # Merge all product features
        product_popularity = product_popularity.set_index('product_id')['product_total_orders']
        
        # Merge features
        features_df = features_df.merge(products_info[['product_id', 'aisle_id', 'department_id']], on='product_id', how='left')
        features_df = features_df.merge(product_popularity, on='product_id', how='left')
        features_df = features_df.merge(product_reorder_rate, on='product_id', how='left')
        
        # Fill missing values
        features_df['product_total_orders'] = features_df['product_total_orders'].fillna(0)
        features_df['product_reorder_rate'] = features_df['product_reorder_rate'].fillna(0)
        
        logger.info(f"Generated {len(features_df)} feature rows")
        return features_df
    
    def save_processed_data(self, output_path: str):
        """Save processed data for model training"""
        os.makedirs(output_path, exist_ok=True)
        
        # Process data
        instacart_history, instacart_future = self.create_instacart_history_future()
        keyset = self.create_keyset_fold(instacart_future)
        features = self.extract_features(instacart_history)
        
        # Save files
        instacart_history.to_csv(os.path.join(output_path, "instacart_history.csv"), index=False)
        instacart_future.to_csv(os.path.join(output_path, "instacart_future.csv"), index=False)
        features.to_csv(os.path.join(output_path, "features.csv"), index=False)
        
        # Save additional feature files for inference
        product_features = features.groupby('product_id').agg({
            'product_total_orders': 'first',
            'product_reorder_rate': 'first'
        }).reset_index()
        product_features.to_csv(os.path.join(output_path, "prod_features.csv"), index=False)
        
        with open(os.path.join(output_path, "instacart_keyset_0.json"), 'w') as f:
            json.dump(keyset, f, indent=2)
        
        logger.info(f"Saved processed data to {output_path}")
        
        return {
            'instacart_history': instacart_history,
            'instacart_future': instacart_future,
            'keyset': keyset,
            'features': features
        }

def main():
    """Main preprocessing pipeline"""
    data_path = os.getenv("RAW_DATA_PATH", "/app/data")
    output_path = os.getenv("PROCESSED_DATA_PATH", "/app/data/processed")
    
    preprocessor = InstacartDataPreprocessor(data_path)
    preprocessor.load_raw_data()
    preprocessor.save_processed_data(output_path)

if __name__ == "__main__":
    main()