# backend/ml_engine/__init__.py
"""
ML Engine Module for TIFU-KNN Next Basket Prediction
Wraps the original TIFU-KNN implementation for integration with Flask backend
"""

import os
import json
import pickle
import random
import numpy as np
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from sklearn.neighbors import NearestNeighbors

# Configuration - hardcoded values
KNN_K = 900
WITHIN_DECAY_RATE = 0.9
GROUP_DECAY_RATE = 0.7
ALPHA = 0.9
GROUP_SIZE = 3
TOPK = 20
KNN_NEIGHBOR_LOADING_SAMPLE = 5000 # change this to tune accuracy and search time (simple trade-off)

# Data paths
DATA_PATH = Path('/app/data')
VECTORS_PATH = DATA_PATH / 'vectors'
DATASET_PATH = DATA_PATH / 'dataset'


class TifuKnnEngine:
    """
    TIFU-KNN Engine for Next Basket Recommendation
    Implements Temporal Item Frequency-based User-KNN algorithm
    """
    
    def __init__(self):
        """Initialize the engine and load necessary data"""
        self.data_history = None
        self.keyset = None
        self.item_count = None
        self._load_base_data()
    
    def _load_base_data(self):
        """Load the base data files needed for predictions"""
        # Load data history (user purchase sequences)
        history_path = DATASET_PATH / 'data_history.json'
        if history_path.exists():
            with open(history_path, 'r') as f:
                self.data_history = json.load(f)
        
        # Load keyset (train/val/test splits and item count)
        keyset_path = DATASET_PATH / 'instacart_keyset_0.json'
        if keyset_path.exists():
            with open(keyset_path, 'r') as f:
                self.keyset = json.load(f)
                self.item_count = self.keyset.get('item_num', 0)
    
    def group_history_list(self, his_list: List[np.ndarray], group_size: int) -> Tuple[List[np.ndarray], int]:
        """
        Group user's basket history into blocks for temporal modeling
        Direct implementation from original tifuknn.py
        """
        grouped_vec_list = []
        
        if len(his_list) < group_size:
            return his_list, len(his_list)
        
        est_num_vec_each_block = len(his_list) / group_size
        base_num_vec_each_block = int(np.floor(len(his_list) / group_size))
        residual = est_num_vec_each_block - base_num_vec_each_block
        
        num_vec_has_extra_vec = int(np.round(residual * group_size))
        
        if residual == 0:
            for i in range(group_size):
                sum_vec = np.zeros(len(his_list[0]))
                for j in range(base_num_vec_each_block):
                    sum_vec += his_list[i * base_num_vec_each_block + j]
                grouped_vec_list.append(sum_vec / base_num_vec_each_block)
        else:
            # Handle uneven distribution
            for i in range(group_size - num_vec_has_extra_vec):
                sum_vec = np.zeros(len(his_list[0]))
                for j in range(base_num_vec_each_block):
                    sum_vec += his_list[i * base_num_vec_each_block + j]
                    last_idx = i * base_num_vec_each_block + j
                grouped_vec_list.append(sum_vec / base_num_vec_each_block)
            
            # Handle remaining groups with extra vectors
            est_num = int(np.ceil(est_num_vec_each_block))
            start_group_idx = group_size - num_vec_has_extra_vec
            
            if len(his_list) - start_group_idx * base_num_vec_each_block >= est_num_vec_each_block:
                for i in range(start_group_idx, group_size):
                    sum_vec = np.zeros(len(his_list[0]))
                    for j in range(est_num):
                        idx = last_idx + 1 + (i - start_group_idx) * est_num + j
                        if idx < len(his_list):
                            sum_vec += his_list[idx]
                    grouped_vec_list.append(sum_vec / est_num)
        
        return grouped_vec_list, group_size
    
    def compute_temporal_decay_vector(self, user_id: str) -> Optional[np.ndarray]:
        """
        Compute temporal decay vector for a single user
        This is the core of TIFU representation
        """
        if not self.data_history or user_id not in self.data_history:
            return None
        
        vec_list = self.data_history[user_id]
        if len(vec_list) < 3:  # user_id + at least 2 baskets
            return None
        
        num_vec = len(vec_list) - 2
        his_list = []
        
        # Create temporal decay vectors for each basket
        for idx in range(1, num_vec + 1):
            his_vec = np.zeros(self.item_count)
            decayed_val = np.power(WITHIN_DECAY_RATE, num_vec - idx)
            for item in vec_list[idx]:
                if item < self.item_count:
                    his_vec[item] = decayed_val
            his_list.append(his_vec)
        
        # Group the vectors
        grouped_list, real_group_size = self.group_history_list(his_list, GROUP_SIZE)
        
        # Apply group decay
        final_vec = np.zeros(self.item_count)
        for idx in range(real_group_size):
            decayed_val = np.power(GROUP_DECAY_RATE, GROUP_SIZE - 1 - idx)
            if idx < len(grouped_list):
                final_vec += grouped_list[idx] * decayed_val
        
        return final_vec / real_group_size
    
    def save_user_vector(self, user_id: str, vector: np.ndarray):
        """Save a user's vector to disk"""
        VECTORS_PATH.mkdir(parents=True, exist_ok=True)
        vector_path = VECTORS_PATH / f'user_{user_id}.pkl'
        with open(vector_path, 'wb') as f:
            pickle.dump(vector, f)
    
    def load_user_vector(self, user_id: str) -> Optional[np.ndarray]:
        """Load a user's vector from disk"""
        vector_path = VECTORS_PATH / f'user_{user_id}.pkl'
        if vector_path.exists():
            with open(vector_path, 'rb') as f:
                return pickle.load(f)
        return None
    
    def find_nearest_neighbors(self, query_vector: np.ndarray, 
                             sample_size: int = None) -> Tuple[np.ndarray, np.ndarray]:
        """
        Find K nearest neighbors using random sampling strategy
        Returns indices and distances of nearest neighbors
        """
        if sample_size is None:
            sample_size = KNN_NEIGHBOR_LOADING_SAMPLE
        
        # Get all available users (from training set)
        all_users = self.keyset.get('train', [])
        
        # Random sample if we have more users than sample size
        if len(all_users) > sample_size:
            sampled_users = random.sample(all_users, sample_size)
        else:
            sampled_users = all_users
        
        # Load vectors for sampled users
        neighbor_vectors = []
        valid_users = []
        
        for user_id in sampled_users:
            vector = self.load_user_vector(user_id)
            if vector is not None:
                neighbor_vectors.append(vector)
                valid_users.append(user_id)
        
        if not neighbor_vectors:
            return np.array([]), np.array([])
        
        # Convert to numpy array
        neighbor_matrix = np.array(neighbor_vectors)
        
        # Find nearest neighbors
        k = min(KNN_K, len(neighbor_vectors))
        nbrs = NearestNeighbors(n_neighbors=k, algorithm='brute').fit(neighbor_matrix)
        distances, indices = nbrs.kneighbors([query_vector])
        
        # Map indices back to user IDs
        neighbor_user_ids = [valid_users[idx] for idx in indices[0]]
        
        return np.array(neighbor_user_ids), distances[0]
    
    def merge_histories(self, user_vector: np.ndarray, 
                       neighbor_ids: np.ndarray) -> List[int]:
        """
        Merge user's own history with neighbors' histories
        Returns top-k predicted items
        """
        # Initialize with user's own vector weighted by alpha
        merged_vector = user_vector * ALPHA
        
        # Add neighbors' vectors weighted by (1 - alpha)
        neighbor_weight = (1 - ALPHA) / len(neighbor_ids) if neighbor_ids.size > 0 else 0
        
        for neighbor_id in neighbor_ids:
            neighbor_vector = self.load_user_vector(str(neighbor_id))
            if neighbor_vector is not None:
                merged_vector += neighbor_vector * neighbor_weight
        
        # Get top-k items
        top_items = merged_vector.argsort()[::-1][:TOPK].tolist()
        
        return top_items
    
    def predict_basket(self, user_id: str, use_csv_data: bool = False) -> Dict:
        """
        Generate basket prediction for a user
        
        Args:
            user_id: User ID (either from DB or Instacart)
            use_csv_data: If True, compute vector on-the-fly from CSV data
        
        Returns:
            Dictionary with predicted items and metadata
        """
        # Check if user has sufficient history
        if user_id not in self.data_history:
            return {
                'success': False,
                'error': 'User not found in data',
                'items': []
            }
        
        user_baskets = self.data_history.get(user_id, [])
        if len(user_baskets) < 3:  # user_id + at least 2 baskets
            return {
                'success': False,
                'error': 'Insufficient purchase history (minimum 3 orders required)',
                'items': []
            }
        
        # Get or compute user vector
        if use_csv_data:
            # Compute on-the-fly for demo/testing
            user_vector = self.compute_temporal_decay_vector(user_id)
        else:
            # Load pre-computed vector for regular users
            user_vector = self.load_user_vector(user_id)
            if user_vector is None:
                # Fallback: compute if not found
                user_vector = self.compute_temporal_decay_vector(user_id)
                if user_vector is not None:
                    self.save_user_vector(user_id, user_vector)
        
        if user_vector is None:
            return {
                'success': False,
                'error': 'Failed to compute user vector',
                'items': []
            }
        
        # Find nearest neighbors
        neighbor_ids, distances = self.find_nearest_neighbors(user_vector)
        
        if neighbor_ids.size == 0:
            return {
                'success': False,
                'error': 'No similar users found',
                'items': []
            }
        
        # Generate prediction
        predicted_items = self.merge_histories(user_vector, neighbor_ids)
        
        return {
            'success': True,
            'items': predicted_items,
            'metadata': {
                'num_neighbors': len(neighbor_ids),
                'algorithm': 'TIFU-KNN',
                'parameters': {
                    'k': KNN_K,
                    'alpha': ALPHA,
                    'within_decay': WITHIN_DECAY_RATE,
                    'group_decay': GROUP_DECAY_RATE
                }
            }
        }
    
    def precompute_all_vectors(self):
        """
        Pre-compute vectors for all users in the dataset
        Used during initialization phase
        """
        if not self.data_history:
            print("No data history loaded")
            return
        
        print(f"Pre-computing vectors for {len(self.data_history)} users...")
        computed = 0
        skipped = 0
        
        for user_id in self.data_history:
            vector = self.compute_temporal_decay_vector(user_id)
            if vector is not None:
                self.save_user_vector(user_id, vector)
                computed += 1
            else:
                skipped += 1
            
            if (computed + skipped) % 1000 == 0:
                print(f"Progress: {computed + skipped}/{len(self.data_history)} users processed")
        
        print(f"Pre-computation complete: {computed} vectors saved, {skipped} users skipped")


# Singleton instance
_engine_instance = None

def get_engine() -> TifuKnnEngine:
    """Get or create the singleton engine instance"""
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = TifuKnnEngine()
    return _engine_instance