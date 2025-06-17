# ml-service/src/models/stacked_basket_model.py
"""
The entire process will be managed by a StackedBasketModel class,
which will be used for both offline training in Colab
and online predictions in the application.
"""

import pandas as pd
import numpy as np
import json
from stage1_candidate_generator import CandidateGenerator
from stage2_basket_selector import BasketSelector

# Helper function to calculate F1 score, as in the reference implementation
def _calculate_f1(predicted: list, actual: list) -> float:
    if not actual: return 0.0
    if not predicted: return 0.0
    true_positives = len(set(predicted) & set(actual))
    precision = true_positives / len(predicted)
    recall = true_positives / len(actual)
    if precision + recall == 0: return 0.0
    return 2 * (precision * recall) / (precision + recall)

class StackedBasketModel:
    """
    Orchestrates the two-stage stacked model for training and prediction.
    """
    def __init__(self):
        self.stage1_generator = CandidateGenerator()
        self.stage2_selector = BasketSelector()

    def train(self, features_df: pd.DataFrame, future_df: pd.DataFrame, keyset: dict):
        """The main training function, now using the dedicated validation set."""
        
        # --- 1. Prepare dedicated Train and Validation data using the keyset ---
        train_users = keyset['train']
        valid_users = keyset['valid']

        def prepare_dataset(user_ids):
            """Helper function to create a labeled dataset for a given set of users."""
            user_features = features_df[features_df['user_id'].isin(user_ids)]
            labels = future_df.merge(user_features[['user_id', 'product_id']], on=['user_id', 'product_id'], how='right')
            labels['label'] = labels['order_id'].notna().astype(int)
            
            # The 'right' merge in the line above ensures we only have labels for products in user_features
            data = user_features.merge(labels[['user_id', 'product_id', 'label']], on=['user_id', 'product_id'], how='left')
            data['label'] = data['label'].fillna(0).astype(int)
            
            X = data.drop(columns=['user_id', 'product_id', 'label'])
            y = data['label']
            return X, y

        X_train, y_train = prepare_dataset(train_users)
        X_val, y_val = prepare_dataset(valid_users)
        
        # --- 2. Train Stage 1 Model with proper validation set ---
        self.stage1_generator.train(X_train, y_train, X_val, y_val)

        # --- 3. Generate Meta-Features for Stage 2 Training (using the same training users) ---
        meta_features_list = []
        best_basket_indices = []
        
        print("--- Generating Meta-Features for Stage 2 ---")
        for user_id in train_users:
            user_features = features_df[features_df['user_id'] == user_id]
            if user_features.empty: continue
            
            actual_products_series = future_df[future_df['user_id'] == user_id]['products']
            actual_basket = json.loads(actual_products_series.iloc[0]) if not actual_products_series.empty else []

            meta_features, candidate_baskets = self.stage1_generator.generate_candidates_and_meta_features(user_features)
            
            if meta_features.empty: continue

            f1_scores = [_calculate_f1(basket['product_id'].tolist(), actual_basket) for basket in candidate_baskets]
            best_basket_index = np.argmax(f1_scores) if f1_scores else 0

            meta_features_list.append(meta_features)
            best_basket_indices.append(best_basket_index)

        X_meta_train = pd.concat(meta_features_list, ignore_index=True)
        y_meta_train = pd.Series(best_basket_indices)
        
        # --- 4. Train Stage 2 Model ---
        self.stage2_selector.train(X_meta_train, y_meta_train)

        # --- 5. Save both models ---
        self.save_models()

    def predict(self, features_df: pd.DataFrame, user_id: int) -> list[int]:
        """The main prediction function to be called by the API."""
        user_features = features_df[features_df['user_id'] == user_id]
        
        # Step 1: Generate candidates and meta-features
        meta_features_df, candidate_baskets = self.stage1_generator.generate_candidates_and_meta_features(user_features)
        
        if meta_features_df.empty:
            return [] # Return empty basket if no prediction can be made
            
        # Step 2: Select the best basket
        best_basket_index = self.stage2_selector.predict(meta_features_df)
        
        # Step 3: Return the chosen basket
        final_basket = candidate_baskets[best_basket_index]['product_id'].tolist()
        
        return final_basket

    def save_models(self, path="."):
        os.makedirs(path, exist_ok=True)
        self.stage1_generator.save(path)
        self.stage2_selector.save(path)
        print(f"--- Models saved to {path} ---")

    def load_models(self, path):
        self.stage1_generator.load(os.path.join(path, "stage1_lgbm.pkl"))
        self.stage2_selector.load(os.path.join(path, "stage2_gbc.pkl"))
        print("--- Both Stage 1 and Stage 2 models loaded successfully ---")