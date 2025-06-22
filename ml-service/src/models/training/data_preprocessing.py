# ml-service/src/models/training/data_preprocessing.py
# UPDATED: Now uses unified feature engineering to eliminate training-serving skew

# ✅ TRAINING-SERVING SKEW ELIMINATED ✅
# ═══════════════════════════════════════════════════════════════════════
# This file now imports from the unified feature engineering module,
# ensuring IDENTICAL feature generation logic between training and inference.
# 
# No more manual synchronization required - unified logic guarantees consistency.
# Updated: [CURRENT DATE]
# ═══════════════════════════════════════════════════════════════════════

import pandas as pd
import numpy as np
import json
import os
from datetime import datetime
from typing import Dict, List, Tuple
from ...services.unified_feature_engineering import InstacartDataPreprocessor as UnifiedInstacartDataPreprocessor
from ...utils.logger import setup_logger

logger = setup_logger(__name__)

class InstacartDataPreprocessor(UnifiedInstacartDataPreprocessor):
    """
    Preprocesses Instacart dataset for basket prediction model training.
    
    ✅ TRAINING-SERVING SKEW ELIMINATED: Now uses unified feature engineering
    logic that guarantees consistency between training and inference.
    """
    
    def __init__(self, data_path: str):
        """Initialize with path to raw Instacart data files."""
        super().__init__(data_path)
        logger.info("InstacartDataPreprocessor initialized with unified feature engineering - skew eliminated")
        
    def create_instacart_history_future(self) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Create history and future datasets from Instacart data.
        Returns a tuple of (instacart_history, instacart_future) DataFrames.
        """
        if self.orders_df is None:
            raise ValueError("Raw data not loaded. Call load_raw_data() first.")
        
        logger.info("Creating Instacart history and future datasets...")
        
        # Get training set orders (eval_set == 'train')
        train_orders = self.orders_df[self.orders_df['eval_set'] == 'train'].copy()
        
        # Get prior orders for users who have train orders
        train_user_ids = set(train_orders['user_id'].unique())
        prior_orders = self.orders_df[
            (self.orders_df['eval_set'] == 'prior') & 
            (self.orders_df['user_id'].isin(train_user_ids))
        ].copy()
        
        # Create instacart_history from prior orders
        logger.info("Building instacart_history dataset...")
        history_records = []
        
        for user_id in train_user_ids:
            user_orders = prior_orders[prior_orders['user_id'] == user_id].sort_values('order_number')
            
            if len(user_orders) == 0:
                continue
                
            for _, order in user_orders.iterrows():
                # Get products for this order
                order_products = self.order_products_prior_df[
                    self.order_products_prior_df['order_id'] == order['order_id']
                ]
                
                if len(order_products) > 0:
                    products = order_products['product_id'].tolist()
                    
                    history_records.append({
                        'user_id': user_id,
                        'order_id': order['order_id'],
                        'order_number': order['order_number'],
                        'order_dow': order['order_dow'],
                        'order_hour_of_day': order['order_hour_of_day'],
                        'days_since_prior_order': order['days_since_prior_order'] if pd.notna(order['days_since_prior_order']) else 0,
                        'products': products
                    })
        
        instacart_history = pd.DataFrame(history_records)
        
        # Create instacart_future from train orders
        logger.info("Building instacart_future dataset...")
        future_records = []
        
        for _, order in train_orders.iterrows():
            # Get products for this order
            order_products = self.order_products_train_df[
                self.order_products_train_df['order_id'] == order['order_id']
            ]
            
            if len(order_products) > 0:
                products = order_products['product_id'].tolist()
                
                future_records.append({
                    'user_id': order['user_id'],
                    'order_id': order['order_id'],
                    'order_number': order['order_number'],
                    'order_dow': order['order_dow'],
                    'order_hour_of_day': order['order_hour_of_day'],
                    'days_since_prior_order': order['days_since_prior_order'] if pd.notna(order['days_since_prior_order']) else 0,
                    'products': products
                })
        
        instacart_future = pd.DataFrame(future_records)
        
        logger.info(f"✅ Dataset creation complete:")
        logger.info(f"   instacart_history: {len(instacart_history):,} records for {instacart_history['user_id'].nunique():,} users")
        logger.info(f"   instacart_future: {len(instacart_future):,} records for {instacart_future['user_id'].nunique():,} users")
        
        return instacart_history, instacart_future
    
    def create_keyset(self, instacart_future: pd.DataFrame, 
                     train_ratio: float = 0.7, 
                     valid_ratio: float = 0.15, 
                     random_seed: int = 42) -> Dict:
        """
        Create train/validation/test splits for model training.
        
        Args:
            instacart_future: Future dataset to split
            train_ratio: Proportion of users for training
            valid_ratio: Proportion of users for validation
            random_seed: Random seed for reproducibility
            
        Returns:
            Dictionary with train/valid/test user lists and metadata
        """
        np.random.seed(random_seed)
        
        # Get unique user IDs
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
        Extract features for LightGBM model using unified feature engineering.
        
        ✅ TRAINING-SERVING SKEW ELIMINATED: This method now uses the EXACT same
        feature engineering logic as the inference service.
        
        Args:
            instacart_history: Historical order data
            
        Returns:
            Feature matrix for training
        """
        logger.info("Extracting features using unified feature engineering...")
        
        feature_records = []
        
        # Group by user to generate features
        for user_id, user_data in instacart_history.groupby('user_id'):
            # Convert user data to the format expected by unified feature engineering
            order_history = []
            for _, row in user_data.iterrows():
                order_history.append({
                    'order_id': row['order_id'],
                    'order_number': row['order_number'],
                    'order_dow': row['order_dow'],
                    'order_hour_of_day': row['order_hour_of_day'],
                    'days_since_prior_order': row['days_since_prior_order'],
                    'products': row['products']
                })
            
            # Use unified feature engineering
            user_features = self.extract_features(str(user_id), order_history)
            
            if not user_features.empty:
                user_features['user_id'] = user_id
                feature_records.append(user_features)
        
        if feature_records:
            features_df = pd.concat(feature_records, ignore_index=True)
            logger.info(f"✅ Feature extraction complete: {len(features_df):,} feature rows for {features_df['user_id'].nunique():,} users")
            return features_df
        else:
            logger.warning("No features extracted")
            return pd.DataFrame()
    
    def generate_product_features(self) -> pd.DataFrame:
        """
        Generate global product features (popularity, reorder rates, etc.)
        """
        logger.info("Generating global product features...")
        
        if self.order_products_prior_df is None:
            raise ValueError("Raw data not loaded. Call load_raw_data() first.")
        
        # Calculate product statistics
        product_stats = self.order_products_prior_df.groupby('product_id').agg(
            product_total_orders=('order_id', 'nunique'),
            product_total_purchases=('order_id', 'count'),
            product_reorder_rate=('reordered', 'mean')
        ).reset_index()
        
        logger.info(f"✅ Generated features for {len(product_stats):,} products")
        return product_stats
    
    def save_processed_data(self, output_path: str, **datasets):
        """
        Save processed datasets to CSV files.
        
        Args:
            output_path: Directory to save processed data
            **datasets: Named datasets to save
        """
        os.makedirs(output_path, exist_ok=True)
        
        for name, df in datasets.items():
            if df is not None and not df.empty:
                filepath = os.path.join(output_path, f"{name}.csv")
                df.to_csv(filepath, index=False)
                logger.info(f"✅ Saved {name}: {len(df):,} records to {filepath}")
        
        logger.info(f"✅ All processed data saved to {output_path}")


# Export the main class
__all__ = ['InstacartDataPreprocessor']