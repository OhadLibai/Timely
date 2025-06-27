# ml-service/services/prediction.py
import numpy as np
from typing import List, Dict, Set, Tuple, Optional
from collections import defaultdict, Counter
from loguru import logger
import time

class PredictionService:
    """
    TIFU-KNN (Temporal-Item-Frequency-based User-KNN) implementation
    for next basket recommendation
    """
    
    def __init__(self, data_loader):
        self.data_loader = data_loader
        
        # TIFU-KNN hyperparameters (from reference implementation)
        self.num_neighbors = 900  # Number of candidate neighbors
        self.alpha = 0.9  # Decay factor for temporal weighting
        self.beta = 0.7   # Weight for frequency groups
        self.gamma = 0.9  # Weight for combining groups
        self.group_size = 3  # Number of frequency groups
        
        # Precompute user features for efficiency
        self._precompute_user_features()
        
    def _precompute_user_features(self):
        """Precompute user features for faster neighbor search"""
        logger.info("Precomputing user features...")
        start_time = time.time()
        
        self.user_item_frequencies = {}
        self.user_item_recency = {}
        self.item_popularity = defaultdict(int)
        
        # Compute item frequencies and recency for each user
        for user_id in self.data_loader.user_ids:
            baskets = self.data_loader.get_user_baskets(user_id)
            if not baskets:
                continue
            
            # Item frequency counting
            item_freq = defaultdict(int)
            item_last_position = {}
            
            for basket_idx, basket in enumerate(baskets):
                for item in basket:
                    item_freq[item] += 1
                    item_last_position[item] = basket_idx
                    self.item_popularity[item] += 1
            
            # Normalize frequencies
            total_items = sum(item_freq.values())
            if total_items > 0:
                item_freq = {k: v/total_items for k, v in item_freq.items()}
            
            # Calculate recency weights (more recent = higher weight)
            num_baskets = len(baskets)
            item_recency = {}
            for item, last_pos in item_last_position.items():
                # Exponential decay based on position
                recency_weight = self.alpha ** (num_baskets - last_pos - 1)
                item_recency[item] = recency_weight
            
            self.user_item_frequencies[user_id] = item_freq
            self.user_item_recency[user_id] = item_recency
        
        # Normalize item popularity
        total_purchases = sum(self.item_popularity.values())
        if total_purchases > 0:
            self.item_popularity = {
                k: v/total_purchases 
                for k, v in self.item_popularity.items()
            }
        
        logger.info(f"Feature precomputation completed in {time.time() - start_time:.2f}s")
    
    def predict_next_basket(self, user_id: int, k: int = 20, 
                          exclude_last_order: bool = False) -> List[int]:
        """
        Predict next basket for a user using TIFU-KNN algorithm
        
        Args:
            user_id: User ID to predict for
            k: Number of items to recommend
            exclude_last_order: Whether to exclude last order (for evaluation)
        
        Returns:
            List of recommended product IDs
        """
        baskets = self.data_loader.get_user_baskets(user_id)
        
        if not baskets:
            # Cold start: return popular items
            return self._get_popular_items(k)
        
        # Exclude last order if requested (for evaluation)
        if exclude_last_order and len(baskets) > 1:
            baskets = baskets[:-1]
        
        # Get user's item frequencies and recency
        user_freq = self._compute_user_frequencies(baskets)
        user_items = set(item for basket in baskets for item in basket)
        
        # Divide items into frequency groups
        item_groups = self._divide_into_frequency_groups(user_freq)
        
        # Find neighbors for each group
        group_neighbors = {}
        for group_id, group_items in item_groups.items():
            if group_items:
                neighbors = self._find_group_neighbors(
                    user_id, group_items, baskets
                )
                group_neighbors[group_id] = neighbors
        
        # Generate recommendations for each group
        group_recommendations = {}
        for group_id, neighbors in group_neighbors.items():
            recs = self._generate_group_recommendations(
                neighbors, user_items, k
            )
            group_recommendations[group_id] = recs
        
        # Combine recommendations from all groups
        final_recommendations = self._combine_group_recommendations(
            group_recommendations, item_groups, k
        )
        
        return final_recommendations
    
    def _compute_user_frequencies(self, baskets: List[List[int]]) -> Dict[int, float]:
        """Compute item frequencies for a user"""
        item_counts = defaultdict(int)
        
        for basket in baskets:
            for item in basket:
                item_counts[item] += 1
        
        # Normalize by total items
        total = sum(item_counts.values())
        if total > 0:
            return {k: v/total for k, v in item_counts.items()}
        return {}
    
    def _divide_into_frequency_groups(self, 
                                    user_freq: Dict[int, float]) -> Dict[int, Set[int]]:
        """
        Divide items into frequency groups (high, medium, low frequency)
        """
        if not user_freq:
            return {i: set() for i in range(self.group_size)}
        
        # Sort items by frequency
        sorted_items = sorted(user_freq.items(), key=lambda x: x[1], reverse=True)
        
        # Divide into equal groups
        items_per_group = len(sorted_items) // self.group_size
        groups = defaultdict(set)
        
        for i, (item, freq) in enumerate(sorted_items):
            group_id = min(i // items_per_group, self.group_size - 1)
            groups[group_id].add(item)
        
        return dict(groups)
    
    def _find_group_neighbors(self, user_id: int, group_items: Set[int], 
                            user_baskets: List[List[int]]) -> List[Tuple[int, float]]:
        """
        Find similar users based on items in a specific frequency group
        """
        neighbors = []
        
        # Create user profile for this group
        user_profile = set(group_items)
        
        # Compare with other users
        for other_user_id in self.data_loader.user_ids:
            if other_user_id == user_id:
                continue
            
            other_baskets = self.data_loader.get_user_baskets(other_user_id)
            if not other_baskets:
                continue
            
            # Get other user's items
            other_items = set(item for basket in other_baskets for item in basket)
            
            # Calculate similarity based on group items
            common_items = user_profile.intersection(other_items)
            if not common_items:
                continue
            
            # Calculate weighted Jaccard similarity
            similarity = len(common_items) / len(user_profile.union(other_items))
            
            # Apply temporal weighting
            temporal_weight = self._calculate_temporal_weight(
                user_baskets, other_baskets
            )
            
            final_similarity = similarity * temporal_weight
            
            if final_similarity > 0:
                neighbors.append((other_user_id, final_similarity))
        
        # Sort by similarity and return top neighbors
        neighbors.sort(key=lambda x: x[1], reverse=True)
        return neighbors[:self.num_neighbors]
    
    def _calculate_temporal_weight(self, baskets1: List[List[int]], 
                                 baskets2: List[List[int]]) -> float:
        """
        Calculate temporal weight between two users based on 
        purchase patterns similarity
        """
        # Simple temporal weight based on basket count similarity
        count_diff = abs(len(baskets1) - len(baskets2))
        max_count = max(len(baskets1), len(baskets2))
        
        if max_count > 0:
            return 1.0 - (count_diff / max_count) * (1 - self.beta)
        return 1.0
    
    def _generate_group_recommendations(self, neighbors: List[Tuple[int, float]], 
                                      user_items: Set[int], k: int) -> List[Tuple[int, float]]:
        """
        Generate recommendations from a group of neighbors
        """
        item_scores = defaultdict(float)
        
        for neighbor_id, similarity in neighbors:
            neighbor_baskets = self.data_loader.get_user_baskets(neighbor_id)
            
            # Get items from neighbor's recent baskets
            recent_items = []
            for basket in neighbor_baskets[-3:]:  # Focus on recent baskets
                recent_items.extend(basket)
            
            # Score items based on frequency and similarity
            item_counts = Counter(recent_items)
            for item, count in item_counts.items():
                if item not in user_items:  # Only recommend new items
                    # Score = similarity * item_frequency * recency
                    score = similarity * (count / len(recent_items))
                    item_scores[item] += score
        
        # Sort by score
        recommendations = sorted(item_scores.items(), key=lambda x: x[1], reverse=True)
        return recommendations[:k]
    
    def _combine_group_recommendations(self, 
                                     group_recs: Dict[int, List[Tuple[int, float]]],
                                     item_groups: Dict[int, Set[int]], 
                                     k: int) -> List[int]:
        """
        Combine recommendations from different frequency groups
        """
        # Weight recommendations by group importance
        # Higher frequency groups get higher weight
        group_weights = {
            0: 1.0,    # High frequency group
            1: 0.8,    # Medium frequency group
            2: 0.6     # Low frequency group
        }
        
        combined_scores = defaultdict(float)
        
        for group_id, recommendations in group_recs.items():
            weight = group_weights.get(group_id, 0.5) * self.gamma
            
            for item, score in recommendations:
                combined_scores[item] += score * weight
        
        # Add some popular items if not enough recommendations
        if len(combined_scores) < k:
            popular_items = self._get_popular_items(k * 2)
            for item in popular_items:
                if item not in combined_scores:
                    # Small score for popular items
                    combined_scores[item] = 0.1
        
        # Sort and return top k items
        sorted_items = sorted(combined_scores.items(), key=lambda x: x[1], reverse=True)
        return [item for item, score in sorted_items[:k]]
    
    def _get_popular_items(self, k: int) -> List[int]:
        """Get most popular items across all users"""
        sorted_items = sorted(self.item_popularity.items(), 
                            key=lambda x: x[1], reverse=True)
        return [item for item, pop in sorted_items[:k]]