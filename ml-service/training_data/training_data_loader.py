# ml-service/training_data/training_data_loader.py
import os
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
from loguru import logger
import pickle
from collections import defaultdict

class DataLoader:
    """
    Loads and manages Instacart dataset for TIFU-KNN predictions
    """
    
    def __init__(self):
        self.user_baskets = {}  # user_id -> list of baskets (each basket is list of product_ids)
        self.user_future_baskets = {}  # user_id -> future basket (for evaluation)
        self.products = {}  # product_id -> product info
        self.order_info = {}  # (user_id, order_idx) -> order temporal info
        self.user_ids = []
        self.is_loaded = False
        
    def load_instacart_data(self, data_path: str):
        """
        Load Instacart dataset from CSV files
        """
        logger.info(f"Loading Instacart data from {data_path}")
        
        try:
            # Load products
            self._load_products(data_path)
            
            # Load orders
            orders_df = self._load_orders(data_path)
            
            # Load order products (prior and train)
            self._load_order_products(data_path, orders_df)
            
            self.is_loaded = True
            logger.info(f"Successfully loaded data for {len(self.user_baskets)} users")
            
        except Exception as e:
            logger.error(f"Failed to load Instacart data: {e}")
            raise
    
    def _load_products(self, data_path: str):
        """Load products with their metadata"""
        products_file = os.path.join(data_path, "products.csv")
        aisles_file = os.path.join(data_path, "aisles.csv")
        departments_file = os.path.join(data_path, "departments.csv")
        
        # Load products
        if os.path.exists(products_file):
            logger.info("Loading products...")
            products_df = pd.read_csv(products_file)
            
            # Load aisles and departments if available
            aisles_df = None
            departments_df = None
            
            if os.path.exists(aisles_file):
                aisles_df = pd.read_csv(aisles_file)
                products_df = products_df.merge(aisles_df, on='aisle_id', how='left')
            
            if os.path.exists(departments_file):
                departments_df = pd.read_csv(departments_file)
                products_df = products_df.merge(departments_df, on='department_id', how='left')
            
            # Store products
            for _, row in products_df.iterrows():
                self.products[row['product_id']] = {
                    'product_name': row['product_name'],
                    'aisle': row.get('aisle', 'Unknown'),
                    'department': row.get('department', 'Unknown'),
                    'aisle_id': row.get('aisle_id', -1),
                    'department_id': row.get('department_id', -1)
                }
            
            logger.info(f"Loaded {len(self.products)} products")
        else:
            logger.warning(f"Products file not found at {products_file}")
    
    def _load_orders(self, data_path: str) -> pd.DataFrame:
        """Load orders with temporal information"""
        orders_file = os.path.join(data_path, "orders.csv")
        
        if not os.path.exists(orders_file):
            raise FileNotFoundError(f"Orders file not found at {orders_file}")
        
        logger.info("Loading orders...")
        orders_df = pd.read_csv(orders_file)
        
        # Store temporal information for each order
        for _, row in orders_df.iterrows():
            user_id = row['user_id']
            order_number = row['order_number'] - 1  # Convert to 0-based index
            
            if user_id not in self.order_info:
                self.order_info[user_id] = {}
            
            self.order_info[user_id][order_number] = {
                'order_id': row['order_id'],
                'order_dow': row.get('order_dow', 0),
                'order_hour_of_day': row.get('order_hour_of_day', 10),
                'days_since_prior_order': row.get('days_since_prior_order', None),
                'eval_set': row['eval_set']
            }
        
        logger.info(f"Loaded {len(orders_df)} orders")
        return orders_df
    
    def _load_order_products(self, data_path: str, orders_df: pd.DataFrame):
        """Load order products and organize into baskets"""
        prior_file = os.path.join(data_path, "order_products__prior.csv")
        train_file = os.path.join(data_path, "order_products__train.csv")
        
        # Create order_id to user_id mapping
        order_to_user = dict(zip(orders_df['order_id'], orders_df['user_id']))
        order_to_eval = dict(zip(orders_df['order_id'], orders_df['eval_set']))
        
        # Load prior orders
        if os.path.exists(prior_file):
            logger.info("Loading prior order products...")
            prior_df = pd.read_csv(prior_file)
            
            # Group by order and create baskets
            for order_id, group in prior_df.groupby('order_id'):
                if order_id in order_to_user:
                    user_id = order_to_user[order_id]
                    products = group['product_id'].tolist()
                    
                    if user_id not in self.user_baskets:
                        self.user_baskets[user_id] = []
                    
                    self.user_baskets[user_id].append(products)
        
        # Load train orders (future baskets for evaluation)
        if os.path.exists(train_file):
            logger.info("Loading train order products...")
            train_df = pd.read_csv(train_file)
            
            for order_id, group in train_df.groupby('order_id'):
                if order_id in order_to_user:
                    user_id = order_to_user[order_id]
                    products = group['product_id'].tolist()
                    
                    # This is the future basket for evaluation
                    self.user_future_baskets[user_id] = products
        
        # Sort baskets by order for each user
        for user_id in self.user_baskets:
            # Ensure chronological order based on order_number
            if user_id in self.order_info:
                # Sort baskets based on order info
                sorted_baskets = []
                for order_idx in sorted(self.order_info[user_id].keys()):
                    if order_idx < len(self.user_baskets[user_id]):
                        sorted_baskets.append(self.user_baskets[user_id][order_idx])
                self.user_baskets[user_id] = sorted_baskets
        
        # Store user IDs
        self.user_ids = list(self.user_baskets.keys())
        
        logger.info(f"Loaded baskets for {len(self.user_baskets)} users")
        logger.info(f"Loaded future baskets for {len(self.user_future_baskets)} users")
    
    def get_user_baskets(self, user_id: int) -> List[List[int]]:
        """Get all baskets for a user"""
        return self.user_baskets.get(user_id, [])
    
    def get_user_future_basket(self, user_id: int) -> Optional[List[int]]:
        """Get future basket for a user (for evaluation)"""
        return self.user_future_baskets.get(user_id, None)
    
    def get_product_info(self, product_id: int) -> Optional[Dict]:
        """Get product information"""
        return self.products.get(product_id, None)
    
    def get_order_info(self, user_id: int, order_idx: int) -> Optional[Dict]:
        """Get temporal information for a specific order"""
        if user_id in self.order_info and order_idx in self.order_info[user_id]:
            return self.order_info[user_id][order_idx]
        return None
    
    def get_user_count(self) -> int:
        """Get total number of users"""
        return len(self.user_baskets)
    
    def get_product_count(self) -> int:
        """Get total number of products"""
        return len(self.products)
    
    def get_total_orders(self) -> int:
        """Get total number of orders"""
        return sum(len(baskets) for baskets in self.user_baskets.values())
    
    def get_future_basket_count(self) -> int:
        """Get number of users with future baskets"""
        return len(self.user_future_baskets)
    
    def get_available_user_ids(self, limit: int = 100) -> List[int]:
        """Get list of available user IDs"""
        # Return users that have both history and future baskets (for demo)
        users_with_future = [
            uid for uid in self.user_ids 
            if uid in self.user_future_baskets
        ]
        return sorted(users_with_future)[:limit]
    
    def get_all_user_products(self, user_id: int) -> List[int]:
        """Get all unique products ever purchased by a user"""
        all_products = []
        for basket in self.get_user_baskets(user_id):
            all_products.extend(basket)
        return list(set(all_products))
    
    def save_processed_data(self, output_path: str):
        """Save processed data for faster loading"""
        data = {
            'user_baskets': self.user_baskets,
            'user_future_baskets': self.user_future_baskets,
            'products': self.products,
            'order_info': self.order_info,
            'user_ids': self.user_ids
        }
        
        os.makedirs(output_path, exist_ok=True)
        with open(os.path.join(output_path, 'processed_data.pkl'), 'wb') as f:
            pickle.dump(data, f)
        
        logger.info(f"Saved processed data to {output_path}")
    
    def load_processed_data(self, input_path: str) -> bool:
        """Load preprocessed data if available"""
        pkl_file = os.path.join(input_path, 'processed_data.pkl')
        
        if os.path.exists(pkl_file):
            logger.info(f"Loading processed data from {pkl_file}")
            try:
                with open(pkl_file, 'rb') as f:
                    data = pickle.load(f)
                
                self.user_baskets = data['user_baskets']
                self.user_future_baskets = data['user_future_baskets']
                self.products = data['products']
                self.order_info = data['order_info']
                self.user_ids = data['user_ids']
                self.is_loaded = True
                
                logger.info("Successfully loaded processed data")
                return True
            except Exception as e:
                logger.error(f"Failed to load processed data: {e}")
                return False
        
        return False