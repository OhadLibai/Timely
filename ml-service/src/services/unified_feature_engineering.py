# ml-service/src/services/unified_feature_engineering.py
# UNIFIED FEATURE ENGINEERING MODULE - Single source of truth for all feature generation
# This module replaces the duplicate logic in data_preprocessing.py and enhanced_feature_engineering.py

import pandas as pd
import numpy as np
import os
from typing import List, Dict, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from ..database.models import User, Order, OrderItem, Product, Category
from ..database.connection import get_db_session
from ..utils.logger import setup_logger

logger = setup_logger(__name__)

class UnifiedFeatureEngineer:
    """
    UNIFIED FEATURE ENGINEERING: Single source of truth for all feature generation.
    
    This class eliminates the training-serving skew risk by providing a single,
    consistent implementation of feature engineering logic that can be used by:
    1. Training scripts (offline)
    2. Prediction services (online)
    3. Evaluation scripts
    
    All feature engineering logic is centralized here to ensure consistency.
    """
    
    def __init__(self, processed_data_path: Optional[str] = None):
        """
        Initialize the unified feature engineer.
        
        Args:
            processed_data_path: Path to processed CSV files for global features (optional)
        """
        self.processed_data_path = processed_data_path
        self.prod_features_df = pd.DataFrame()
        
        if processed_data_path:
            self._load_static_global_data()
        
        logger.info("UnifiedFeatureEngineer initialized - eliminating training-serving skew")
    
    def _load_static_global_data(self):
        """Load static global features (product popularity, etc.) from CSV files."""
        try:
            # Load pre-computed product features (popularity, reorder rates, etc.)
            prod_features_path = os.path.join(self.processed_data_path, "prod_features.csv")
            if os.path.exists(prod_features_path):
                self.prod_features_df = pd.read_csv(prod_features_path).set_index('product_id')
                logger.info("Static global feature data loaded successfully")
            else:
                logger.warning(f"Product features file not found: {prod_features_path}")
                
        except Exception as e:
            logger.warning(f"Could not load static feature files: {e}")
            self.prod_features_df = pd.DataFrame()
    
    def extract_features(self, user_id: str, order_history: List[Dict]) -> pd.DataFrame:
        """
        CORE FEATURE EXTRACTION METHOD - Used by both training and inference.
        
        This method implements the EXACT feature engineering logic that must be
        consistent between training and serving to prevent model degradation.
        
        Args:
            user_id: User identifier
            order_history: List of user's historical orders
            
        Returns:
            DataFrame with engineered features for ML model
        """
        if not order_history:
            return pd.DataFrame()

        # Convert order history to DataFrame
        history_df = pd.DataFrame(order_history)
        
        # Expand products for user-product analysis
        user_product_history = history_df.explode('products').rename(columns={'products': 'product_id'})

        if user_product_history.empty:
            return pd.DataFrame()
        
        # ========================================================================
        # USER-LEVEL FEATURES (consistent with training)
        # ========================================================================
        user_total_orders = history_df['order_id'].nunique()
        user_avg_days_between_orders = history_df['days_since_prior_order'].mean()
        user_std_days_between_orders = history_df['days_since_prior_order'].std()
        user_favorite_dow = history_df['order_dow'].mode()[0] if not history_df['order_dow'].empty else 0
        user_favorite_hour = history_df['order_hour_of_day'].mode()[0] if not history_df['order_hour_of_day'].empty else 12

        # ========================================================================
        # USER-PRODUCT FEATURES (consistent with training)
        # ========================================================================
        up_features = user_product_history.groupby('product_id').agg(
            user_product_orders=('order_id', 'nunique'),
            user_product_first_order=('order_number', 'min'),
            user_product_last_order=('order_number', 'max')
        ).reset_index()

        # Create base features DataFrame
        features_df = pd.DataFrame({'product_id': up_features['product_id']})
        features_df = features_df.merge(up_features, on='product_id', how='left')

        # Add user features to each row
        features_df['user_total_orders'] = user_total_orders
        features_df['user_avg_days_between_orders'] = user_avg_days_between_orders
        features_df['user_std_days_between_orders'] = user_std_days_between_orders
        features_df['user_favorite_dow'] = user_favorite_dow
        features_df['user_favorite_hour'] = user_favorite_hour

        # ========================================================================
        # DERIVED FEATURES (consistent with training)
        # ========================================================================
        features_df['user_product_order_rate'] = features_df['user_product_orders'] / features_df['user_total_orders']
        features_df['user_product_orders_since_last'] = features_df['user_total_orders'] - features_df['user_product_last_order']

        # ========================================================================
        # GLOBAL PRODUCT FEATURES (consistent with training)
        # ========================================================================
        # Initialize with defaults
        features_df['product_total_orders'] = 0
        features_df['product_reorder_rate'] = 0
        
        # Merge global product features if available
        if not self.prod_features_df.empty:
            for idx, row in features_df.iterrows():
                product_id = int(row['product_id'])
                if product_id in self.prod_features_df.index:
                    prod_data = self.prod_features_df.loc[product_id]
                    features_df.loc[idx, 'product_total_orders'] = prod_data.get('product_total_orders', 0)
                    features_df.loc[idx, 'product_reorder_rate'] = prod_data.get('product_reorder_rate', 0)

        # ========================================================================
        # FINAL FEATURE SELECTION (consistent with training)
        # ========================================================================
        final_columns = [
            'user_total_orders', 'user_avg_days_between_orders', 'user_std_days_between_orders',
            'user_favorite_dow', 'user_favorite_hour', 'user_product_orders', 
            'user_product_first_order', 'user_product_last_order', 'user_product_order_rate',
            'user_product_orders_since_last', 'product_total_orders', 'product_reorder_rate'
        ]
        
        final_df = features_df.reindex(columns=final_columns).fillna(0)
        
        logger.info(f"Generated feature matrix shape {final_df.shape} for user {user_id}")
        return final_df
    
    def generate_features_from_database(self, user_id: str) -> pd.DataFrame:
        """
        Generate features by fetching user data directly from database.
        Used by prediction services for online inference.
        
        Args:
            user_id: Database user ID
            
        Returns:
            DataFrame with engineered features
        """
        try:
            with get_db_session() as session:
                # Fetch user's order history from database
                orders = session.query(Order).filter(
                    Order.userId == user_id
                ).order_by(Order.createdAt).all()
                
                if not orders:
                    logger.warning(f"No order history found for user {user_id}")
                    return pd.DataFrame()
                
                # Convert database orders to the same format as CSV data
                order_history = []
                for order in orders:
                    order_items = session.query(OrderItem).filter(
                        OrderItem.orderId == order.id
                    ).all()
                    
                    products = [item.productId for item in order_items]
                    
                    order_data = {
                        'order_id': order.id,
                        'order_number': len(order_history) + 1,  # Sequential numbering
                        'order_dow': order.createdAt.weekday(),
                        'order_hour_of_day': order.createdAt.hour,
                        'days_since_prior_order': 7,  # Default assumption for demo
                        'products': products
                    }
                    order_history.append(order_data)
                
                # Use the unified feature extraction method
                return self.extract_features(user_id, order_history)
                
        except Exception as e:
            logger.error(f"Error generating features from database for user {user_id}: {e}")
            return pd.DataFrame()
    
    def generate_features_from_csv_data(self, user_id: str, orders_df: pd.DataFrame, 
                                      order_products_df: pd.DataFrame) -> pd.DataFrame:
        """
        Generate features from CSV data (used by training scripts).
        
        Args:
            user_id: User ID from CSV data
            orders_df: Orders DataFrame from CSV
            order_products_df: Order products DataFrame from CSV
            
        Returns:
            DataFrame with engineered features
        """
        try:
            # Filter user's orders
            user_orders = orders_df[orders_df['user_id'] == int(user_id)].sort_values('order_number')
            
            if user_orders.empty:
                logger.warning(f"No order history found for user {user_id} in CSV data")
                return pd.DataFrame()
            
            # Build order history in the same format
            order_history = []
            for _, order in user_orders.iterrows():
                # Get products for this order
                order_products = order_products_df[order_products_df['order_id'] == order['order_id']]
                products = order_products['product_id'].tolist()
                
                order_data = {
                    'order_id': order['order_id'],
                    'order_number': order['order_number'],
                    'order_dow': order['order_dow'],
                    'order_hour_of_day': order['order_hour_of_day'],
                    'days_since_prior_order': order['days_since_prior_order'] if pd.notna(order['days_since_prior_order']) else 7,
                    'products': products
                }
                order_history.append(order_data)
            
            # Use the unified feature extraction method
            return self.extract_features(user_id, order_history)
            
        except Exception as e:
            logger.error(f"Error generating features from CSV for user {user_id}: {e}")
            return pd.DataFrame()


# ============================================================================
# COMPATIBILITY CLASSES FOR EXISTING CODE
# ============================================================================

class DatabaseFeatureEngineer(UnifiedFeatureEngineer):
    """
    Compatibility wrapper for enhanced_feature_engineering.py
    Now uses the unified feature engineering logic.
    """
    
    def generate_features_for_user(self, user_id: str) -> pd.DataFrame:
        """Generate features by fetching user data directly from database."""
        return self.generate_features_from_database(user_id)


class InstacartDataPreprocessor(UnifiedFeatureEngineer):
    """
    Compatibility wrapper for data_preprocessing.py
    Now uses the unified feature engineering logic.
    """
    
    def __init__(self, data_path: str):
        super().__init__(processed_data_path=data_path)
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
    
    def extract_features_for_user(self, user_id: str) -> pd.DataFrame:
        """Extract features for a specific user using unified logic."""
        if self.orders_df is None:
            raise ValueError("Raw data not loaded. Call load_raw_data() first.")
        
        return self.generate_features_from_csv_data(
            user_id, self.orders_df, self.order_products_prior_df
        )


# Export the main classes
__all__ = [
    'UnifiedFeatureEngineer',
    'DatabaseFeatureEngineer', 
    'InstacartDataPreprocessor'
]