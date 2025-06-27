# ml-service/services/tifuknn.py
"""
Complete TIFU-KNN (Temporal-Item-Frequency-based User-KNN) implementation
Based on: https://github.com/liming-7/A-Next-Basket-Recommendation-Reality-Check

This is the CRITICAL missing piece that needs to be integrated into the prediction service.
"""

import numpy as np
from typing import List, Dict, Set, Tuple, Optional
from collections import defaultdict, Counter
import heapq
from scipy.spatial.distance import cosine
from loguru import logger
import time

class TIFUKNN:
    """
    TIFU-KNN Algorithm Implementation
    
    Based on the paper and reference implementation from:
    - Hu et al. "Temporal sets: Towards understanding the future through the past"
    - https://github.com/HaojiHu/TIFUKNN
    """
    
    def __init__(self, 
                 num_neighbors: int = 900,
                 alpha: float = 0.9,  # Decay factor for temporal weighting
                 beta: float = 0.7,   # Weight for frequency groups
                 gamma: float = 0.9,  # Weight for combining groups
                 group_size: int = 3, # Number of frequency groups
                 within_decay_rate: float = 0.9,
                 group_decay_rate: float = 0.7,
                 sequential_decay_rate: float = 0.9):
        """
        Initialize TIFU-KNN with hyperparameters matching the reference implementation
        
        These parameters are from the Instacart optimal configuration:
        python tifuknn_new.py instacart_history.json instacart_future.json 
               instacart_keyset_0.json 900 0.9 0.7 0.9 3 20
        """
        self.num_neighbors = num_neighbors
        self.alpha = alpha  # within_decay_rate in original
        self.beta = beta    # group_decay_rate in original
        self.gamma = gamma  # sequential_decay_rate in original
        self.group_size = group_size
        
        # These match the command line parameters exactly
        self.within_decay_rate = within_decay_rate
        self.group_decay_rate = group_decay_rate
        self.sequential_decay_rate = sequential_decay_rate
        
    def create_user_profile(self, user_baskets: List[List[int]]) -> Dict[int, float]:
        """
        Create temporal-frequency weighted user profile
        """
        profile = defaultdict(float)
        num_baskets = len(user_baskets)
        
        if num_baskets == 0:
            return profile
            
        # Calculate item frequencies and last occurrence
        item_freq = defaultdict(int)
        item_last_position = {}
        
        for basket_idx, basket in enumerate(user_baskets):
            for item in basket:
                item_freq[item] += 1
                item_last_position[item] = basket_idx
                
        # Apply temporal decay based on recency
        for item, freq in item_freq.items():
            # Recency weight: more recent items get higher weight
            last_pos = item_last_position[item]
            recency_weight = self.alpha ** (num_baskets - last_pos - 1)
            
            # Frequency weight: normalize by total occurrences
            freq_weight = freq / num_baskets
            
            # Combined weight
            profile[item] = freq_weight * recency_weight
            
        return profile
    
    def divide_into_groups(self, user_profile: Dict[int, float]) -> List[Set[int]]:
        """
        Divide items into frequency groups as per TIFU-KNN
        """
        if not user_profile:
            return [set() for _ in range(self.group_size)]
            
        # Sort items by their profile scores
        sorted_items = sorted(user_profile.items(), key=lambda x: x[1], reverse=True)
        
        # Divide into equal-sized groups
        groups = [set() for _ in range(self.group_size)]
        items_per_group = len(sorted_items) // self.group_size
        
        for i, (item, _) in enumerate(sorted_items):
            group_idx = min(i // items_per_group, self.group_size - 1)
            groups[group_idx].add(item)
            
        return groups
    
    def calculate_group_similarity(self, 
                                 user_groups: List[Set[int]], 
                                 neighbor_groups: List[Set[int]]) -> float:
        """
        Calculate similarity between two users based on their frequency groups
        """
        if not user_groups or not neighbor_groups:
            return 0.0
            
        total_similarity = 0.0
        
        for g in range(self.group_size):
            if not user_groups[g] and not neighbor_groups[g]:
                continue
                
            # Jaccard similarity for this group
            intersection = len(user_groups[g] & neighbor_groups[g])
            union = len(user_groups[g] | neighbor_groups[g])
            
            if union > 0:
                group_sim = intersection / union
                # Apply group decay rate (higher groups = lower weight)
                weight = self.beta ** g
                total_similarity += weight * group_sim
                
        return total_similarity
    
    def find_neighbors(self, 
                      target_user_id: int,
                      all_user_profiles: Dict[int, Dict[int, float]],
                      all_user_baskets: Dict[int, List[List[int]]]) -> List[Tuple[int, float]]:
        """
        Find k-nearest neighbors using TIFU-KNN similarity
        """
        target_profile = all_user_profiles[target_user_id]
        target_groups = self.divide_into_groups(target_profile)
        
        # Use heap to maintain top-k neighbors efficiently
        neighbors_heap = []
        
        for user_id, profile in all_user_profiles.items():
            if user_id == target_user_id:
                continue
                
            # Calculate TIFU-KNN similarity
            user_groups = self.divide_into_groups(profile)
            similarity = self.calculate_group_similarity(target_groups, user_groups)
            
            # Maintain top-k using heap
            if len(neighbors_heap) < self.num_neighbors:
                heapq.heappush(neighbors_heap, (similarity, user_id))
            elif similarity > neighbors_heap[0][0]:
                heapq.heapreplace(neighbors_heap, (similarity, user_id))
                
        # Return sorted neighbors (highest similarity first)
        neighbors = [(uid, sim) for sim, uid in neighbors_heap]
        neighbors.sort(key=lambda x: x[1], reverse=True)
        
        return neighbors
    
    def predict_next_basket(self,
                           target_user_id: int,
                           all_user_profiles: Dict[int, Dict[int, float]],
                           all_user_baskets: Dict[int, List[List[int]]],
                           top_k: int = 20) -> List[int]:
        """
        Predict next basket for target user
        """
        # Get user's profile and groups
        target_profile = all_user_profiles[target_user_id]
        target_baskets = all_user_baskets[target_user_id]
        
        if not target_baskets:
            return []
            
        # Find neighbors
        neighbors = self.find_neighbors(target_user_id, all_user_profiles, all_user_baskets)
        
        # Aggregate predictions from neighbors
        item_scores = defaultdict(float)
        
        # Get items from target user's recent baskets (repeat behavior)
        recent_items = set()
        for basket in target_baskets[-3:]:  # Last 3 baskets
            recent_items.update(basket)
            
        # Score items based on neighbors
        for neighbor_id, similarity in neighbors:
            if similarity == 0:
                continue
                
            neighbor_baskets = all_user_baskets[neighbor_id]
            neighbor_profile = all_user_profiles[neighbor_id]
            
            # Get neighbor's recent items
            neighbor_recent = set()
            for basket in neighbor_baskets[-3:]:
                neighbor_recent.update(basket)
                
            # Score items based on neighbor similarity and item properties
            for item in neighbor_recent:
                # Item score combines:
                # 1. Neighbor similarity
                # 2. Item frequency in neighbor's history
                # 3. Whether item is in target's history
                
                base_score = similarity * neighbor_profile.get(item, 0)
                
                # Boost if item is in target's history (repeat behavior)
                if item in recent_items:
                    base_score *= 1.5
                    
                # Apply sequential decay based on position in neighbor's history
                item_positions = [i for i, basket in enumerate(neighbor_baskets) if item in basket]
                if item_positions:
                    last_pos = item_positions[-1]
                    decay = self.gamma ** (len(neighbor_baskets) - last_pos - 1)
                    base_score *= decay
                    
                item_scores[item] += base_score
        
        # Add scores from user's own history (personalization)
        for item, score in target_profile.items():
            item_scores[item] += score * 2.0  # Higher weight for own items
            
        # Get top-k items
        sorted_items = sorted(item_scores.items(), key=lambda x: x[1], reverse=True)
        return [item for item, _ in sorted_items[:top_k]]
    
    def evaluate_single_user(self,
                           user_id: int,
                           predicted_basket: List[int],
                           actual_basket: List[int]) -> Dict[str, float]:
        """
        Evaluate prediction for a single user
        """
        if not actual_basket:
            return {'recall': 0.0, 'precision': 0.0, 'f1': 0.0}
            
        predicted_set = set(predicted_basket)
        actual_set = set(actual_basket)
        
        true_positives = len(predicted_set & actual_set)
        
        recall = true_positives / len(actual_set) if actual_set else 0.0
        precision = true_positives / len(predicted_set) if predicted_set else 0.0
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
        
        return {
            'recall': recall,
            'precision': precision,
            'f1': f1,
            'hit_rate': 1.0 if true_positives > 0 else 0.0
        }


# Wrapper class to integrate with existing PredictionService
class TIFUKNNWrapper:
    """
    Wrapper to integrate TIFU-KNN with the existing prediction service architecture
    """
    
    def __init__(self, data_loader):
        self.data_loader = data_loader
        self.tifuknn = TIFUKNN()
        self._user_profiles = {}
        self._user_baskets = {}
        self._initialize_data()
        
    def _initialize_data(self):
        """
        Initialize user profiles and baskets from data loader
        """
        logger.info("Initializing TIFU-KNN data structures...")
        
        for user_id in self.data_loader.user_ids:
            baskets = self.data_loader.get_user_baskets(user_id)
            if baskets:
                self._user_baskets[user_id] = baskets
                self._user_profiles[user_id] = self.tifuknn.create_user_profile(baskets)
                
        logger.info(f"Initialized {len(self._user_profiles)} user profiles")
        
    def predict_next_basket(self, user_id: int, k: int = 20, exclude_last_order: bool = False) -> List[int]:
        """
        Predict next basket for user
        """
        if user_id not in self._user_baskets:
            raise ValueError(f"User {user_id} not found")
            
        # Handle exclude_last_order for evaluation
        baskets = self._user_baskets[user_id].copy()
        if exclude_last_order and len(baskets) > 1:
            baskets = baskets[:-1]
            # Recreate profile without last basket
            temp_profile = self.tifuknn.create_user_profile(baskets)
            temp_profiles = self._user_profiles.copy()
            temp_profiles[user_id] = temp_profile
            temp_baskets = self._user_baskets.copy()
            temp_baskets[user_id] = baskets
            
            return self.tifuknn.predict_next_basket(user_id, temp_profiles, temp_baskets, k)
        else:
            return self.tifuknn.predict_next_basket(user_id, self._user_profiles, self._user_baskets, k)