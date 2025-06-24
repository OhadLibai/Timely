# =====================================================================================
# 1. IMPORTS
# =====================================================================================

import pandas as pd
import numpy as np
import lightgbm as lgb
from sklearn.ensemble import GradientBoostingClassifier
import joblib
import os
import json
import logging
from typing import Dict, Any, List, Tuple

print("✅ Dependencies installed and modules imported.")

# =====================================================================================
# 2. DEFINE THE MODEL AND FEATURE ENGINEERING CLASSES
# (Copying code from project files to make the notebook self-contained)
# =====================================================================================

# --- Logger Setup ---
def setup_logger(name: str, level: int = logging.INFO) -> logging.Logger:
    logger_instance = logging.getLogger(name)
    if logger_instance.hasHandlers():
        logger_instance.handlers.clear()
    logger_instance.setLevel(level)
    ch = logging.StreamHandler()
    ch.setLevel(level)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    ch.setFormatter(formatter)
    logger_instance.addHandler(ch)
    logger_instance.propagate = False
    return logger_instance

logger = setup_logger(__name__)

# --- From: ml-service/src/features/engineering.py ---
class UnifiedFeatureEngineer:
    def __init__(self, processed_data_path: str):
        self.processed_data_path = processed_data_path
        self.prod_features_df = pd.DataFrame()
        if processed_data_path:
            self._load_static_global_data()
        logger.info("UnifiedFeatureEngineer initialized.")

    def _load_static_global_data(self):
        try:
            prod_features_path = os.path.join(self.processed_data_path, "prod_features.csv")
            if os.path.exists(prod_features_path):
                self.prod_features_df = pd.read_csv(prod_features_path).set_index('product_id')
                logger.info("Static global feature data loaded.")
        except Exception as e:
            logger.warning(f"Could not load static feature files: {e}")

    def extract_features(self, user_id: int, order_history: List[Dict]) -> pd.DataFrame:
        if not order_history:
            return pd.DataFrame()
        history_df = pd.DataFrame(order_history)
        user_product_history = history_df.explode('products').rename(columns={'products': 'product_id'})
        if user_product_history.empty:
            return pd.DataFrame()

        user_total_orders = history_df['order_id'].nunique()
        up_features = user_product_history.groupby('product_id').agg(
            up_orders=('order_id', 'nunique'),
            up_reorder_count=('product_id', 'count')
        )
        up_features['up_reorder_ratio'] = up_features['up_reorder_count'] / user_total_orders
        last_order_per_product = user_product_history.groupby('product_id')['order_number'].max()
        latest_order_number = history_df['order_number'].max()
        up_features['up_orders_since_last'] = latest_order_number - last_order_per_product

        if not self.prod_features_df.empty:
            up_features = up_features.join(self.prod_features_df, how='left').fillna(0)
        else:
            up_features['prod_reorder_probability'] = 0.0
            up_features['prod_reorder_times'] = 0.0
            up_features['prod_reorder_ratio'] = 0.0

        up_features['user_total_orders'] = user_total_orders
        up_features['user_avg_days_between_orders'] = history_df['days_since_prior_order'].mean()
        up_features['user_std_days_between_orders'] = history_df['days_since_prior_order'].std()
        up_features['user_favorite_dow'] = history_df['order_dow'].mode()[0] if not history_df['order_dow'].empty else 0
        up_features['user_favorite_hour'] = history_df['order_hour_of_day'].mode()[0] if not history_df['order_hour_of_day'].empty else 12

        final_features = up_features.reset_index()
        final_features['user_id'] = user_id
        return final_features

    def generate_features_from_csv_data(self, user_id: int, orders_df: pd.DataFrame, order_products_df: pd.DataFrame) -> pd.DataFrame:
        user_orders = orders_df[orders_df['user_id'] == user_id].sort_values('order_number')
        if user_orders.empty: return pd.DataFrame()
        order_history = []
        for _, order in user_orders.iterrows():
            order_products = order_products_df[order_products_df['order_id'] == order['order_id']]
            products = order_products['product_id'].tolist()
            order_history.append({
                'order_id': order['order_id'], 'order_number': order['order_number'],
                'order_dow': order['order_dow'], 'order_hour_of_day': order['order_hour_of_day'],
                'days_since_prior_order': order['days_since_prior_order'], 'products': products
            })
        return self.extract_features(user_id, order_history)

