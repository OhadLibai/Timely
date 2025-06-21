# ml-service/src/services/prediction_service.py
# UPDATED: Fixed constructor, database integration, and black box feature engineering

import pandas as pd
from typing import List, Dict, Optional
from ..models.stacked_basket_model import StackedBasketModel
from ..services.enhanced_feature_engineering import DatabaseFeatureEngineer, FeatureEngineer
from ..utils.logger import setup_logger

logger = setup_logger(__name__)

class PredictionService:
    """
    Updated prediction service with direct database access and black box feature engineering.
    Maintains same interface but now fetches data directly from database.
    """
    
    def __init__(self, model: StackedBasketModel, processed_data_path: str, use_database: bool = True):
        """
        Initialize prediction service with internal black box feature engineering.
        
        Args:
            model: Trained StackedBasketModel
            processed_data_path: Path to processed data for static features
            use_database: Whether to use database access (True) or legacy mode (False)
        """
        if not model:
            raise ValueError("PredictionService requires a valid trained model")
        
        self.model = model
        self.processed_data_path = processed_data_path
        self.use_database = use_database
        
        # Initialize feature engineering as BLACK BOX
        if use_database:
            # Use enhanced database feature engineer
            self.feature_engineer = DatabaseFeatureEngineer(processed_data_path)
            logger.info("PredictionService initialized with DATABASE feature engineering (black box)")
        else:
            # Use legacy feature engineer for backward compatibility
            self.feature_engineer = FeatureEngineer(processed_data_path)
            logger.info("PredictionService initialized with LEGACY feature engineering (black box)")
    
    def predict_next_basket(self, user_id: str, order_history: Optional[List[Dict]] = None) -> List[int]:
        """
        Main prediction method - UPDATED to support both database and legacy modes.
        
        Args:
            user_id: User identifier
            order_history: Optional order history (only used in legacy mode)
            
        Returns:
            List of predicted product IDs
        """
        logger.info(f"Starting prediction for user_id: {user_id}")
        
        try:
            if self.use_database:
                # NEW: Database mode - fetch data directly
                features_df = self.feature_engineer.generate_features_for_user(user_id)
            else:
                # LEGACY: Use provided order history
                if not order_history:
                    logger.warning(f"Legacy mode requires order_history for user {user_id}")
                    return []
                features_df = self.feature_engineer.generate_features_for_user(user_id, order_history)
            
            if features_df.empty:
                logger.warning(f"No features generated for user {user_id}")
                return []
            
            # Use StackedBasketModel for prediction (same as before)
            predicted_product_ids = self.model.predict(features_df, user_id)
            
            logger.info(f"Generated {len(predicted_product_ids)} predictions for user {user_id}")
            return predicted_product_ids
            
        except Exception as e:
            logger.error(f"Prediction failed for user {user_id}: {e}", exc_info=True)
            return []
    
    def predict_for_user(self, user_id: str) -> List[int]:
        """
        Simplified prediction method for database mode.
        Alias for predict_next_basket with database mode.
        """
        if not self.use_database:
            logger.error("predict_for_user requires database mode")
            return []
        
        return self.predict_next_basket(user_id)
    
    def get_service_info(self) -> Dict[str, any]:
        """Get information about the prediction service configuration."""
        return {
            "mode": "database" if self.use_database else "legacy",
            "feature_engineering": "black_box",
            "model_type": "StackedBasketModel",
            "stages": ["LightGBM_CandidateGenerator", "GradientBoostingClassifier_BasketSelector"]
        }


class EnhancedPredictionService(PredictionService):
    """
    Enhanced prediction service with additional capabilities.
    Extends base PredictionService with monitoring and advanced features.
    """
    
    def __init__(self, model: StackedBasketModel, processed_data_path: str):
        """Initialize enhanced service with database mode by default."""
        super().__init__(model, processed_data_path, use_database=True)
        self.prediction_count = 0
        self.successful_predictions = 0
        logger.info("EnhancedPredictionService initialized with advanced monitoring")
    
    def predict_next_basket(self, user_id: str, order_history: Optional[List[Dict]] = None) -> List[int]:
        """Enhanced prediction with monitoring."""
        self.prediction_count += 1
        
        try:
            result = super().predict_next_basket(user_id, order_history)
            if result:
                self.successful_predictions += 1
            return result
        except Exception as e:
            logger.error(f"Enhanced prediction failed for user {user_id}: {e}")
            return []
    
    def get_service_stats(self) -> Dict[str, any]:
        """Get service statistics."""
        success_rate = (self.successful_predictions / self.prediction_count) if self.prediction_count > 0 else 0
        
        return {
            **self.get_service_info(),
            "total_predictions": self.prediction_count,
            "successful_predictions": self.successful_predictions,
            "success_rate": success_rate,
            "database_enabled": self.use_database
        }