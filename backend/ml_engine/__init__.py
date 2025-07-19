# backend/ml_engine/__init__.py
"""
ML Engine - TIFUKNN Implementation adapted for Timely
COMPLETE IMPLEMENTATION - Addresses all 4 core demands
Updated for proper Docker environment and error handling
STRICT: Fails immediately if required data files are missing
"""

import os
import numpy as np
import json
import pickle
import random
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import psycopg2
from psycopg2.extras import RealDictCursor
from sklearn.neighbors import NearestNeighbors
import pandas as pd

# TIFUKNN Configuration (hardcoded as per paper)
WITHIN_DECAY_RATE = 0.9
GROUP_DECAY_RATE = 0.7
GROUP_SIZE = 3
KNN_K = 900
ALPHA = 0.9

# Basket size 
TOPK = int(os.getenv("PREDICTED_BASKET_SIZE")) 

# Production and Runtime Optimizations
MATRIX_NEIGHBOR_KNN_SEARCH_LIMIT = int(os.getenv("MATRIX_NEIGHBOR_KNN_SEARCH_LIMIT"))  # KNN search optimization, affects the size of the the vector matrix in real time calculation.
MAX_RECOMMENDER_VECTORS_LOAD = int(os.getenv("MAX_RECOMMENDER_VECTORS_LOAD")) # Limit to avoid memory issues, managed during the build process

# Updated paths for new structure
DATA_PATH = Path('/app/data')
VECTORS_PATH = DATA_PATH / 'vectors'
DATASET_PATH = DATA_PATH / 'dataset'  # Local copy in backend container

# Database config
DATABASE_CONFIG = {
    'host': 'database',
    'port': 5432,
    'database': 'timely_db',
    'user': 'timely_user',
    'password': 'timely_password'
}


