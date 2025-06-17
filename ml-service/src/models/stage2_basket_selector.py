# ml-service/src/models/stage2_basket_selector.py
"""
Stage 2 (BasketSelector):
A Scikit-learn GradientBoostingClassifier that acts as a "meta-model."
It looks at the meta-features of the three candidate baskets and predicts
which one is the best choice.
"""

import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
import joblib
import os

class BasketSelector:
    """
    Stage 2 Model: Uses GradientBoostingClassifier to select the best basket
    from the candidates provided by Stage 1.
    """
    def __init__(self):
        self.model = GradientBoostingClassifier(n_estimators=100, max_depth=5, learning_rate=0.05, subsample=0.7)

    def train(self, X_meta_features: pd.DataFrame, y_best_basket_index: pd.Series):
        print("--- Training Stage 2: Basket Selector (Gradient Boosting) ---")
        self.model.fit(X_meta_features, y_best_basket_index)
        print("--- Stage 2 Training Complete ---")

    def predict(self, X_meta_features: pd.DataFrame) -> int:
        """Predicts the index of the best basket."""
        prediction = self.model.predict(X_meta_features)
        return int(prediction[0])

    def save(self, path=".", filename="stage2_gbc.pkl"):
        joblib.dump(self.model, os.path.join(path, filename))

    def load(self, path):
        self.model = joblib.load(path)