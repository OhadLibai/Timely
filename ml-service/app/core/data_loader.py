# ml-service/training_data/training_data_loader.py
"""
Updated DataLoader with preprocessing integration for TIFU-KNN
Now includes JSON export functionality and keyset generation
"""

import os
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
from loguru import logger
import pickle
from collections import defaultdict
from pathlib import Path
from dotenv import load_dotenv

# Load root .env
root_dir = Path(__file__).parent.parent.parent.parent
load_dotenv(root_dir / '.env')

class DataLoader:
    """
    Loads and manages Instacart dataset for TIFU-KNN predictions
    Enhanced with preprocessing capabilities
    """
    
    def __init__(self):
        self.user_baskets = {}  # user_id -> list of baskets (each basket is list of product_ids)
        self.user_future_baskets = {}  # user_id -> future basket (for evaluation)
        self.products = {}  # product_id -> product info
        self.order_info = {}  # (user_id, order_idx) -> order temporal info
        self.user_ids = []
        self.is_loaded = False
        self.preprocessed_data_paths = None
        self.dataset_path = os.getenv("DATASET_PATH", "/app/dataset")
        self.cache_path = os.getenv("CACHE_PATH", "/app/data/cache")
        
    def load_instacart_data(self, data_path: str, preprocess: bool = True):
        """
        Load Instacart dataset from CSV files with optional preprocessing
        
        Args:
            data_path: Path to directory containing CSV files
            preprocess: Whether to preprocess data for TIFU-KNN after loading
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
            
            # Preprocess for TIFU-KNN if requested
            if preprocess:
                self.preprocess_for_tifuknn()
            
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
            if os.path.exists(departments_file):
                departments_df = pd.read_csv(departments_file)
            
            # Merge data
            if aisles_df is not None:
                products_df = products_df.merge(aisles_df, on='aisle_id', how='left')
            if departments_df is not None:
                products_df = products_df.merge(departments_df, on='department_id', how='left')
            
            # Store products
            for _, row in products_df.iterrows():
                self.products[row['product_id']] = {
                    'product_name': row['product_name'],
                    'aisle': row.get('aisle', 'Unknown'),
                    'department': row.get('department', 'Unknown'),
                    'aisle_id': row.get('aisle_id'),
                    'department_id': row.get('department_id')
                }
            
            logger.info(f"Loaded {len(self.products)} products")
        else:
            logger.warning(f"Products file not found: {products_file}")
    
    def _load_orders(self, data_path: str) -> pd.DataFrame:
        """Load orders data"""
        orders_file = os.path.join(data_path, "orders.csv")
        
        if not os.path.exists(orders_file):
            raise FileNotFoundError(f"Orders file not found: {orders_file}")
        
        logger.info("Loading orders...")
        orders_df = pd.read_csv(orders_file)
        
        # Store temporal information for each order
        for _, row in orders_df.iterrows():
            user_id = row['user_id']
            order_number = row['order_number'] - 1  # 0-indexed
            
            self.order_info[(user_id, order_number)] = {
                'order_id': row['order_id'],
                'order_dow': row.get('order_dow', 0),
                'order_hour_of_day': row.get('order_hour_of_day', 10),
                'days_since_prior_order': row.get('days_since_prior_order', np.nan)
            }
        
        return orders_df
    
    def _load_order_products(self, data_path: str, orders_df: pd.DataFrame):
        """Load order products for prior and train sets"""
        prior_file = os.path.join(data_path, "order_products__prior.csv")
        train_file = os.path.join(data_path, "order_products__train.csv")
        
        # Get train orders (future baskets for evaluation)
        train_orders = set(orders_df[orders_df['eval_set'] == 'train']['order_id'].values)
        
        # Load prior orders
        if os.path.exists(prior_file):
            logger.info("Loading prior order products...")
            prior_df = pd.read_csv(prior_file)
            
            # Group by order
            prior_grouped = prior_df.groupby('order_id')['product_id'].apply(list).to_dict()
            
            # Build user baskets
            for _, order in orders_df[orders_df['eval_set'] == 'prior'].iterrows():
                user_id = order['user_id']
                order_id = order['order_id']
                
                if user_id not in self.user_baskets:
                    self.user_baskets[user_id] = []
                
                if order_id in prior_grouped:
                    self.user_baskets[user_id].append(prior_grouped[order_id])
        
        # Load train orders (future baskets)
        if os.path.exists(train_file):
            logger.info("Loading train order products (future baskets)...")
            train_df = pd.read_csv(train_file)
            
            # Group by order
            train_grouped = train_df.groupby('order_id')['product_id'].apply(list).to_dict()
            
            # Store as future baskets
            for _, order in orders_df[orders_df['eval_set'] == 'train'].iterrows():
                user_id = order['user_id']
                order_id = order['order_id']
                
                if order_id in train_grouped:
                    self.user_future_baskets[user_id] = train_grouped[order_id]
        
        # Update user list
        self.user_ids = list(self.user_baskets.keys())
        logger.info(f"Loaded baskets for {len(self.user_ids)} users")
        logger.info(f"Users with future baskets: {len(self.user_future_baskets)}")
    
    def preprocess_for_tifuknn(self, output_dir: str = "/app/data"):
        """
        Preprocess data for TIFU-KNN algorithm
        Creates JSON files and keyset
        """
        from services.data_preprocessor import DataPreprocessor
        
        logger.info("Preprocessing data for TIFU-KNN...")
        
        # Run preprocessing
        self.preprocessed_data_paths = DataPreprocessor.preprocess_for_tifuknn(
            self, output_dir
        )
        
        logger.info("Preprocessing complete. Files created:")
        for key, path in self.preprocessed_data_paths.items():
            logger.info(f"  {key}: {path}")
        
        return self.preprocessed_data_paths
    
    # Getter methods remain the same
    def get_user_baskets(self, user_id: int) -> List[List[int]]:
        """Get all baskets for a user"""
        return self.user_baskets.get(user_id, [])
    
    def get_user_future_basket(self, user_id: int) -> Optional[List[int]]:
        """Get future basket for evaluation"""
        return self.user_future_baskets.get(user_id)
    
    def get_product_info(self, product_id: int) -> Optional[Dict]:
        """Get product information"""
        return self.products.get(product_id)
    
    def get_order_info(self, user_id: int, order_idx: int) -> Optional[Dict]:
        """Get order temporal information"""
        return self.order_info.get((user_id, order_idx))
    
    def get_user_count(self) -> int:
        """Get total number of users"""
        return len(self.user_ids)
    
    def get_product_count(self) -> int:
        """Get total number of products"""
        return len(self.products)
    
    def get_total_orders(self) -> int:
        """Get total number of orders"""
        return sum(len(baskets) for baskets in self.user_baskets.values())
    
    def get_future_basket_count(self) -> int:
        """Get number of users with future baskets"""
        return len(self.user_future_baskets)