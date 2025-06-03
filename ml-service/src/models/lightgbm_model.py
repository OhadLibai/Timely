# ml-service/src/models/lightgbm_model.py
import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import precision_score, recall_score, ndcg_score
import pickle
import os
from datetime import datetime
from typing import Dict, List, Tuple, Any
import logging

logger = logging.getLogger(__name__)

class LightGBMModel:
    """LightGBM model for next basket prediction"""
    
    def __init__(self):
        self.model = None
        self.feature_names = None
        self.product_encoder = None
        self.user_encoder = None
        self.metrics = {}
        self.last_training_time = None
        
    def train(self, 
              X_train: pd.DataFrame, 
              y_train: pd.Series,
              X_val: pd.DataFrame = None,
              y_val: pd.Series = None,
              params: Dict[str, Any] = None) -> Dict[str, float]:
        """Train the LightGBM model"""
        
        logger.info("Starting model training...")
        
        # Default parameters optimized for basket prediction
        default_params = {
            'objective': 'binary',
            'metric': ['binary_logloss', 'auc'],
            'boosting_type': 'gbdt',
            'num_leaves': 128,
            'learning_rate': 0.05,
            'feature_fraction': 0.8,
            'bagging_fraction': 0.8,
            'bagging_freq': 5,
            'verbose': -1,
            'num_threads': -1,
            'lambda_l1': 0.1,
            'lambda_l2': 0.1,
            'min_child_samples': 20,
            'random_state': 42
        }
        
        if params:
            default_params.update(params)
            
        # Store feature names
        self.feature_names = list(X_train.columns)
        
        # Create LightGBM datasets
        train_data = lgb.Dataset(X_train, label=y_train)
        
        callbacks = [
            lgb.early_stopping(stopping_rounds=50),
            lgb.log_evaluation(period=100)
        ]
        
        if X_val is not None and y_val is not None:
            val_data = lgb.Dataset(X_val, label=y_val, reference=train_data)
            
            # Train model with validation
            self.model = lgb.train(
                default_params,
                train_data,
                num_boost_round=1000,
                valid_sets=[train_data, val_data],
                valid_names=['train', 'val'],
                callbacks=callbacks
            )
            
            # Calculate validation metrics
            y_pred = self.predict_proba(X_val)
            self.metrics = self._calculate_metrics(y_val, y_pred)
            
        else:
            # Train without validation
            self.model = lgb.train(
                default_params,
                train_data,
                num_boost_round=1000,
                valid_sets=[train_data],
                valid_names=['train'],
                callbacks=callbacks
            )
            
        self.last_training_time = datetime.utcnow()
        logger.info(f"Model training completed. Best iteration: {self.model.best_iteration}")
        
        return self.metrics
    
    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        """Predict probabilities"""
        if self.model is None:
            raise ValueError("Model not trained yet")
            
        # Ensure feature order matches training
        X = X[self.feature_names]
        
        return self.model.predict(X, num_iteration=self.model.best_iteration)
    
    def predict(self, X: pd.DataFrame, threshold: float = 0.5) -> np.ndarray:
        """Predict binary outcomes"""
        proba = self.predict_proba(X)
        return (proba >= threshold).astype(int)
    
    def predict_top_k(self, 
                      user_features: pd.DataFrame, 
                      product_ids: List[str], 
                      k: int = 20) -> List[Tuple[str, float]]:
        """Predict top K products for a user"""
        
        if self.model is None:
            raise ValueError("Model not trained yet")
            
        # Get predictions for all products
        probas = self.predict_proba(user_features)
        
        # Get top K indices
        top_k_indices = np.argsort(probas)[-k:][::-1]
        
        # Return product IDs with scores
        results = []
        for idx in top_k_indices:
            if idx < len(product_ids):
                results.append((product_ids[idx], float(probas[idx])))
                
        return results
    
    def _calculate_metrics(self, y_true: pd.Series, y_pred: np.ndarray) -> Dict[str, float]:
        """Calculate evaluation metrics"""
        
        # Binary predictions for precision/recall
        y_pred_binary = (y_pred >= 0.5).astype(int)
        
        metrics = {
            'precision': precision_score(y_true, y_pred_binary, zero_division=0),
            'recall': recall_score(y_true, y_pred_binary, zero_division=0),
            'f1': 2 * (precision_score(y_true, y_pred_binary, zero_division=0) * 
                       recall_score(y_true, y_pred_binary, zero_division=0)) / 
                      (precision_score(y_true, y_pred_binary, zero_division=0) + 
                       recall_score(y_true, y_pred_binary, zero_division=0) + 1e-10)
        }
        
        # Calculate ranking metrics if applicable
        if len(np.unique(y_true)) > 1:
            try:
                metrics['ndcg'] = ndcg_score([y_true], [y_pred])
            except:
                metrics['ndcg'] = 0.0
                
        return metrics
    
    def calculate_feature_importance(self) -> pd.DataFrame:
        """Get feature importance"""
        if self.model is None:
            raise ValueError("Model not trained yet")
            
        importance = self.model.feature_importance(importance_type='gain')
        
        df = pd.DataFrame({
            'feature': self.feature_names,
            'importance': importance
        }).sort_values('importance', ascending=False)
        
        return df
    
    def save_model(self, filepath: str):
        """Save model to disk"""
        if self.model is None:
            raise ValueError("No model to save")
            
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        model_data = {
            'model': self.model,
            'feature_names': self.feature_names,
            'product_encoder': self.product_encoder,
            'user_encoder': self.user_encoder,
            'metrics': self.metrics,
            'last_training_time': self.last_training_time
        }
        
        with open(filepath, 'wb') as f:
            pickle.dump(model_data, f)
            
        logger.info(f"Model saved to {filepath}")
    
    def load_model(self, filepath: str):
        """Load model from disk"""
        with open(filepath, 'rb') as f:
            model_data = pickle.load(f)
            
        self.model = model_data['model']
        self.feature_names = model_data['feature_names']
        self.product_encoder = model_data.get('product_encoder')
        self.user_encoder = model_data.get('user_encoder')
        self.metrics = model_data.get('metrics', {})
        self.last_training_time = model_data.get('last_training_time')
        
        logger.info(f"Model loaded from {filepath}")
    
    def get_params(self) -> Dict[str, Any]:
        """Get model parameters"""
        if self.model is None:
            return {}
            
        return self.model.params