# --- From: ml-service/src/models/stage1_candidate_generator.py ---
class CandidateGenerator:
    def __init__(self):
        self.params = {
            'objective': 'binary', 'metric': ['binary_logloss', 'auc'], 'boosting_type': 'gbdt',
            'n_estimators': 1000, 'learning_rate': 0.05, 'num_leaves': 512,
            'verbose': -1, 'num_threads': -1, 'random_state': 42
        }
        self.model = lgb.LGBMClassifier(**self.params)
        self.candidate_thresholds = [0.16, 0.20, 0.26]

    def train(self, X_train: pd.DataFrame, y_train: pd.Series, X_val: pd.DataFrame, y_val: pd.Series):
        logger.info("--- Training Stage 1: Candidate Generator (LightGBM) ---")
        self.model.fit(X_train, y_train, eval_set=[(X_val, y_val)],
                       eval_metric='logloss', callbacks=[lgb.early_stopping(100, verbose=False)])
        logger.info("--- Stage 1 Training Complete ---")

    def generate_candidates_and_meta_features(self, features: pd.DataFrame) -> Tuple[pd.DataFrame, List[pd.DataFrame]]:
        if features.empty: return pd.DataFrame(), []
        feature_cols = [col for col in features.columns if col not in ['user_id', 'product_id']]
        probabilities = self.model.predict_proba(features[feature_cols])[:, 1]
        prob_df = features[['product_id']].copy()
        prob_df['probability'] = probabilities
        meta_features_list = []
        candidate_baskets = []
        for i, threshold in enumerate(self.candidate_thresholds):
            basket_df = prob_df[prob_df['probability'] > threshold]
            candidate_baskets.append(basket_df)
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
        final_meta_features = {k: v for d in meta_features_list for k, v in d.items()}
        return pd.DataFrame([final_meta_features]), candidate_baskets

    def save(self, path=".", filename="stage1_lgbm.pkl"):
        joblib.dump(self.model, os.path.join(path, filename))

    def load(self, path):
        self.model = joblib.load(path)

# --- From: ml-service/src/models/stage2_basket_selector.py ---
class BasketSelector:
    def __init__(self):
        self.model = GradientBoostingClassifier(n_estimators=100, max_depth=5, learning_rate=0.05)

    def train(self, X_meta_features: pd.DataFrame, y_best_basket_index: pd.Series):
        logger.info("--- Training Stage 2: Basket Selector (Gradient Boosting) ---")
        self.model.fit(X_meta_features, y_best_basket_index)
        logger.info("--- Stage 2 Training Complete ---")

    def predict(self, X_meta_features: pd.DataFrame) -> int:
        return int(self.model.predict(X_meta_features)[0])

    def save(self, path=".", filename="stage2_gbc.pkl"):
        joblib.dump(self.model, os.path.join(path, filename))

    def load(self, path):
        self.model = joblib.load(path)