class TifuKnnEngine:
    """
    TIFUKNN implementation adapted to the app:
        - optimized for production use
        - supporting both DB and CSV data
        - maintain same logic
    """
    
    def __init__(self):
        self.csv_data_history = None  # Original Instacart data
        self.keyset = None
        self.item_count = None
        self.recommender_vectors = {}  # Pre-computed recommender vectors cache
        
        """Load essential data files - STRICT: fails immediately if files missing"""
        print("🔧 Loading ML engine base data...")
        
        # Load CSV data history
        history_path = DATASET_PATH / 'data_history.json'
        with open(history_path, 'r') as f:
            self.csv_data_history = json.load(f)    
            print(f"✅ Loaded CSV data history for {len(self.csv_data_history)} users")
        
        # Load keyset (train/val/test splits)
        keyset_path = DATASET_PATH / 'instacart_keyset_0.json'
        with open(keyset_path, 'r') as f:
            self.keyset = json.load(f)
            self.item_count = self.keyset.get('item_num', 49688)  # Default to Instacart product count
        print(f"✅ Loaded keyset with {self.item_count} items")
        print(f"   Train users: {len(self.keyset.get('train', []))}")
        print(f"   Val users: {len(self.keyset.get('val', []))}")
        print(f"   Test users: {len(self.keyset.get('test', []))}")
        
        # Load pre-computed recommender vectors from disk
        vectors_file = VECTORS_PATH / 'recommender_vectors.pkl'
        if vectors_file.exists():
            with open(vectors_file, 'rb') as f:
                self.recommender_vectors = pickle.load(f)
                print(f"✅ Loaded {len(self.recommender_vectors)} pre-computed recommender vectors")
        else:
            print(f"⚠️  No pre-computed recommender vectors found at {vectors_file}. Need to precompute vectors first")
        
    def precompute_recommender_vectors(self):
        """
        Pre-compute vectors for all recommender users
        This enables fast KNN search during predictions
        """
        print("⚒️  Start precompute vectors")

        recommender_users = [str(uid) for uid in self.keyset.get('train', [])]
        
        if len(recommender_users) > MAX_RECOMMENDER_VECTORS_LOAD:
            recommender_users = random.sample(recommender_users, MAX_RECOMMENDER_VECTORS_LOAD) # Choose recommendors in random
            print(f"⚡ Limiting vector computation to {MAX_RECOMMENDER_VECTORS_LOAD} users for feasible memory load")
        
        print(f"🧮 Pre-computing vectors for {len(recommender_users)} recommender users...")

        VECTORS_PATH.mkdir(parents=True, exist_ok=True)
        vectors_file = VECTORS_PATH / 'recommender_vectors.pkl'
        
        computed_vectors = {}
        computed = 0
        skipped = 0
        
        for user_id in recommender_users:
            if user_id in self.csv_data_history:
                user_history = self.csv_data_history[user_id]
                
                if len(user_history) >= 3:  # user_id + at least 2 baskets
                    vector = self._compute_user_vector(user_history)
                    if vector is not None and np.sum(vector) > 0:
                        computed_vectors[user_id] = vector
                        computed += 1
                    else:
                        skipped += 1
                else:
                    skipped += 1
            else:
                skipped += 1
            
            if (computed + skipped) % 1000 == 0:
                print(f"Progress: {computed + skipped}/{len(recommender_users)}")
        
        # Save all computed vectors at the end
        try:
            with open(vectors_file, 'wb') as f:
                pickle.dump(computed_vectors, f)    
            self.recommender_vectors = computed_vectors
            print(f"✅ Pre-computation complete: {computed} vectors saved, {skipped} skipped")
            print(f"📁 Vectors saved to: {vectors_file}")
            
        except Exception as e:
            raise RuntimeError(f"❌ Failed to save pre-computed vectors: {e}")
        
    def _compute_user_vector(self, user_history: List[List[int]]) -> Optional[np.ndarray]:
        """
        Compute user vector from purchase history
        """
        try:
            return self._temporal_decay_sum_history(user_history)
        except Exception as e:
            print(f"Error computing user vector: {e}")
            return None
    
    def _temporal_decay_sum_history(self, user_history: List[List[int]]) -> np.ndarray:
        """
        Compute user vector using temporal decay and within-basket grouping
        """
        if not user_history or len(user_history) < 2:  # Need at least user_id + 1 basket
            return np.zeros(self.item_count)
        
        # Initialize vector
        final_vector = np.zeros(self.item_count)
        
        # Skip user_id (first element) and process baskets
        baskets = user_history[1:] if isinstance(user_history[0], int) else user_history
        
        if not baskets:
            return final_vector
        
        # Process each basket with temporal decay
        for basket_idx, basket in enumerate(baskets):
            if not basket:
                continue
                
            # Temporal decay: more recent baskets get higher weight
            basket_position = len(baskets) - basket_idx - 1  # 0 for most recent
            basket_weight = (GROUP_DECAY_RATE ** basket_position)
            
            # Within-basket grouping
            group_vector = np.zeros(self.item_count)
            
            # Group items in basket by GROUP_SIZE
            for group_start in range(0, len(basket), GROUP_SIZE):
                group = basket[group_start:group_start + GROUP_SIZE]
                
                # Within-group decay
                for item_idx, item_id in enumerate(group):
                    if 0 <= item_id < self.item_count:
                        within_group_weight = (WITHIN_DECAY_RATE ** item_idx)
                        group_vector[item_id] += within_group_weight
            
            # Add group vector to final vector
            final_vector += group_vector * basket_weight
        
        return final_vector
    
    def _get_user_history_from_db(self, user_id: int) -> List[List[int]]:
        """
        Get user's order history from database
        Format: [[user_id], [basket1], [basket2], ...]
        """
        try:
            conn = psycopg2.connect(**DATABASE_CONFIG)
            cur = conn.cursor(cursor_factory=RealDictCursor)
            
            # Get user's orders in chronological order
            cur.execute("""
                SELECT o.id as order_id, o.created_at, 
                       array_agg(oi.product_id ORDER BY oi.created_at) as products
                FROM orders o
                JOIN order_items oi ON o.id = oi.order_id
                WHERE o.user_id = %s
                GROUP BY o.id, o.created_at
                ORDER BY o.created_at
            """, (user_id,))
            
            orders = cur.fetchall()
            cur.close()
            conn.close()
            
            if not orders:
                return []
            
            # Format as expected by TIFUKNN: [user_id, basket1, basket2, ...]
            history = [user_id]  # First element is user_id
            for order in orders:
                if order['products']:
                    history.append([int(pid) for pid in order['products'] if pid])
            
            return history
            
        except Exception as e:
            print(f"Database error getting user history: {e}")
            return []
    
    def _knn_search(self, query_vector: np.ndarray, k: int) -> Tuple[List[str], np.ndarray]:
        """
        Find k nearest neighbors for query vector
        """
        
        if not self.recommender_vectors:
            return [], np.array([])
        
        # Convert recommender vectors to matrix
        user_ids = list(self.recommender_vectors.keys())
        
        # Limit search space for performance (random sampling)
        if len(user_ids) > MATRIX_NEIGHBOR_KNN_SEARCH_LIMIT:
            sampled_ids = random.sample(user_ids, MATRIX_NEIGHBOR_KNN_SEARCH_LIMIT)
        else:
            sampled_ids = user_ids
        
        vectors_matrix = np.array([self.recommender_vectors[uid] for uid in sampled_ids])
        
        # Use sklearn NearestNeighbors for efficiency
        k_actual = min(k, len(sampled_ids))
        nbrs = NearestNeighbors(n_neighbors=k_actual, metric='cosine')
        nbrs.fit(vectors_matrix)
        
        # Find neighbors
        distances, indices = nbrs.kneighbors([query_vector])
        
        # Convert indices back to user IDs
        neighbor_ids = [sampled_ids[idx] for idx in indices[0]]
        
        return neighbor_ids, distances[0]
    
    def _merge_histories(self, user_vector: np.ndarray, neighbor_ids: List[str], alpha: float) -> List[int]:
        """
        Merge user's history with neighbors' histories
        Implements merge_history logic for single user
        """
        # Start with user's own vector weighted by alpha
        merged_vector = user_vector * alpha
        
        # Add neighbors' vectors weighted by (1-alpha)
        if neighbor_ids:
            neighbor_weight = (1 - alpha) / len(neighbor_ids)
            
            for neighbor_id in neighbor_ids:
                if neighbor_id in self.recommender_vectors:
                    merged_vector += self.recommender_vectors[neighbor_id] * neighbor_weight
        
        # Convert to item list
        item_list_result = merged_vector.argsort()[::-1].tolist()
        
        return item_list_result
    
    def predict_basket(self, user_id: str, use_csv_data: bool = False) -> Dict:
        """
        Generate basket prediction for a user
        
        Args:
            user_id: User ID
            use_csv_data: True for CSV-only (Demand #3), False for DB (Demand #1)
        """
        try:
            # Get user history based on data source
            if use_csv_data:
                # Demand #3: CSV-only prediction
                if not self.csv_data_history or user_id not in self.csv_data_history:
                    return {
                        'success': False,
                        'error': f'User {user_id} not found in CSV data',
                        'items': []
                    }
                user_history = self.csv_data_history[user_id]
            else:
                # Demand #1: Database prediction
                user_history = self._get_user_history_from_db(int(user_id))
                if not user_history:
                    return {
                        'success': False,
                        'error': 'No order history found in database',
                        'items': []
                    }
            
            # Check minimum history requirement
            if len(user_history) < 3:  # user_id + at least 2 baskets
                return {
                    'success': False,
                    'error': 'Insufficient purchase history (minimum 2 orders required)',
                    'items': []
                }
            
            # Compute user vector
            user_vector = self._compute_user_vector(user_history)
            if user_vector is None or np.sum(user_vector) == 0:
                return {
                    'success': False,
                    'error': 'Failed to compute user vector',
                    'items': []
                }
            
            # Find nearest neighbors
            neighbor_ids, distances = self._knn_search(user_vector, KNN_K)
            
            if not neighbor_ids:
                # No neighbors found, use user's own history
                top_items = user_vector.argsort()[::-1][:TOPK].tolist()
            else:
                # Merge histories
                top_items = self._merge_histories(user_vector, neighbor_ids, ALPHA)[:TOPK]
            
            return {
                'success': True,
                'items': top_items,
                'metadata': {
                    'algorithm': 'TIFU-KNN',
                    'data_source': 'csv' if use_csv_data else 'database',
                    'num_neighbors': len(neighbor_ids),
                    'user_vector_sum': float(np.sum(user_vector)),
                    'parameters': {
                        'k': KNN_K,
                        'alpha': ALPHA,
                        'within_decay': WITHIN_DECAY_RATE,
                        'group_decay': GROUP_DECAY_RATE,
                        'group_size': GROUP_SIZE,
                        'topk': TOPK
                    }
                }
            }
            
        except Exception as e:
            print(f"Prediction error: {str(e)}")
            return {
                'success': False,
                'error': f'Prediction failed: {str(e)}',
                'items': []
            }
    
    
    
    def get_ground_truth_for_user(self, user_id: str) -> List[int]:
        """
        Get ground truth next basket for evaluation (Demand #3)
        """
        try:
            # Load future data
            future_path = DATASET_PATH / 'instacart_future.csv'
            if not future_path.exists():
                return []
            
            future_df = pd.read_csv(future_path)
            user_future = future_df[future_df['user_id'] == int(user_id)]
            
            if user_future.empty:
                return []
            
            # Return list of product IDs in ground truth
            return user_future['product_id'].tolist()
            
        except Exception as e:
            print(f"Error getting ground truth: {e}")
            return []


# Singleton instance
_engine_instance = None

def get_engine() -> TifuKnnEngine:
    """Get or create singleton engine instance"""
    global _engine_instance
    if _engine_instance is None:
        print("✈️  Initializing ML Engine...")
        try:
            _engine_instance = TifuKnnEngine()
        except Exception as e:
            print(f"❌ CRITICAL ERROR: ML Engine initialization failed: {e}")
            raise SystemExit(1)
    return _engine_instance

# Export main class and function
__all__ = ['TifuKnnEngine', 'get_engine']