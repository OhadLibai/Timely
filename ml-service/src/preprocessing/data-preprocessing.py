# ml-service/src/preprocessing/data_preprocessing.py
import pandas as pd
import numpy as np
import json
import os
from typing import Dict, List, Tuple, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class InstacartDataPreprocessor:
    """
    Preprocesses Instacart dataset for next basket prediction
    Based on jsaikrishna's implementation
    """
    
    def __init__(self, data_path: str):
        self.data_path = data_path
        self.orders = None
        self.order_products_prior = None
        self.order_products_train = None
        self.products = None
        self.aisles = None
        self.departments = None
        
    def load_raw_data(self):
        """Load raw Instacart CSV files"""
        logger.info("Loading Instacart dataset...")
        
        try:
            self.orders = pd.read_csv(os.path.join(self.data_path, "orders.csv"))
            self.order_products_prior = pd.read_csv(os.path.join(self.data_path, "order_products__prior.csv"))
            self.order_products_train = pd.read_csv(os.path.join(self.data_path, "order_products__train.csv"))
            self.products = pd.read_csv(os.path.join(self.data_path, "products.csv"))
            self.aisles = pd.read_csv(os.path.join(self.data_path, "aisles.csv"))
            self.departments = pd.read_csv(os.path.join(self.data_path, "departments.csv"))
            
            logger.info(f"Loaded {len(self.orders)} orders")
            logger.info(f"Loaded {len(self.products)} products")
            
        except FileNotFoundError as e:
            logger.error(f"Dataset file not found: {e}")
            raise
    
    def create_instacart_history_future(self) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Create instacart_history (all prior orders) and instacart_future (last order)
        Following the Reality Check methodology
        """
        logger.info("Creating history and future datasets...")
        
        # Separate train and prior orders
        train_orders = self.orders[self.orders.eval_set == 'train']
        prior_orders = self.orders[self.orders.eval_set == 'prior']
        
        # Get user order history (all prior orders)
        history_data = []
        future_data = []
        
        # Process each user
        for user_id in train_orders.user_id.unique():
            # Get user's prior orders
            user_prior_orders = prior_orders[prior_orders.user_id == user_id].sort_values('order_number')
            
            if len(user_prior_orders) == 0:
                continue
                
            # Get products from prior orders (history)
            prior_order_ids = user_prior_orders.order_id.tolist()
            user_prior_products = self.order_products_prior[
                self.order_products_prior.order_id.isin(prior_order_ids)
            ]
            
            # Group by order to create basket history
            for order_id in prior_order_ids:
                order_products = user_prior_products[user_prior_products.order_id == order_id]
                product_list = order_products.product_id.tolist()
                
                order_info = user_prior_orders[user_prior_orders.order_id == order_id].iloc[0]
                
                history_data.append({
                    'user_id': user_id,
                    'order_id': order_id,
                    'order_number': order_info.order_number,
                    'order_dow': order_info.order_dow,
                    'order_hour_of_day': order_info.order_hour_of_day,
                    'days_since_prior_order': order_info.days_since_prior_order,
                    'products': product_list
                })
            
            # Get train order (future basket to predict)
            train_order = train_orders[train_orders.user_id == user_id].iloc[0]
            train_products = self.order_products_train[
                self.order_products_train.order_id == train_order.order_id
            ]
            
            future_data.append({
                'user_id': user_id,
                'order_id': train_order.order_id,
                'products': train_products.product_id.tolist()
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
        Following jsaikrishna's feature engineering approach
        """
        features_list = []
        
        # Group by user
        for user_id, user_orders in instacart_history.groupby('user_id'):
            user_features = {}
            user_features['user_id'] = user_id
            
            # User-level features
            user_features['user_total_orders'] = len(user_orders)
            user_features['user_avg_days_between_orders'] = user_orders['days_since_prior_order'].mean()
            user_features['user_std_days_between_orders'] = user_orders['days_since_prior_order'].std()
            
            # Product frequency features
            all_products = []
            for products in user_orders['products']:
                all_products.extend(products)
            
            product_counts = pd.Series(all_products).value_counts()
            user_features['user_distinct_products'] = len(product_counts)
            user_features['user_avg_products_per_order'] = len(all_products) / len(user_orders)
            
            # Time features
            user_features['user_favorite_dow'] = user_orders['order_dow'].mode()[0] if len(user_orders['order_dow'].mode()) > 0 else 0
            user_features['user_favorite_hour'] = user_orders['order_hour_of_day'].mode()[0] if len(user_orders['order_hour_of_day'].mode()) > 0 else 0
            
            # For each product, create product-specific features
            for product_id, count in product_counts.items():
                product_feature = user_features.copy()
                product_feature['product_id'] = product_id
                product_feature['user_product_orders'] = count
                product_feature['user_product_order_rate'] = count / len(user_orders)
                
                # Find first and last order containing this product
                product_orders = []
                for idx, row in user_orders.iterrows():
                    if product_id in row['products']:
                        product_orders.append(row['order_number'])
                
                if product_orders:
                    product_feature['user_product_first_order'] = min(product_orders)
                    product_feature['user_product_last_order'] = max(product_orders)
                    product_feature['user_product_orders_since_last'] = len(user_orders) - max(product_orders)
                
                features_list.append(product_feature)
        
        features_df = pd.DataFrame(features_list)
        
        # Add product features
        features_df = self._add_product_features(features_df)
        
        return features_df
    
    def _add_product_features(self, features_df: pd.DataFrame) -> pd.DataFrame:
        """Add product-level features"""
        # Merge with product information
        products_info = self.products.merge(self.aisles, on='aisle_id').merge(self.departments, on='department_id')
        
        # Calculate product popularity
        product_popularity = self.order_products_prior.groupby('product_id').size().reset_index(name='product_total_orders')
        product_reorder_rate = self.order_products_prior.groupby('product_id')['reordered'].mean().reset_index(name='product_reorder_rate')
        
        # Merge features
        features_df = features_df.merge(products_info[['product_id', 'aisle_id', 'department_id']], on='product_id', how='left')
        features_df = features_df.merge(product_popularity, on='product_id', how='left')
        features_df = features_df.merge(product_reorder_rate, on='product_id', how='left')
        
        # Fill missing values
        features_df['product_total_orders'] = features_df['product_total_orders'].fillna(0)
        features_df['product_reorder_rate'] = features_df['product_reorder_rate'].fillna(0)
        
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
    data_path = "/app/data/instacart"
    output_path = "/app/data/processed"
    
    preprocessor = InstacartDataPreprocessor(data_path)
    preprocessor.load_raw_data()
    preprocessor.save_processed_data(output_path)

if __name__ == "__main__":
    main()
