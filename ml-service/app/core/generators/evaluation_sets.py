"""
User evaluation sets for cross-validation and model testing
Extracted from tifuknn.py for better modularity
"""

import random
from typing import List, Dict
from loguru import logger

class EvaluationSetsGenerator:
    """Generate user evaluation sets for cross-validation and model testing"""
    
    def __init__(self, seed: int = 42):
        self.seed = seed
        
    def generate_random_evaluation_set(self, user_ids: List[str], fold_number: int = 0) -> List[str]:
        """Generate a random evaluation set for testing"""
        random.seed(self.seed + fold_number)
        shuffled = user_ids.copy()
        random.shuffle(shuffled)
        return shuffled
    
    def generate_kfold_sets(self, user_ids: List[str], n_folds: int = 5) -> List[List[str]]:
        """Generate k-fold cross-validation sets"""
        logger.info(f"Generating {n_folds}-fold evaluation sets from {len(user_ids)} users")
        
        random.seed(self.seed)
        shuffled = user_ids.copy()
        random.shuffle(shuffled)
        
        fold_size = len(shuffled) // n_folds
        folds = []
        
        for i in range(n_folds):
            start_idx = i * fold_size
            end_idx = start_idx + fold_size if i < n_folds - 1 else len(shuffled)
            folds.append(shuffled[start_idx:end_idx])
        
        return folds
    
    def stratified_user_sampling(self, user_baskets: Dict, sample_size: int = None) -> List[str]:
        """Enhanced stratified sampling based on user behavior patterns"""
        if sample_size is None or sample_size >= len(user_baskets):
            return list(user_baskets.keys())
        
        # Categorize users by behavior
        categories = {'heavy': [], 'light': [], 'diverse': [], 'focused': []}
        
        for user_id, baskets in user_baskets.items():
            n_orders = len(baskets)
            unique_items = len(set(item for basket in baskets for item in basket))
            
            if n_orders > 20:
                categories['heavy'].append(user_id)
            else:
                categories['light'].append(user_id)
                
            if unique_items > 50:
                categories['diverse'].append(user_id)
            else:
                categories['focused'].append(user_id)
        
        # Sample proportionally from each category
        sampled_users = []
        samples_per_category = sample_size // 4
        
        for category, users in categories.items():
            if users:
                n_sample = min(samples_per_category, len(users))
                sampled_users.extend(random.sample(users, n_sample))
        
        # Fill remaining slots randomly
        remaining = sample_size - len(sampled_users)
        if remaining > 0:
            all_users = list(user_baskets.keys())
            remaining_users = [u for u in all_users if u not in sampled_users]
            if remaining_users:
                sampled_users.extend(random.sample(remaining_users, min(remaining, len(remaining_users))))
        
        logger.info(f"Stratified sampling: {len(sampled_users)} users selected")
        return sampled_users

# Backward compatibility functions
def generate_random_keyset(user_ids: List[str], fold_number: int = 0, seed: int = 42) -> List[str]:
    """Generate a random keyset for evaluation (backward compatibility)"""
    generator = EvaluationSetsGenerator(seed=seed)
    return generator.generate_random_evaluation_set(user_ids, fold_number)

def generate_kfold_keysets(user_ids: List[str], n_folds: int = 5, seed: int = 42) -> List[List[str]]:
    """Generate k-fold cross-validation keysets (backward compatibility)"""
    generator = EvaluationSetsGenerator(seed=seed)
    return generator.generate_kfold_sets(user_ids, n_folds)