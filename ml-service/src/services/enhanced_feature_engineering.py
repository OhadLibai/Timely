# ml-service/src/services/enhanced_feature_engineering.py
# Enhanced FeatureEngineer with direct database access

import pandas as pd
import numpy as np
import os
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from ..database.models import User, Order, OrderItem, Product, Category
from ..database.connection import get_db_session
from ..utils.logger import setup_logger

logger = setup_logger(__name__)

class DatabaseFeatureEngineer:
    """
    Enhanced FeatureEngineer that fetches data directly from database.
    BLACK BOX: Internal feature engineering logic hidden from external APIs.
    """
    
    def __init__(self, processed_data_path: str):
        """
        Initialize with processed data path for static global features.
        
        Args:
            processed_data_path: Path to processed CSV files for global features
        """
        self.processed_data_path = processed_data_path
        self._load_static_global_data()
        logger.info("DatabaseFeatureEngineer initialized with black box feature engineering")
    
    def _load_static_global_data(self):
        """Load static global features (product popularity, etc.) from CSV files."""
        try:
            # Load pre-computed product features (popularity, reorder rates, etc.)
            self.prod_features_df = pd.read_csv(
                os.path.join(self.processed_data_path, "prod_features.csv")
            ).set_index('product_id')
            
            # Load basic product information
            self.products_df = pd.read_csv(
                os.path.join(self.processed_data_path, "products.csv")
            )
            
            logger.info("Static global feature data loaded successfully")
            
        except FileNotFoundError as e:
            logger.warning(f"Static feature files not found: {e}")
            # Initialize empty DataFrames as fallback
            self.prod_features_df = pd.DataFrame()
            self.products_df = pd.DataFrame()
    
    def generate_features_for_user(self, user_id: str) -> pd.DataFrame:
        """
        Generate features by fetching user data directly from database.
        This is the main interface - SAME as original but now fetches from database.
        
        Args:
            user_id: Application user ID (UUID string)
            
        Returns:
            Feature DataFrame exactly as expected by StackedBasketModel
        """
        logger.info(f"Generating features for user {user_id} via direct database access")
        
        try:
            with get_db_session() as db:
                # Fetch user order history from database
                order_history = self._fetch_user_order_history(db, user_id)
                
                if not order_history:
                    logger.warning(f"No order history found for user {user_id}")
                    return pd.DataFrame()
                
                # Generate features using the same logic as original FeatureEngineer
                return self._generate_features_from_history(user_id, order_history)
                
        except Exception as e:
            logger.error(f"Database feature generation failed for user {user_id}: {e}")
            return pd.DataFrame()
    
    def _fetch_user_order_history(self, db: Session, user_id: str) -> Optional[List[Dict]]:
        """
        Fetch complete order history for user from database.
        Returns the EXACT format expected by feature engineering logic.
        """
        try:
            # Query user orders with temporal fields (CRITICAL: these are now stored in database)
            orders = db.query(Order).filter(
                Order.user_id == user_id,
                Order.status.in_(['completed', 'delivered', 'pending'])  # Include relevant orders
            ).order_by(Order.created_at.asc()).all()
            
            if not orders:
                return None
            
            # Transform to required format with EXACT temporal fields from database
            order_history = []
            for i, order in enumerate(orders):
                # Get product IDs from order items
                order_items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
                product_ids = [str(item.product_id) for item in order_items]
                
                # Use stored temporal fields from database (NO CALCULATION - exact as training)
                order_dict = {
                    'order_id': str(order.id),
                    'order_number': i + 1,  # Sequential order number for user
                    'days_since_prior_order': float(order.days_since_prior_order),  # From database
                    'order_dow': order.order_dow,                                   # From database
                    'order_hour_of_day': order.order_hour_of_day,                   # From database
                    'products': product_ids
                }
                order_history.append(order_dict)
            
            logger.info(f"Fetched {len(order_history)} orders for user {user_id}")
            return order_history
            
        except Exception as e:
            logger.error(f"Database query failed for user {user_id}: {e}")
            raise
    
    def _generate_features_from_history(self, user_id: str, order_history: List[Dict]) -> pd.DataFrame:
        """
        Generate features using the EXACT same logic as original FeatureEngineer.
        This maintains compatibility with trained model.
        """
        if not order_history:
            return pd.DataFrame()

        # Create DataFrame from user's order history
        history_df = pd.DataFrame(order_history)
        user_product_history = history_df.explode('products').rename(columns={'products': 'product_id'})

        if user_product_history.empty:
            return pd.DataFrame()
            
        # Calculate user-level features (EXACT same logic as training)
        user_total_orders = history_df['order_id'].nunique()
        user_avg_days_between_orders = history_df['days_since_prior_order'].mean()
        user_std_days_between_orders = history_df['days_since_prior_order'].std()
        user_favorite_dow = history_df['order_dow'].mode()[0] if not history_df['order_dow'].empty else 0
        user_favorite_hour = history_df['order_hour_of_day'].mode()[0] if not history_df['order_hour_of_day'].empty else 12

        # Calculate user-product features (EXACT same logic as training)
        up_features = user_product_history.groupby('product_id').agg(
            user_product_orders=('order_id', 'nunique'),
            user_product_first_order=('order_number', 'min'),
            user_product_last_order=('order_number', 'max')
        ).reset_index()

        # Create base features DataFrame
        features_df = pd.DataFrame({'product_id': up_features['product_id']})
        features_df = features_df.merge(up_features, on='product_id', how='left')

        # Add user features
        features_df['user_total_orders'] = user_total_orders
        features_df['user_avg_days_between_orders'] = user_avg_days_between_orders
        features_df['user_std_days_between_orders'] = user_std_days_between_orders
        features_df['user_favorite_dow'] = user_favorite_dow
        features_df['user_favorite_hour'] = user_favorite_hour

        # Calculate derived features (EXACT same logic as training)
        features_df['user_product_order_rate'] = features_df['user_product_orders'] / features_df['user_total_orders']
        features_df['user_product_orders_since_last'] = features_df['user_total_orders'] - features_df['user_product_last_order']

        # Merge global product features from static data
        if not self.prod_features_df.empty:
            for product_id in features_df['product_id']:
                if int(product_id) in self.prod_features_df.index:
                    prod_data = self.prod_features_df.loc[int(product_id)]
                    mask = features_df['product_id'] == product_id
                    features_df.loc[mask, 'product_total_orders'] = prod_data.get('product_total_orders', 0)
                    features_df.loc[mask, 'product_reorder_rate'] = prod_data.get('product_reorder_rate', 0)

        # Add missing columns with defaults
        if 'product_total_orders' not in features_df.columns:
            features_df['product_total_orders'] = 0
        if 'product_reorder_rate' not in features_df.columns:
            features_df['product_reorder_rate'] = 0

        # Final column selection and cleanup (EXACT same as training)
        final_columns = [
            'user_total_orders', 'user_avg_days_between_orders', 'user_std_days_between_orders',
            'user_favorite_dow', 'user_favorite_hour', 'user_product_orders', 
            'user_product_first_order', 'user_product_last_order', 'user_product_order_rate',
            'user_product_orders_since_last', 'product_total_orders', 'product_reorder_rate'
        ]
        
        final_df = features_df.reindex(columns=final_columns).fillna(0)
        
        logger.info(f"Generated feature matrix shape {final_df.shape} for user {user_id}")
        return final_df


