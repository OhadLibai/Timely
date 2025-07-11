# backend/ml_engine/__init__.py
"""
ML Engine - TIFUKNN Implementation adapted for Timely
Implements the exact TIFUKNN algorithm logic, optimized for single-user predictions
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
KNN_NEIGHBOR_LOADING_SAMPLE = 5000

# Paths
DATA_PATH = Path('/app/data')
VECTORS_PATH = DATA_PATH / 'vectors'
DATASET_PATH = DATA_PATH / 'dataset'

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
        
        # Load keyset (train/val/test splits)
        keyset_path = DATASET_PATH / 'instacart_keyset_0.json'
        if keyset_path.exists():
            with open(keyset_path, 'r') as f:
                self.keyset = json.load(f)
                self.item_count = self.keyset.get('item_num', 0)
    
    def _group_history_list(self, his_list: List[np.ndarray], group_size: int) -> Tuple[List[np.ndarray], int]:
        """
        Group user's basket sequence into blocks for temporal modeling
        Exact implementation from tifuknn.py
        """
        grouped_vec_list = []
        
        if len(his_list) < group_size:
            return his_list, len(his_list)
        
        est_num_vec_each_block = len(his_list) / group_size
        base_num_vec_each_block = int(np.floor(len(his_list) / group_size))
        residual = est_num_vec_each_block - base_num_vec_each_block
        
        num_vec_has_extra_vec = int(np.round(residual * group_size))
        
        if residual == 0:
            # Even distribution
            for i in range(group_size):
                sum_vec = np.zeros(len(his_list[0]))
                for j in range(base_num_vec_each_block):
                    sum_vec += his_list[i * base_num_vec_each_block + j]
                grouped_vec_list.append(sum_vec / base_num_vec_each_block)
        else:
            # Uneven distribution - some groups get extra vectors
            # First groups without extra
            for i in range(group_size - num_vec_has_extra_vec):
                sum_vec = np.zeros(len(his_list[0]))
                for j in range(base_num_vec_each_block):
                    sum_vec += his_list[i * base_num_vec_each_block + j]
                    last_idx = i * base_num_vec_each_block + j
                grouped_vec_list.append(sum_vec / base_num_vec_each_block)
            
            # Remaining groups with extra vectors
            est_num = int(np.ceil(est_num_vec_each_block))
            start_group_idx = group_size - num_vec_has_extra_vec
            
            for i in range(start_group_idx, group_size):
                sum_vec = np.zeros(len(his_list[0]))
                for j in range(est_num):
                    idx = last_idx + 1 + (i - start_group_idx) * est_num + j
                    if idx < len(his_list):
                        sum_vec += his_list[idx]
                grouped_vec_list.append(sum_vec / est_num)
        
        return grouped_vec_list, group_size
    
    def _compute_user_vector(self, user_history: List[List[int]]) -> Optional[np.ndarray]:
        """
        Compute TIFUKNN vector for a single user
        Implements temporal_decay_sum_history for one user
        """
        # Skip first element (user_id) and require at least 2 baskets
        if len(user_history) < 3:
            return None
        
        vec_list = user_history  # Full history including user_id
        num_vec = len(vec_list) - 2  # Exclude user_id and last basket
        his_list = []
        
        # Create temporal decay vectors for each basket
        for idx in range(1, num_vec + 1):
            his_vec = np.zeros(self.item_count)
            decayed_val = np.power(WITHIN_DECAY_RATE, num_vec - idx)
            
            # Apply decay to each item in basket
            for item in vec_list[idx]:
                if item < self.item_count:
                    his_vec[item] = decayed_val
            
            his_list.append(his_vec)
        
        # Group the vectors
        grouped_list, real_group_size = self._group_history_list(his_list, GROUP_SIZE)
        
        # Apply group-level decay
        final_vec = np.zeros(self.item_count)
        for idx in range(real_group_size):
            decayed_val = np.power(GROUP_DECAY_RATE, GROUP_SIZE - 1 - idx)
            if idx < len(grouped_list):
                final_vec += grouped_list[idx] * decayed_val
        
        # Normalize by group size
        return final_vec / real_group_size
    
    def _get_user_history_from_db(self, user_id: int) -> Optional[List[List[int]]]:
        """
        Fetch user's purchase history from database
        Format: [[user_id], [basket1], [basket2], ...]
        """
        try:
            conn = psycopg2.connect(**DATABASE_CONFIG)
            cur = conn.cursor(cursor_factory=RealDictCursor)
            
            cur.execute("""
                SELECT o.id, o.order_sequence, oi.product_id
                FROM orders o
                JOIN order_items oi ON o.id = oi.order_id
                WHERE o.user_id = %s AND o.status = 'completed'
                ORDER BY o.order_sequence, oi.add_to_cart_order
            """, [user_id])
            
            orders = cur.fetchall()
            cur.close()
            conn.close()
            
            if not orders:
                return None
            
            # Format as TIFUKNN expects
            history = [[user_id]]
            current_order_id = None
            current_basket = []
            
            for row in orders:
                if row['id'] != current_order_id:
                    if current_basket:
                        history.append(current_basket)
                    current_basket = []
                    current_order_id = row['id']
                
                current_basket.append(int(row['product_id']))
            
            if current_basket:
                history.append(current_basket)
            
            return history
            
        except Exception as e:
            print(f"DB error: {str(e)}")
            return None
    
    def _knn_search(self, query_vector: np.ndarray, k: int) -> Tuple[List[str], np.ndarray]:
        """
        Find K nearest neighbors using pre-computed training vectors
        Returns user IDs and distances
        """
        # Load or use cached training vectors
        if not self.training_vectors:
            self._load_training_vectors()
        
        if not self.training_vectors:
            return [], np.array([])
        
        # Sample training users for efficiency
        all_training_users = list(self.training_vectors.keys())
        if len(all_training_users) > KNN_NEIGHBOR_LOADING_SAMPLE:
            sampled_users = random.sample(all_training_users, KNN_NEIGHBOR_LOADING_SAMPLE)
        else:
            sampled_users = all_training_users
        
        # Build matrix for KNN
        training_matrix = []
        user_indices = []
        
        for user_id in sampled_users:
            if user_id in self.training_vectors:
                training_matrix.append(self.training_vectors[user_id])
                user_indices.append(user_id)
        
        if not training_matrix:
            return [], np.array([])
        
        # Run KNN
        training_matrix = np.array(training_matrix)
        nbrs = NearestNeighbors(n_neighbors=min(k, len(training_matrix)), algorithm='brute')
        nbrs.fit(training_matrix)
        
        distances, indices = nbrs.kneighbors([query_vector])
        
        # Map indices back to user IDs
        neighbor_ids = [user_indices[idx] for idx in indices[0]]
        
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
        else:
            print("No pre-computed training vectors found")
    
    def precompute_all_vectors(self):
        """
        Pre-compute vectors for all training users
        This enables fast KNN search during predictions
        """
        if not self.csv_data or not self.keyset:
            print("No data for pre-computation")
            return
        
        training_users = [str(uid) for uid in self.keyset.get('train', [])]
        print(f"Pre-computing vectors for {len(training_users)} training users...")
        
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
        print(f"Pre-computation complete: {computed} vectors saved, {skipped} skipped")


# Singleton instance
_engine_instance = None

def get_engine() -> TifuKnnEngine:
    """Get or create singleton engine instance"""
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = TifuKnnEngine()
    return _engine_instance