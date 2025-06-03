# ml-service/src/models/lightgbm_enhanced.py
import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import precision_score, recall_score, f1_score
import json
import pickle
import os
from typing import Dict, List, Tuple, Any, Optional
import logging

logger = logging.getLogger(__name__)

class EnhancedLightGBMModel:
    """
    Enhanced LightGBM model for next basket prediction
    Based on jsaikrishna's implementation with additional evaluation metrics
    """
    
    def __init__(self, params: Optional[Dict[str, Any]] = None):
        self.model = None
        self.feature_names = None
        self.params = params or self._get_default_params()
        self.metrics_history = []
        
    def _get_default_params(self) -> Dict[str, Any]:
        """Default LightGBM parameters optimized for basket prediction"""
        return {
            'objective': 'binary',
            'metric': ['binary_logloss', 'auc'],
            'boosting_type': 'gbdt',
            'num_leaves': 127,
            'learning_rate': 0.05,
            'feature_fraction': 0.9,
            'bagging_fraction': 0.8,
            'bagging_freq': 5,
            'verbose': -1,
            'num_threads': -1,
            'lambda_l1': 0.1,
            'lambda_l2': 0.1,
            'min_child_samples': 20,
            'min_split_gain': 0.001,
            'random_state': 42,
            'max_depth': 8
        }
    
    def prepare_training_data(self, features_df: pd.DataFrame, 
                            instacart_future: pd.DataFrame,
                            keyset: Dict[str, List[int]],
                            split: str = 'train') -> Tuple[pd.DataFrame, pd.Series]:
        """
        Prepare training data for specific split (train/valid/test)
        """
        # Get users for this split
        split_users = keyset[split]
        
        # Filter features for these users
        split_features = features_df[features_df['user_id'].isin(split_users)].copy()
        
        # Create labels
        future_dict = {}
        for _, row in instacart_future.iterrows():
            user_id = row['user_id']
            products = row['products']
            future_dict[user_id] = set(products)
        
        # Create binary labels
        labels = []
        for _, row in split_features.iterrows():
            user_id = row['user_id']
            product_id = row['product_id']
            label = 1 if product_id in future_dict.get(user_id, set()) else 0
            labels.append(label)
        
        split_features['label'] = labels
        
        # Separate features and labels
        feature_cols = [col for col in split_features.columns 
                       if col not in ['user_id', 'product_id', 'label']]
        
        X = split_features[feature_cols]
        y = split_features['label']
        
        logger.info(f"Prepared {split} data: {X.shape[0]} samples, {sum(y)} positive")
        
        return X, y, split_features[['user_id', 'product_id']]
    
    def train(self, features_df: pd.DataFrame, 
              instacart_future: pd.DataFrame,
              keyset: Dict[str, List[int]]) -> Dict[str, float]:
        """Train the LightGBM model"""
        logger.info("Starting model training...")
        
        # Prepare datasets
        X_train, y_train, _ = self.prepare_training_data(features_df, instacart_future, keyset, 'train')
        X_valid, y_valid, _ = self.prepare_training_data(features_df, instacart_future, keyset, 'valid')
        
        # Store feature names
        self.feature_names = list(X_train.columns)
        
        # Create LightGBM datasets
        train_data = lgb.Dataset(X_train, label=y_train)
        valid_data = lgb.Dataset(X_valid, label=y_valid, reference=train_data)
        
        # Callbacks
        callbacks = [
            lgb.early_stopping(stopping_rounds=50),
            lgb.log_evaluation(period=100)
        ]
        
        # Train model
        self.model = lgb.train(
            self.params,
            train_data,
            num_boost_round=1000,
            valid_sets=[train_data, valid_data],
            valid_names=['train', 'valid'],
            callbacks=callbacks
        )
        
        # Evaluate on validation set
        metrics = self.evaluate(features_df, instacart_future, keyset, 'valid')
        
        logger.info(f"Training completed. Best iteration: {self.model.best_iteration}")
        logger.info(f"Validation metrics: {metrics}")
        
        return metrics
    
    def predict_basket(self, features_df: pd.DataFrame, 
                      user_id: int, 
                      k: int = 20) -> List[Tuple[int, float]]:
        """Predict top-k products for a user"""
        if self.model is None:
            raise ValueError("Model not trained yet")
        
        # Get user features
        user_features = features_df[features_df['user_id'] == user_id].copy()
        
        if len(user_features) == 0:
            logger.warning(f"No features found for user {user_id}")
            return []
        
        # Get feature columns
        feature_cols = [col for col in user_features.columns 
                       if col not in ['user_id', 'product_id', 'label']]
        
        # Predict probabilities
        X = user_features[feature_cols]
        probas = self.model.predict(X, num_iteration=self.model.best_iteration)
        
        # Get top-k products
        user_features['score'] = probas
        top_products = user_features.nlargest(k, 'score')[['product_id', 'score']]
        
        return [(int(row['product_id']), row['score']) 
                for _, row in top_products.iterrows()]
    
    def evaluate(self, features_df: pd.DataFrame, 
                 instacart_future: pd.DataFrame,
                 keyset: Dict[str, List[int]],
                 split: str = 'test',
                 k_values: List[int] = [5, 10, 20]) -> Dict[str, float]:
        """
        Evaluate model performance with multiple metrics
        Following Reality Check evaluation methodology
        """
        logger.info(f"Evaluating on {split} set...")
        
        # Get split users
        split_users = keyset[split]
        split_future = instacart_future[instacart_future['user_id'].isin(split_users)]
        
        # Initialize metric collectors
        precision_at_k = {k: [] for k in k_values}
        recall_at_k = {k: [] for k in k_values}
        f1_at_k = {k: [] for k in k_values}
        ndcg_at_k = {k: [] for k in k_values}
        hit_rate_at_k = {k: 0 for k in k_values}
        
        # Evaluate each user
        for _, row in split_future.iterrows():
            user_id = row['user_id']
            true_products = set(row['products'])
            
            if len(true_products) == 0:
                continue
            
            # Get predictions
            predictions = self.predict_basket(features_df, user_id, max(k_values))
            
            for k in k_values:
                # Get top-k predictions
                top_k_preds = [prod_id for prod_id, _ in predictions[:k]]
                predicted_set = set(top_k_preds)
                
                # Calculate metrics
                if len(predicted_set) > 0:
                    # Precision@k
                    precision = len(predicted_set & true_products) / len(predicted_set)
                    precision_at_k[k].append(precision)
                    
                    # Recall@k
                    recall = len(predicted_set & true_products) / len(true_products)
                    recall_at_k[k].append(recall)
                    
                    # F1@k
                    if precision + recall > 0:
                        f1 = 2 * precision * recall / (precision + recall)
                    else:
                        f1 = 0
                    f1_at_k[k].append(f1)
                    
                    # Hit Rate
                    if len(predicted_set & true_products) > 0:
                        hit_rate_at_k[k] += 1
                    
                    # NDCG@k
                    ndcg = self._calculate_ndcg(top_k_preds, list(true_products), k)
                    ndcg_at_k[k].append(ndcg)
        
        # Calculate average metrics
        n_users = len(split_future)
        metrics = {}
        
        for k in k_values:
            metrics[f'precision@{k}'] = np.mean(precision_at_k[k]) if precision_at_k[k] else 0
            metrics[f'recall@{k}'] = np.mean(recall_at_k[k]) if recall_at_k[k] else 0
            metrics[f'f1@{k}'] = np.mean(f1_at_k[k]) if f1_at_k[k] else 0
            metrics[f'ndcg@{k}'] = np.mean(ndcg_at_k[k]) if ndcg_at_k[k] else 0
            metrics[f'hit_rate@{k}'] = hit_rate_at_k[k] / n_users if n_users > 0 else 0
        
        # Store in history
        self.metrics_history.append({
            'split': split,
            'metrics': metrics,
            'timestamp': pd.Timestamp.now().isoformat()
        })
        
        return metrics
    
    def _calculate_ndcg(self, predicted: List[int], actual: List[int], k: int) -> float:
        """Calculate NDCG@k"""
        dcg = 0.0
        for i, prod in enumerate(predicted[:k]):
            if prod in actual:
                dcg += 1.0 / np.log2(i + 2)
        
        # Ideal DCG
        idcg = sum(1.0 / np.log2(i + 2) for i in range(min(len(actual), k)))
        
        return dcg / idcg if idcg > 0 else 0.0
    
    def generate_submission(self, features_df: pd.DataFrame,
                          instacart_future: pd.DataFrame,
                          keyset: Dict[str, List[int]],
                          output_path: str,
                          k: int = 20):
        """Generate submission file for evaluation"""
        test_users = keyset['test']
        test_future = instacart_future[instacart_future['user_id'].isin(test_users)]
        
        submissions = []
        
        for _, row in test_future.iterrows():
            user_id = row['user_id']
            predictions = self.predict_basket(features_df, user_id, k)
            
            submission = {
                'user_id': user_id,
                'predicted_products': [prod_id for prod_id, _ in predictions],
                'scores': [score for _, score in predictions],
                'actual_products': row['products']
            }
            submissions.append(submission)
        
        # Save submission
        with open(output_path, 'w') as f:
            json.dump(submissions, f, indent=2)
        
        logger.info(f"Generated submission for {len(submissions)} users")
        
        return submissions
    
    def save_model(self, filepath: str):
        """Save model and metadata"""
        if self.model is None:
            raise ValueError("No model to save")
        
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        model_data = {
            'model': self.model,
            'feature_names': self.feature_names,
            'params': self.params,
            'metrics_history': self.metrics_history
        }
        
        with open(filepath, 'wb') as f:
            pickle.dump(model_data, f)
        
        logger.info(f"Model saved to {filepath}")
    
    def load_model(self, filepath: str):
        """Load model and metadata"""
        with open(filepath, 'rb') as f:
            model_data = pickle.load(f)
        
        self.model = model_data['model']
        self.feature_names = model_data['feature_names']
        self.params = model_data['params']
        self.metrics_history = model_data.get('metrics_history', [])
        
        logger.info(f"Model loaded from {filepath}")
    
    def get_feature_importance(self) -> pd.DataFrame:
        """Get feature importance"""
        if self.model is None:
            raise ValueError("Model not trained yet")
        
        importance = self.model.feature_importance(importance_type='gain')
        
        df = pd.DataFrame({
            'feature': self.feature_names,
            'importance': importance,
            'category': self._categorize_features(self.feature_names)
        }).sort_values('importance', ascending=False)
        
        return df
    
    def _categorize_features(self, features: List[str]) -> List[str]:
        """Categorize features for better visualization"""
        categories = []
        for feature in features:
            if 'user_' in feature:
                categories.append('User')
            elif 'product_' in feature:
                categories.append('Product')
            elif 'user_product_' in feature or 'up_' in feature:
                categories.append('User-Product')
            elif 'aisle' in feature or 'department' in feature:
                categories.append('Category')
            else:
                categories.append('Other')
        return categories
