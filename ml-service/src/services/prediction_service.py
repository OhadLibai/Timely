# ml-service/src/services/prediction_service.py

import pandas as pd
from typing import List, Dict
from ..models.stacked_basket_model import StackedBasketModel
from ..services.feature_engineering import FeatureEngineer
from ..utils.logger import setup_logger

logger = setup_logger(__name__)

class PredictionService:
    """
    Encapsulates the full logic for making a prediction for a single user,
    including on-the-fly feature engineering.
    """
    
    def __init__(self, model: StackedBasketModel, feature_engineer: FeatureEngineer):
        """
        Initializes the service with the trained model and the feature engineer.
        """
        if not model or not feature_engineer:
            raise ValueError("PredictionService requires a valid model and feature_engineer.")
        self.model = model
        self.feature_engineer = feature_engineer
        logger.info("PredictionService initialized successfully.")

    def predict_next_basket(self, user_id: str, order_history: List[Dict]) -> List[int]:
        """
        The main public method to generate a prediction. It orchestrates
        the feature generation and model prediction steps.

        Args:
            user_id: The ID of the user.
            order_history: A list of the user's past orders from the database.

        Returns:
            A list of predicted product IDs.
        """
        logger.info(f"Starting prediction for user_id: {user_id}")
        
        # 1. On-the-fly Feature Engineering 
        # This is the crucial step that was unclear before.
        try:
            # The feature_engineer takes raw history and returns the feature DataFrame
            # The logic here MUST match the logic used for training.
            user_features_df = self.feature_engineer.generate_features_for_user(user_id, order_history)
            
            if user_features_df.empty:
                logger.warning(f"No features could be generated for user {user_id}. Returning empty prediction.")
                return []
        except Exception as e:
            logger.error(f"Error during feature generation for user {user_id}: {e}", exc_info=True)
            # Depending on the desired behavior, you could return an empty list or raise an exception
            return []

        # 2. Model Prediction
        # The model takes the newly generated features to predict.
        try:
            predicted_product_ids = self.model.predict(user_features_df, user_id)
            logger.info(f"Successfully generated {len(predicted_product_ids)} predictions for user {user_id}.")
            return predicted_product_ids
        except Exception as e:
            logger.error(f"Error during model prediction for user {user_id}: {e}", exc_info=True)
            return []