# Legacy FeatureEngineer - UPDATED to be internal black box only
class FeatureEngineer:
    """
    Legacy FeatureEngineer updated to work as internal black box.
    Maintains compatibility with existing code during transition.
    """
    
    def __init__(self, processed_data_path: str):
        """Initialize with processed data for backward compatibility."""
        self.path = processed_data_path
        self.products_df = None
        self.user_features_df = None
        self.prod_features_df = None
        self._load_precomputed_features()

    def _load_precomputed_features(self):
        """Load precomputed features for legacy compatibility."""
        try:
            # Load static product features
            self.prod_features_df = pd.read_csv(
                os.path.join(self.path, "prod_features.csv")
            ).set_index('product_id')
            
            # Load user features if available
            try:
                self.user_features_df = pd.read_csv(
                    os.path.join(self.path, "user_features.csv")
                ).set_index('user_id')
            except FileNotFoundError:
                self.user_features_df = pd.DataFrame()

            # Load basic product info
            self.products_df = pd.read_csv(
                os.path.join(self.path, "products.csv")
            )

            logger.info("Legacy FeatureEngineer: Pre-computed feature data loaded successfully")
            
        except FileNotFoundError as e:
            logger.error(f"Legacy FeatureEngineer: Could not load feature data: {e}")
            # Initialize empty DataFrames as fallback
            self.prod_features_df = pd.DataFrame()
            self.user_features_df = pd.DataFrame()
            self.products_df = pd.DataFrame()

    def generate_features_for_user(self, user_id: str, order_history: List[Dict]) -> pd.DataFrame:
        """
        Legacy method: generate features from provided order history.
        Maintained for backward compatibility during transition.
        """
        if not order_history:
            return pd.DataFrame()

        # Use the same logic as DatabaseFeatureEngineer for consistency
        db_feature_engineer = DatabaseFeatureEngineer(self.path)
        return db_feature_engineer._generate_features_from_history(user_id, order_history)