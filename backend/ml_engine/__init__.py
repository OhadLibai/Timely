# backend/ml_engine/__init__.py
"""
ML Engine - TIFUKNN Implementation adapted for Timely
Implements the exact TIFUKNN algorithm logic, optimized for single-user predictions
Updated paths for new project structure
"""

import numpy as np
import json
import pickle
import random
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import psycopg2
from psycopg2.extras import RealDictCursor
from sklearn.neighbors import NearestNeighbors

# TIFUKNN Configuration (hardcoded as per paper)
KNN_K = 900
WITHIN_DECAY_RATE = 0.9
GROUP_DECAY_RATE = 0.7
ALPHA = 0.9
GROUP_SIZE = 3
TOPK = 20
TOP_CANDIDATES = 100  # Top candidates before final selection
KNN_NEIGHBOR_LOADING_SAMPLE = 5000 # K

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
    TIFUKNN implementation optimized for production use
    Maintains exact algorithm logic while supporting both DB and CSV data
    """
    
    def __init__(self):
        self.csv_data = None  # Original Instacart data
        self.keyset = None
        self.item_count = None
        self.training_vectors = {}  # Pre-computed training vectors cache
        self._load_base_data()
    
    def _load_base_data(self):
        """Load essential data files"""
        # Load CSV data
        history_path = DATASET_PATH / 'data_history.json'
        if history_path.exists():
            with open(history_path, 'r') as f:
                self.csv_data = json.load(f)
            print(f"✅ Loaded CSV data for {len(self.csv_data)} users")
        else:
            print(f"⚠️  CSV data not found at {history_path}")
        
        # Load keyset (train/val/test splits)
        keyset_path = DATASET_PATH / 'instacart_keyset_0.json'
        if keyset_path.exists():
            with open(keyset_path, 'r') as f:
                self.keyset = json.load(f)
                self.item_count = self.keyset.get('item_num', 0)
            print(f"✅ Loaded keyset with {self.item_count} items")
            print(f"   Train users: {len(self.keyset.get('train', []))}")
            print(f"   Val users: {len(self.keyset.get('val', []))}")
            print(f"   Test users: {len(self.keyset.get('test', []))}")
        else:
            print(f"⚠️  Keyset not found at {keyset_path}")
    
    def _group_history_list(self, his_list: List[np.ndarray], group_size: int) -> Tuple[List[np.ndarray], int]:
        """
        Group user's basket sequence into blocks for temporal modeling
        Exact implementation from TIFUKNN paper
        """
        if len(his_list) <= group_size:
            return [his_list], 1
        
        grouped = []
        for i in range(0, len(his_list), group_size):
            group = his_list[i:i + group_size]
            grouped.append(group)
        
        return grouped, len(grouped)
    
    def _temporal_decay_sum_history(self, history_list: List[List[int]]) -> np.ndarray:
        """
        Apply temporal decay to user's purchase history
        Implements the core TIFUKNN temporal modeling
        """
        if not history_list or not self.item_count:
            return np.zeros(self.item_count)
        
        # Skip first element (user_id) and convert to numpy arrays
        basket_arrays = [np.array(basket) for basket in history_list[1:]]
        
        if not basket_arrays:
            return np.zeros(self.item_count)
        
        # Group baskets into temporal blocks
        grouped_baskets, group_count = self._group_history_list(basket_arrays, GROUP_SIZE)
        
        # Initialize final vector
        final_vector = np.zeros(self.item_count)
        
        # Apply group-level decay (more recent groups weighted higher)
        for group_idx, group in enumerate(grouped_baskets):
            # Group decay: more recent groups get higher weights
            group_weight = (GROUP_DECAY_RATE ** (group_count - group_idx - 1))
            
            # Initialize group vector
            group_vector = np.zeros(self.item_count)
            
            # Apply within-group decay (more recent baskets in group weighted higher)
            for basket_idx, basket in enumerate(group):
                basket_weight = (WITHIN_DECAY_RATE ** (len(group) - basket_idx - 1))
                
                # Add items to group vector
                for item_id in basket:
                    if 0 <= item_id < self.item_count:
                        group_vector[item_id] += basket_weight
            
            # Add group vector to final vector
            final_vector += group_vector * group_weight
        
        return final_vector
    
    def _compute_user_vector(self, user_history: List[List[int]]) -> Optional[np.ndarray]:
        """
        Compute user vector from purchase history
        """
        try:
            return self._temporal_decay_sum_history(user_history)
        except Exception as e:
            print(f"Error computing user vector: {e}")
            return None
    
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
                history.append(list(order['products']))
            
            return history
            
        except Exception as e:
            print(f"Database error getting user history: {e}")
            return []
    
    def _knn_search(self, query_vector: np.ndarray, k: int) -> Tuple[List[str], np.ndarray]:
        """
        Find k nearest neighbors for query vector
        """
        if not self.training_vectors:
            self._load_training_vectors()
        
        if not self.training_vectors:
            return [], np.array([])
        
        # Convert training vectors to matrix
        user_ids = list(self.training_vectors.keys())
        vectors_matrix = np.array([self.training_vectors[uid] for uid in user_ids])
        
        # Use sklearn NearestNeighbors for efficiency
        nbrs = NearestNeighbors(n_neighbors=min(k, len(user_ids)), metric='cosine')
        nbrs.fit(vectors_matrix)
        
        # Find neighbors
        distances, indices = nbrs.kneighbors([query_vector])
        
        # Convert indices back to user IDs
        neighbor_ids = [user_ids[idx] for idx in indices[0]]
        
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
                if neighbor_id in self.training_vectors:
                    merged_vector += self.training_vectors[neighbor_id] * neighbor_weight
        
        # Convert to top-k item list
        # First get top 100 candidates, then return top K
        top_items = merged_vector.argsort()[::-1][:TOP_CANDIDATES].tolist()
        
        return top_items
    
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
                if not self.csv_data or user_id not in self.csv_data:
                    return {
                        'success': False,
                        'error': 'User not found in CSV data',
                        'items': []
                    }
                user_history = self.csv_data[user_id]
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
            if len(user_history) < 3:
                return {
                    'success': False,
                    'error': 'Insufficient purchase history (minimum 3 orders required)',
                    'items': []
                }
            
            # Compute user vector
            user_vector = self._compute_user_vector(user_history)
            if user_vector is None:
                return {
                    'success': False,
                    'error': 'Failed to compute user vector',
                    'items': []
                }
            
            # Find nearest neighbors
            neighbor_ids, distances = self._knn_search(user_vector, KNN_K)
            
            if not neighbor_ids:
                # No neighbors found, use user's own history
                top_items = user_vector.argsort()[::-1][:TOP_CANDIDATES].tolist()
            else:
                # Merge histories
                top_items = self._merge_histories(user_vector, neighbor_ids, ALPHA)
            
            # Return top K items
            return {
                'success': True,
                'items': top_items[:TOPK],
                'metadata': {
                    'algorithm': 'TIFU-KNN',
                    'data_source': 'csv' if use_csv_data else 'database',
                    'num_neighbors': len(neighbor_ids),
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
    
    def _load_training_vectors(self):
        """Load pre-computed training vectors from disk"""
        vectors_file = VECTORS_PATH / 'training_vectors.pkl'
        if vectors_file.exists():
            with open(vectors_file, 'rb') as f:
                self.training_vectors = pickle.load(f)
            print(f"✅ Loaded {len(self.training_vectors)} pre-computed training vectors")
        else:
            print(f"⚠️  No pre-computed training vectors found at {vectors_file}")
    
    def precompute_all_vectors(self):
        """
        Pre-compute vectors for all training users
        This enables fast KNN search during predictions
        """
        if not self.csv_data or not self.keyset:
            print("❌ No data available for pre-computation")
            return
        
        training_users = [str(uid) for uid in self.keyset.get('train', [])]
        print(f"🧮 Pre-computing vectors for {len(training_users)} training users...")
        
        computed_vectors = {}
        computed = 0
        skipped = 0
        
        for user_id in training_users:
            if user_id in self.csv_data:
                user_history = self.csv_data[user_id]
                
                if len(user_history) >= 3:
                    vector = self._compute_user_vector(user_history)
                    if vector is not None:
                        computed_vectors[user_id] = vector
                        computed += 1
                    else:
                        skipped += 1
                else:
                    skipped += 1
            else:
                skipped += 1
            
            if (computed + skipped) % 1000 == 0:
                print(f"Progress: {computed + skipped}/{len(training_users)}")
        
        # Save computed vectors
        VECTORS_PATH.mkdir(parents=True, exist_ok=True)
        vectors_file = VECTORS_PATH / 'training_vectors.pkl'
        
        with open(vectors_file, 'wb') as f:
            pickle.dump(computed_vectors, f)
        
        self.training_vectors = computed_vectors
        print(f"✅ Pre-computation complete: {computed} vectors saved, {skipped} skipped")
        print(f"📁 Vectors saved to: {vectors_file}")


# Singleton instance
_engine_instance = None

def get_engine() -> TifuKnnEngine:
    """Get or create singleton engine instance"""
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = TifuKnnEngine()
    return _engine_instance