# --- From: ml-service/src/models/stacked_basket_model.py ---
class StackedBasketModel:
    def __init__(self):
        self.stage1_generator = CandidateGenerator()
        self.stage2_selector = BasketSelector()

    def _calculate_f1(self, predicted: list, actual: list) -> float:
        if not actual or not predicted: return 0.0
        true_positives = len(set(predicted) & set(actual))
        precision = true_positives / len(predicted)
        recall = true_positives / len(actual)
        return 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

    def train(self, features_df: pd.DataFrame, future_df: pd.DataFrame, keyset: dict):
        train_users, valid_users = keyset['train'], keyset['valid']
        def prepare_dataset(user_ids):
            user_features = features_df[features_df['user_id'].isin(user_ids)]
            labels = future_df.merge(user_features[['user_id', 'product_id']], on=['user_id', 'product_id'], how='right')
            labels['label'] = labels['order_id'].notna().astype(int)
            data = user_features.merge(labels[['user_id', 'product_id', 'label']], on=['user_id', 'product_id'], how='left')
            data['label'] = data['label'].fillna(0).astype(int)
            feature_cols = [col for col in data.columns if col not in ['user_id', 'product_id', 'label']]
            return data[feature_cols], data['label']

        X_train, y_train = prepare_dataset(train_users)
        X_val, y_val = prepare_dataset(valid_users)
        self.stage1_generator.train(X_train, y_train, X_val, y_val)
        
        logger.info("--- Generating Meta-Features for Stage 2 ---")
        meta_features_list, best_basket_indices = [], []
        for user_id in train_users:
            user_features = features_df[features_df['user_id'] == user_id]
            if user_features.empty: continue
            actual_products_series = future_df[future_df['user_id'] == user_id]['products']
            actual_basket = json.loads(actual_products_series.iloc[0]) if not actual_products_series.empty else []
            meta_features, candidate_baskets = self.stage1_generator.generate_candidates_and_meta_features(user_features)
            if meta_features.empty: continue
            f1_scores = [self._calculate_f1(b['product_id'].tolist(), actual_basket) for b in candidate_baskets]
            best_basket_indices.append(np.argmax(f1_scores) if f1_scores else 0)
            meta_features_list.append(meta_features)

        X_meta_train = pd.concat(meta_features_list, ignore_index=True)
        y_meta_train = pd.Series(best_basket_indices)
        self.stage2_selector.train(X_meta_train, y_meta_train)
        self.save_models()

    def predict(self, features_df: pd.DataFrame, user_id: int) -> list[int]:
        user_features = features_df[features_df['user_id'] == user_id]
        meta_features_df, candidate_baskets = self.stage1_generator.generate_candidates_and_meta_features(user_features)
        if meta_features_df.empty: return []
        best_basket_index = self.stage2_selector.predict(meta_features_df)
        return candidate_baskets[best_basket_index]['product_id'].tolist()

    def save_models(self, path="."):
        os.makedirs(path, exist_ok=True)
        self.stage1_generator.save(path)
        self.stage2_selector.save(path)
        logger.info(f"--- Models saved to {path} ---")

print("✅ All required classes and functions defined.")

# =====================================================================================
# 3. DATA LOADING AND PREPROCESSING
# =====================================================================================
logger.info("--- Starting Data Loading and Preprocessing ---")

# Load data
orders = pd.read_csv('orders.csv')
order_products_prior = pd.read_csv('order_products__prior.csv')
order_products_train = pd.read_csv('order_products__train.csv')
products = pd.read_csv('products.csv')
departments = pd.read_csv('departments.csv')

# Combine prior and train order products
order_products_combined = pd.concat([order_products_prior, order_products_train])

# Get user keysets for train/validation/test split
keyset = {
    'train': orders[orders['eval_set'] == 'train']['user_id'].unique(),
    'valid': orders[orders['eval_set'] == 'train']['user_id'].unique(), # Using train set for validation as well in this setup
    'test': orders[orders['eval_set'] == 'test']['user_id'].unique()
}

# The ground truth for what a user will order next
instacart_future_df = order_products_train.groupby('order_id').apply(
    lambda group: group['product_id'].tolist()
).reset_index(name='products')
instacart_future_df = instacart_future_df.merge(orders[['order_id', 'user_id']], on='order_id')

# Generate features for all users
logger.info("--- Generating features for all users. This may take a few minutes... ---")
feature_engineer = UnifiedFeatureEngineer(processed_data_path=".") # No pre-computed data here
all_user_ids = orders['user_id'].unique()
all_features_list = [feature_engineer.generate_features_from_csv_data(uid, orders, order_products_combined) for uid in all_user_ids]
features_df = pd.concat(all_features_list, ignore_index=True)

logger.info(f"✅ Preprocessing complete. Features generated for {features_df['user_id'].nunique()} users.")
print(f"Features DataFrame shape: {features_df.shape}")

# Save the processed features
features_df.to_csv('features_df.csv', index=False)
print("✅ Processed features saved to features_df.csv")

# Convert numpy arrays to lists for JSON serialization
# And keyset
keyset_to_save = {k: v.tolist() for k, v in keyset.items()}
with open('keyset.json', 'w') as f:
    json.dump(keyset_to_save, f)
print("✅ Keyset saved to keyset.json")

# =====================================================================================
# 4. MODEL TRAINING
# =====================================================================================
logger.info("--- Initializing the Stacked Model for Training ---")
stacked_model = StackedBasketModel()

# Train the model
stacked_model.train(features_df, instacart_future_df, keyset)

print("\n🎉🎉🎉 MODEL TRAINING COMPLETE! 🎉🎉🎉")
print("You can now download 'stage1_lgbm.pkl' and 'stage2_gbc.pkl' from the file explorer.")