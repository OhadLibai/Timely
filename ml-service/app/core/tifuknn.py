# ml-service/services/tifuknn_complete.py
"""
Complete TIFU-KNN implementation matching the reference repository
Based on: https://github.com/liming-7/A-Next-Basket-Recommendation-Reality-Check
"""

import os
from dotenv import load_dotenv
from pathlib import Path
import json
import numpy as np
from typing import List, Dict, Set, Tuple, Optional, Any
from collections import defaultdict, Counter
import heapq
from scipy.spatial.distance import cosine
from loguru import logger
import time
import random
from app.config import config
from app.core.generators import EvaluationSetsGenerator

# Load root .env
root_dir = Path(__file__).parent.parent.parent.parent
load_dotenv(root_dir / '.env')

class TIFUKNNComplete:
    """
    Complete TIFU-KNN (Temporal-Item-Frequency-based User-KNN) implementation
    
    This implementation matches the reference from:
    - Paper: "Temporal sets: Towards understanding the future through the past"
    - Repository: https://github.com/liming-7/A-Next-Basket-Recommendation-Reality-Check
    - Original: https://github.com/HaojiHu/TIFUKNN
    """
    
    def __init__(self):
        # Hyperparameters from config
        self.num_neighbors = config.TIFUKNN_CONFIG["num_neighbors"]
        self.within_decay_rate = config.TIFUKNN_CONFIG["within_decay_rate"]
        self.group_decay_rate = config.TIFUKNN_CONFIG["group_decay_rate"]
        self.sequential_decay_rate = config.TIFUKNN_CONFIG["sequential_decay_rate"]
        self.group_size = config.TIFUKNN_CONFIG["group_size"]
        self.top_k = config.TIFUKNN_CONFIG["top_k"]
        
        # Data storage
        self.history = {}
        self.future = {}
        self.keyset = []
        self.all_items = set()
        self.user_profiles = {}
        self.evaluation_generator = EvaluationSetsGenerator()
        
        logger.info(f"Initialized TIFU-KNN with parameters: "
                   f"neighbors={self.num_neighbors}, "
                   f"α={self.within_decay_rate}, "
                   f"β={self.group_decay_rate}, "
                   f"γ={self.sequential_decay_rate}, "
                   f"groups={self.group_size}")
    
    def load_data(self, history_file: str, future_file: str, keyset_file: Optional[str] = None):
        """Load data from JSON files matching reference format"""
        try:
            # Load history
            with open(history_file, 'r') as f:
                self.history = json.load(f)
            logger.info(f"Loaded history for {len(self.history)} users")
            
            # Load future baskets
            with open(future_file, 'r') as f:
                self.future = json.load(f)
            logger.info(f"Loaded future baskets for {len(self.future)} users")
            
            # Load keyset or use all users
            if keyset_file:
                with open(keyset_file, 'r') as f:
                    self.keyset = json.load(f)
            else:
                self.keyset = list(self.history.keys())
            logger.info(f"Using keyset with {len(self.keyset)} users")
            
            # Build item universe
            self._build_item_universe()
            
            # Pre-compute user profiles
            self._build_user_profiles()
            
        except Exception as e:
            logger.error(f"Error loading data: {e}")
            raise
    
    def _build_item_universe(self):
        """Build the set of all items in the dataset"""
        self.all_items = set()
        
        for user_baskets in self.history.values():
            for basket in user_baskets:
                self.all_items.update(basket)
        
        for basket in self.future.values():
            self.all_items.update(basket)
            
        logger.info(f"Built item universe with {len(self.all_items)} unique items")
    
    def _build_user_profiles(self):
        """Pre-compute user profiles for all users"""
        logger.info("Building user profiles...")
        
        for user_id, baskets in self.history.items():
            self.user_profiles[user_id] = self._create_user_profile(baskets)
            
        logger.info(f"Built profiles for {len(self.user_profiles)} users")
    
    def _create_user_profile(self, baskets: List[List[int]]) -> Dict[int, float]:
        """
        Create temporal-frequency weighted user profile
        This is the core of TIFU-KNN's temporal modeling
        """
        profile = defaultdict(float)
        num_baskets = len(baskets)
        
        if num_baskets == 0:
            return profile
        
        # Calculate item frequencies and temporal weights
        for basket_idx, basket in enumerate(baskets):
            # Temporal weight decreases for older baskets
            temporal_weight = self.sequential_decay_rate ** (num_baskets - basket_idx - 1)
            
            for item in basket:
                # Frequency component
                profile[item] += temporal_weight
        
        # Normalize by number of baskets
        for item in profile:
            profile[item] /= num_baskets
            
        return dict(profile)
    
    def _calculate_item_frequencies(self, baskets: List[List[int]]) -> Dict[int, int]:
        """Calculate raw item frequencies across all baskets"""
        freq = defaultdict(int)
        for basket in baskets:
            for item in basket:
                freq[item] += 1
        return dict(freq)
    
    def _create_frequency_groups(self, item_freq: Dict[int, int]) -> Dict[int, Set[int]]:
        """
        Divide items into frequency groups
        Group 0: High frequency items
        Group 1: Medium frequency items  
        Group 2: Low frequency items
        """
        if not item_freq:
            return {i: set() for i in range(self.group_size)}
        
        # Sort items by frequency
        sorted_items = sorted(item_freq.items(), key=lambda x: x[1], reverse=True)
        
        # Divide into equal groups
        groups = {i: set() for i in range(self.group_size)}
        items_per_group = len(sorted_items) // self.group_size
        
        for i, (item, _) in enumerate(sorted_items):
            group_id = min(i // items_per_group, self.group_size - 1)
            groups[group_id].add(item)
            
        return groups
    
    def _calculate_group_similarity(self, 
                                   target_profile: Dict[int, float],
                                   neighbor_profile: Dict[int, float],
                                   group_items: Set[int]) -> float:
        """
        Calculate similarity between users for a specific frequency group
        Uses cosine similarity on the subset of items in the group
        """
        if not group_items:
            return 0.0
        
        # Filter profiles to only include items in this group
        target_vec = [target_profile.get(item, 0) for item in group_items]
        neighbor_vec = [neighbor_profile.get(item, 0) for item in group_items]
        
        # Handle edge case where vectors are all zeros
        if not any(target_vec) or not any(neighbor_vec):
            return 0.0
        
        # Calculate cosine similarity
        try:
            similarity = 1.0 - cosine(target_vec, neighbor_vec)
        except:
            similarity = 0.0
            
        return max(0.0, similarity)
    
    def _find_knn_for_group(self,
                           target_user: str,
                           target_profile: Dict[int, float],
                           group_items: Set[int],
                           k: Optional[int] = None) -> List[Tuple[str, float]]:
        """
        Find k nearest neighbors for a specific frequency group
        Returns list of (user_id, similarity) tuples
        """
        if k is None:
            k = self.num_neighbors
            
        # Calculate similarities with all other users
        similarities = []
        
        for user_id, neighbor_profile in self.user_profiles.items():
            if user_id == target_user:
                continue
                
            sim = self._calculate_group_similarity(
                target_profile, neighbor_profile, group_items
            )
            
            if sim > 0:
                similarities.append((user_id, sim))
        
        # Sort by similarity and return top-k
        similarities.sort(key=lambda x: x[1], reverse=True)
        return similarities[:k]
    
    def _aggregate_group_predictions(self,
                                   target_baskets: List[List[int]],
                                   group_neighbors: Dict[int, List[Tuple[str, float]]]) -> Dict[int, float]:
        """
        Aggregate predictions from all frequency groups
        This is where TIFU-KNN combines temporal, frequency, and collaborative signals
        """
        item_scores = defaultdict(float)
        
        # Get target user's recent items for repeat behavior modeling
        recent_items = set()
        if target_baskets:
            # Weight recent baskets more heavily
            for i, basket in enumerate(target_baskets[-3:]):  # Last 3 baskets
                recent_items.update(basket)
        
        # Process each frequency group
        for group_id, neighbors in group_neighbors.items():
            # Group weight decreases for lower frequency groups
            group_weight = self.group_decay_rate ** group_id
            
            # Aggregate scores from neighbors in this group
            for neighbor_id, similarity in neighbors:
                neighbor_baskets = self.history.get(neighbor_id, [])
                if not neighbor_baskets:
                    continue
                
                # Get items from neighbor's recent baskets
                for basket_idx, basket in enumerate(neighbor_baskets):
                    # Temporal decay for neighbor's baskets
                    basket_weight = self.within_decay_rate ** (len(neighbor_baskets) - basket_idx - 1)
                    
                    for item in basket:
                        # Calculate item score
                        base_score = similarity * basket_weight * group_weight
                        
                        # Boost if item is in target's recent history
                        if item in recent_items:
                            base_score *= 1.2
                        
                        item_scores[item] += base_score
        
        return dict(item_scores)
    
    def predict_user(self, user_id: str, k: int = 20, exclude_last: bool = False) -> List[int]:
        """
        Generate next basket prediction for a user
        
        Args:
            user_id: User ID (string format as in JSON)
            k: Number of items to recommend
            exclude_last: Whether to exclude last basket (for evaluation)
        """
        if user_id not in self.history:
            logger.warning(f"User {user_id} not found in history")
            return []
        
        # Get user's baskets
        user_baskets = self.history[user_id].copy()
        
        if exclude_last and len(user_baskets) > 1:
            user_baskets = user_baskets[:-1]
        
        # Create user profile
        target_profile = self._create_user_profile(user_baskets)
        
        # Calculate item frequencies
        item_freq = self._calculate_item_frequencies(user_baskets)
        
        # Create frequency groups
        freq_groups = self._create_frequency_groups(item_freq)
        
        # Find neighbors for each group
        group_neighbors = {}
        for group_id, group_items in freq_groups.items():
            neighbors = self._find_knn_for_group(
                user_id, target_profile, group_items
            )
            group_neighbors[group_id] = neighbors
        
        # Aggregate predictions
        item_scores = self._aggregate_group_predictions(
            user_baskets, group_neighbors
        )
        
        # Add user's own frequent items (personalization)
        for item, freq in item_freq.items():
            if item in item_scores:
                # Boost existing score
                item_scores[item] *= (1 + freq / len(user_baskets))
            else:
                # Add with personal frequency weight
                item_scores[item] = (freq / len(user_baskets)) * 0.5
        
        # Sort and return top-k
        sorted_items = sorted(item_scores.items(), key=lambda x: x[1], reverse=True)
        return [item for item, _ in sorted_items[:k]]
    
    def predict_using_basket_data(self, 
                           user_baskets: List[List[int]], 
                           k: int = 20,
                           temporal_metadata: Optional[Dict] = None) -> List[int]:
        """
        Generate prediction directly from basket data (for database integration)
        
        Args:
            user_baskets: List of baskets (each basket is a list of product IDs)
            k: Number of items to recommend
            temporal_metadata: Optional temporal features for each basket
        """
        if not user_baskets:
            return []
        
        # Create profile from baskets
        profile = self._create_user_profile(user_baskets)
        
        # If we don't have full neighbor data, use frequency-based prediction
        item_freq = self._calculate_item_frequencies(user_baskets)
        
        # Apply temporal decay based on recency
        item_scores = {}
        num_baskets = len(user_baskets)
        
        for item, freq in item_freq.items():
            # Find last occurrence
            last_idx = -1
            for i in range(num_baskets - 1, -1, -1):
                if item in user_baskets[i]:
                    last_idx = i
                    break
            
            if last_idx >= 0:
                # Apply temporal decay
                recency_score = self.sequential_decay_rate ** (num_baskets - last_idx - 1)
                freq_score = freq / num_baskets
                
                # Combine scores
                item_scores[item] = recency_score * freq_score * 2.0
        
        # If temporal metadata provided, use it to identify patterns
        if temporal_metadata:
            # Analyze ordering patterns (e.g., weekly items)
            for order_id, metadata in temporal_metadata.items():
                days_since = metadata.get('days_since_prior', 0)
                if 5 <= days_since <= 9:  # Weekly pattern
                    # Boost items from orders with weekly pattern
                    if order_id in user_baskets:
                        basket_idx = list(temporal_metadata.keys()).index(order_id)
                        if basket_idx < len(user_baskets):
                            for item in user_baskets[basket_idx]:
                                if item in item_scores:
                                    item_scores[item] *= 1.1
        
        # Sort and return top-k
        sorted_items = sorted(item_scores.items(), key=lambda x: x[1], reverse=True)
        return [item for item, _ in sorted_items[:k]]
    
    def evaluate_single_user(self, user_id: str, k: int = 20) -> Dict[str, float]:
        """Evaluate prediction for a single user"""
        if user_id not in self.future:
            return {'recall': 0.0, 'precision': 0.0, 'f1': 0.0, 'hit_rate': 0.0}
        
        # Generate prediction (excluding last basket)
        predicted = self.predict_user(user_id, k=k, exclude_last=True)
        actual = self.future[user_id]
        
        if not actual:
            return {'recall': 0.0, 'precision': 0.0, 'f1': 0.0, 'hit_rate': 0.0}
        
        # Calculate metrics
        predicted_set = set(predicted)
        actual_set = set(actual)
        
        tp = len(predicted_set & actual_set)
        
        recall = tp / len(actual_set) if actual_set else 0.0
        precision = tp / len(predicted_set) if predicted_set else 0.0
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
        hit_rate = 1.0 if tp > 0 else 0.0
        
        return {
            'recall': recall,
            'precision': precision,
            'f1': f1,
            'hit_rate': hit_rate,
            'true_positives': tp,
            'predicted_size': len(predicted_set),
            'actual_size': len(actual_set)
        }
    
    def evaluate_all_users(self, sample_size: Optional[int] = None) -> Dict[str, Any]:
        """
        Evaluate model on all users or a sample
        Returns aggregate metrics matching reference implementation
        """
        logger.info(f"Starting evaluation on {sample_size or 'all'} users")
        start_time = time.time()
        
        # Get evaluation users
        eval_users = [u for u in self.keyset if u in self.future]
        
        if sample_size and sample_size < len(eval_users):
            eval_users = self.evaluation_generator.stratified_user_sampling(
                self.history, sample_size
            )
        
        logger.info(f"Evaluating on {len(eval_users)} users")
        
        # Collect individual metrics
        all_metrics = {
            'recall': [],
            'precision': [],
            'f1': [],
            'hit_rate': []
        }
        
        for i, user_id in enumerate(eval_users):
            if i % 1000 == 0:
                logger.info(f"Evaluated {i}/{len(eval_users)} users")
            
            user_metrics = self.evaluate_single_user(user_id)
            
            for metric in all_metrics:
                all_metrics[metric].append(user_metrics[metric])
        
        # Calculate aggregate metrics
        results = {}
        
        for metric, values in all_metrics.items():
            results[f'{metric}_mean'] = np.mean(values)
            results[f'{metric}_std'] = np.std(values)
        
        # Additional metrics
        results['users_evaluated'] = len(eval_users)
        results['evaluation_time'] = time.time() - start_time
        
        # Format for compatibility with UI
        results['recall@20'] = results['recall_mean']
        results['precision@20'] = results['precision_mean']
        results['f1@20'] = results['f1_mean']
        results['hit_rate@20'] = results['hit_rate_mean']
        
        logger.info(f"Evaluation complete: Recall@20={results['recall@20']:.3f}, "
                   f"Precision@20={results['precision@20']:.3f}, "
                   f"Hit Rate@20={results['hit_rate@20']:.3f}")
        
        return results


