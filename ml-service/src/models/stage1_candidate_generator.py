# ml-service/src/models/stage1_candidate_generator.py
"""
Stage 1 (CandidateGenerator):
A LightGBM model that predicts reorder probabilities
and uses them to generate three candidate baskets based on different
probability thresholds.
It also creates "meta-features" that describe these baskets.
"""

import pandas as pd
import lightgbm as lgb
import joblib
import os
import json
from typing import Dict, Any, List, Tuple

class CandidateGenerator:
    """
    Stage 1 Model: Uses LightGBM to generate candidate baskets and meta-features.
    """
    def __init__(self):
        self.params = {
            'objective': 'binary', 'metric': ['binary_logloss', 'auc'], 'boosting_type': 'gbdt',
            'n_estimators': 1000, 'learning_rate': 0.05, 'num_leaves': 512,
            'max_bin': 100, 'feature_fraction': 0.8, 'bagging_fraction': 0.95,
            'bagging_freq': 5, 'min_child_samples': 200, 'verbose': -1, 'num_threads': -1,
            'random_state': 42,
        }
        self.model = lgb.LGBMClassifier(**self.params)
        self.candidate_thresholds = [0.16, 0.20, 0.26]

    def train(self, X_train: pd.DataFrame, y_train: pd.Series, X_val: pd.DataFrame, y_val: pd.Series):
        print("--- Training Stage 1: Candidate Generator (LightGBM) ---")
        self.model.fit(X_train, y_train,
                       eval_set=[(X_val, y_val)],
                       eval_metric='logloss',
                       callbacks=[lgb.early_stopping(100, verbose=True)])
        print("--- Stage 1 Training Complete ---")

    def generate_candidates_and_meta_features(self, features: pd.DataFrame) -> Tuple[pd.DataFrame, List[pd.DataFrame]]:
        """
        Takes features for an order, predicts probabilities, and generates candidate baskets
        and their corresponding meta-features.
        """
        if features.empty:
            return pd.DataFrame(), []

        # Predict reorder probability
        probabilities = self.model.predict_proba(features.drop(columns=['user_id', 'product_id']))[:, 1]
        
        prob_df = features[['product_id']].copy()
        prob_df['probability'] = probabilities

        meta_features_list = []
        candidate_baskets = []

        for i, threshold in enumerate(self.candidate_thresholds):
            # Create candidate basket
            basket_df = prob_df[prob_df['probability'] > threshold]
            candidate_baskets.append(basket_df)
            
            # Calculate meta-features for this basket
            meta_features = {}
            if not basket_df.empty:
                meta_features[f'thres_avg{i}'] = basket_df['probability'].mean()
                meta_features[f'thres_max{i}'] = basket_df['probability'].max()
                meta_features[f'thres_min{i}'] = basket_df['probability'].min()
            else:
                meta_features[f'thres_avg{i}'] = 0
                meta_features[f'thres_max{i}'] = 0
                meta_features[f'thres_min{i}'] = 0
            
            meta_features_list.append(meta_features)

        # Combine meta-features into a single DataFrame row
        final_meta_features = {k: v for d in meta_features_list for k, v in d.items()}
        meta_features_df = pd.DataFrame([final_meta_features])
        
        return meta_features_df, candidate_baskets

    def save(self, path=".", filename="stage1_lgbm.pkl"):
        joblib.dump(self.model, os.path.join(path, filename))

    def load(self, path):
        self.model = joblib.load(path)