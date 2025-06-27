# ml-service/services/prediction.py
"""
FIXED: Complete TIFU-KNN integration for next basket prediction
Now uses the full implementation instead of partial one
"""

import numpy as np
from typing import List, Dict, Set, Tuple, Optional
from collections import defaultdict, Counter
from loguru import logger
import time

# Import the complete TIFU-KNN implementation
from .tifuknn_complete import TIFUKNNComplete

class PredictionService:
    """
    TIFU-KNN (Temporal-Item-Frequency-based User-KNN) prediction service
    Uses the complete implementation matching the reference repository
    """
    
    def __init__(self, data_loader):
        self.data_loader = data_loader
        
        # Initialize the complete TIFU-KNN implementation
        logger.info("Initializing complete TIFU-KNN algorithm...")
        
        # The complete implementation that handles everything
        self.tifuknn = TIFUKNNComplete()
        
        # If data loader has data, set it up
        if data_loader and data_loader.get_user_count() > 0:
            self._setup_tifuknn_data()
        
        logger.info("TIFU-KNN prediction service ready")
        
    def _setup_tifuknn_data(self):
        """Setup TIFU-KNN with data from data loader"""
        logger.info("Setting up TIFU-KNN with loaded data...")
        
        # Build history and future dictionaries
        history = {}
        future = {}
        
        for user_id in self.data_loader.user_ids:
            baskets = self.data_loader.get_user_baskets(user_id)
            if baskets:
                history[str(user_id)] = baskets
                
            future_basket = self.data_loader.get_user_future_basket(user_id)
            if future_basket:
                future[str(user_id)] = future_basket
        
        # Set data directly on TIFU-KNN instance
        self.tifuknn.history = history
        self.tifuknn.future = future
        self.tifuknn.keyset = list(history.keys())
        
        # Build required data structures
        self.tifuknn._build_item_universe()
        self.tifuknn._build_user_profiles()
        
        logger.info(f"TIFU-KNN setup complete with {len(history)} users")
        
    def predict_next_basket(self, user_id: int, k: int = 20, exclude_last_order: bool = False) -> List[int]:
        """
        Generate next basket prediction using complete TIFU-KNN algorithm
        
        Args:
            user_id: The user to predict for
            k: Number of items to recommend (default 20)
            exclude_last_order: Whether to exclude last order (for evaluation)
            
        Returns:
            List of predicted product IDs
        """
        try:
            logger.info(f"Generating TIFU-KNN prediction for user {user_id} (k={k}, exclude_last={exclude_last_order})")
            
            # Convert to string for TIFU-KNN (it uses string IDs)
            user_id_str = str(user_id)
            
            # Check if user exists
            if user_id_str not in self.tifuknn.history:
                # Try loading from data loader
                baskets = self.data_loader.get_user_baskets(user_id)
                if not baskets:
                    logger.warning(f"User {user_id} not found")
                    return []
                    
                # Add user dynamically
                self.tifuknn.history[user_id_str] = baskets
                profile = self.tifuknn._create_user_profile(baskets)
                self.tifuknn.user_profiles[user_id_str] = profile
            
            # Use complete TIFU-KNN prediction
            predicted_items = self.tifuknn.predict_user(
                user_id=user_id_str,
                k=k,
                exclude_last=exclude_last_order
            )
            
            logger.info(f"Generated {len(predicted_items)} predictions for user {user_id}")
            return predicted_items
            
        except Exception as e:
            logger.error(f"Prediction failed for user {user_id}: {e}")
            raise
    
    def predict_from_baskets(self, user_baskets: List[List[int]], k: int = 20, 
                           temporal_metadata: Optional[Dict] = None) -> List[int]:
        """
        Generate prediction directly from basket data (for database integration)
        
        Args:
            user_baskets: List of baskets
            k: Number of items to recommend
            temporal_metadata: Optional temporal features
            
        Returns:
            List of predicted product IDs
        """
        try:
            logger.info(f"Generating prediction from {len(user_baskets)} baskets")
            
            # Use TIFU-KNN's direct basket prediction
            predicted_items = self.tifuknn.predict_from_baskets(
                user_baskets=user_baskets,
                k=k,
                temporal_metadata=temporal_metadata
            )
            
            logger.info(f"Generated {len(predicted_items)} predictions from baskets")
            return predicted_items
            
        except Exception as e:
            logger.error(f"Basket prediction failed: {e}")
            raise
    
    def evaluate_single_user(self, user_id: int) -> Dict[str, float]:
        """
        Evaluate prediction for a single user
        
        Returns:
            Dictionary with recall, precision, f1, hit_rate
        """
        user_id_str = str(user_id)
        return self.tifuknn.evaluate_single_user(user_id_str)
    
    def get_algorithm_info(self) -> Dict[str, any]:
        """
        Get information about the algorithm configuration
        """
        return {
            'algorithm': 'TIFU-KNN-Complete',
            'version': '1.0',
            'implementation': 'Full reference implementation',
            'hyperparameters': {
                'num_neighbors': 900,
                'within_decay_rate': 0.9,
                'group_decay_rate': 0.7,
                'sequential_decay_rate': 0.9,
                'frequency_groups': 3,
                'top_k': 20
            },
            'reference': 'https://github.com/liming-7/A-Next-Basket-Recommendation-Reality-Check',
            'paper': 'Temporal sets: Towards understanding the future through the past'
        }
    
    def get_user_statistics(self, user_id: int) -> Dict[str, any]:
        """
        Get statistics about a user's purchase history
        """
        baskets = self.data_loader.get_user_baskets(user_id)
        if not baskets:
            return {}
        
        # Calculate statistics
        total_orders = len(baskets)
        total_items = sum(len(basket) for basket in baskets)
        unique_items = len(set(item for basket in baskets for item in basket))
        avg_basket_size = total_items / total_orders if total_orders > 0 else 0
        
        # Item frequency
        item_freq = Counter()
        for basket in baskets:
            item_freq.update(basket)
        
        # Most frequent items
        top_items = item_freq.most_common(10)
        
        return {
            'user_id': user_id,
            'total_orders': total_orders,
            'total_items': total_items,
            'unique_items': unique_items,
            'avg_basket_size': round(avg_basket_size, 2),
            'top_items': [
                {
                    'product_id': item,
                    'frequency': freq,
                    'reorder_rate': round(freq / total_orders, 2)
                }
                for item, freq in top_items
            ]
        }