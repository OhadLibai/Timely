# ml-service/services/prediction.py
"""
UPDATED: Complete TIFU-KNN integration for next basket prediction
This replaces the partial implementation with the full algorithm
"""

import numpy as np
from typing import List, Dict, Set, Tuple, Optional
from collections import defaultdict, Counter
from loguru import logger
import time

# Import the complete TIFU-KNN implementation
from .tifuknn_algorithm import TIFUKNN, TIFUKNNWrapper

class PredictionService:
    """
    TIFU-KNN (Temporal-Item-Frequency-based User-KNN) implementation
    for next basket recommendation - COMPLETE VERSION
    """
    
    def __init__(self, data_loader):
        self.data_loader = data_loader
        
        # Initialize the complete TIFU-KNN implementation
        logger.info("Initializing TIFU-KNN algorithm...")
        self.tifuknn_wrapper = TIFUKNNWrapper(data_loader)
        
        # Store hyperparameters for reference
        self.num_neighbors = 900
        self.alpha = 0.9
        self.beta = 0.7
        self.gamma = 0.9
        self.group_size = 3
        
        logger.info("TIFU-KNN initialization complete")
        
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
            logger.info(f"Generating prediction for user {user_id} (k={k}, exclude_last={exclude_last_order})")
            
            # Use the complete TIFU-KNN implementation
            predicted_items = self.tifuknn_wrapper.predict_next_basket(
                user_id=user_id,
                k=k,
                exclude_last_order=exclude_last_order
            )
            
            logger.info(f"Generated {len(predicted_items)} predictions for user {user_id}")
            return predicted_items
            
        except ValueError as e:
            logger.error(f"User {user_id} not found: {e}")
            raise
        except Exception as e:
            logger.error(f"Prediction failed for user {user_id}: {e}")
            raise
            
    def get_algorithm_info(self) -> Dict[str, any]:
        """
        Get information about the algorithm configuration
        """
        return {
            'algorithm': 'TIFU-KNN',
            'version': '1.0',
            'hyperparameters': {
                'num_neighbors': self.num_neighbors,
                'within_decay_rate': self.alpha,
                'group_decay_rate': self.beta,
                'sequential_decay_rate': self.gamma,
                'frequency_groups': self.group_size
            },
            'reference': 'https://github.com/liming-7/A-Next-Basket-Recommendation-Reality-Check'
        }