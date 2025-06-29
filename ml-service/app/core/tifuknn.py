# ml-service/app/core/tifuknn.py
"""
CLEANED: Pure TIFUKNN Core Engine - Algorithmic Logic Only
Based on: https://github.com/liming-7/A-Next-Basket-Recommendation-Reality-Check
"""

import json
import numpy as np
from typing import List, Dict, Set, Tuple, Optional, Any
from collections import defaultdict, Counter
from scipy.spatial.distance import cosine
from loguru import logger
import time
from pathlib import Path

class TIFUKNNEngine:
    """
    PURE ALGORITHMIC ENGINE: TIFU-KNN (Temporal-Item-Frequency-based User-KNN)
    
    This class contains ONLY the core algorithmic logic:
    - Model fitting and neighbor computation
    - Primary prediction method: predict(user_id, k)
    - Core evaluation method: evaluate_prediction_quality()
    
    NO APPLICATION LOGIC - Pure reusable library
    """
    
    def __init__(self, 
                 num_neighbors: int = 900,
                 within_decay_rate: float = 0.9,
                 group_decay_rate: float = 0.7,
                 sequential_decay_rate: float = 0.9,
                 group_size: int = 3):
        """
        Initialize TIFU-KNN with hyperparameters matching reference implementation
        
        Args:
            num_neighbors: Number of neighbors to consider (default 900 for Instacart)
            within_decay_rate: Temporal decay within groups (α, default 0.9)
            group_decay_rate: Decay across frequency groups (β, default 0.7)
            sequential_decay_rate: Sequential basket decay (γ, default 0.9)
            group_size: Number of frequency groups (default 3)
        """
        # Core hyperparameters
        self.num_neighbors = num_neighbors
        self.within_decay_rate = within_decay_rate  # α
        self.group_decay_rate = group_decay_rate    # β
        self.sequential_decay_rate = sequential_decay_rate  # γ
        self.group_size = group_size
        
        # Model data storage
        self.history = {}  # {user_id: [[basket1], [basket2], ...]}
        self.future = {}   # {user_id: [next_basket]}
        self.keyset = []   # List of user IDs for evaluation
        self.all_items = set()
        self.user_profiles = {}  # Pre-computed temporal-frequency profiles
        self.item_universe = set()
        
        # Model state
        self._is_fitted = False
        
        logger.info(f"Initialized TIFU-KNN Engine: neighbors={num_neighbors}, "
                   f"α={within_decay_rate}, β={group_decay_rate}, "
                   f"γ={sequential_decay_rate}, groups={group_size}")
    
    def load_data(self, history_file: str, future_file: str, keyset_file: Optional[str] = None):
        """
        Load training data from JSON files (reference format)
        
        Args:
            history_file: Path to history baskets JSON
            future_file: Path to future baskets JSON  
            keyset_file: Optional path to evaluation keyset JSON
        """
        try:
            # Load history baskets
            with open(history_file, 'r') as f:
                self.history = json.load(f)
            logger.info(f"Loaded history for {len(self.history)} users")
            
            # Load future baskets
            with open(future_file, 'r') as f:
                self.future = json.load(f)
            logger.info(f"Loaded future baskets for {len(self.future)} users")
            
            # Load evaluation keyset
            if keyset_file and Path(keyset_file).exists():
                with open(keyset_file, 'r') as f:
                    self.keyset = json.load(f)
            else:
                self.keyset = list(self.history.keys())
            logger.info(f"Using keyset with {len(self.keyset)} users")
            
            # Build model structures
            self._build_item_universe()
            self._is_fitted = False
            
        except Exception as e:
            logger.error(f"Error loading data: {e}")
            raise
    
    def set_data(self, history: Dict[str, List[List[int]]], 
                 future: Dict[str, List[int]] = None, 
                 keyset: List[str] = None):
        """
        Set data directly (for programmatic use)
        
        Args:
            history: {user_id: [[basket1], [basket2], ...]}
            future: {user_id: [next_basket]} (optional, for evaluation)
            keyset: List of user IDs (optional, defaults to all users)
        """
        self.history = history
        self.future = future or {}
        self.keyset = keyset or list(history.keys())
        
        self._build_item_universe()
        self._is_fitted = False
        
        logger.info(f"Set data for {len(self.history)} users, "
                   f"{len(self.future)} with future baskets")
    
    def fit(self):
        """
        Fit the TIFU-KNN model by pre-computing user profiles
        This is the "offline training" phase
        """
        logger.info("Fitting TIFU-KNN model...")
        start_time = time.time()
        
        if not self.history:
            raise ValueError("No training data loaded. Call load_data() or set_data() first.")
        
        # Build user profiles for all users
        self.user_profiles = {}
        for user_id, baskets in self.history.items():
            self.user_profiles[user_id] = self._create_user_profile(baskets)
        
        self._is_fitted = True
        fit_time = time.time() - start_time
        
        logger.info(f"TIFU-KNN fitted in {fit_time:.2f}s with {len(self.user_profiles)} user profiles")
    
    def predict(self, user_id: str, k: int = 20, exclude_last: bool = False) -> List[int]:
        """
        PRIMARY PREDICTION METHOD: Generate next basket prediction
        
        Args:
            user_id: Target user ID (string)
            k: Number of items to recommend
            exclude_last: Exclude last basket (for evaluation)
            
        Returns:
            List of predicted item IDs, ranked by score
        """
        if not self._is_fitted:
            raise ValueError("Model not fitted. Call fit() first.")
            
        if user_id not in self.history:
            logger.warning(f"User {user_id} not found in training data")
            return []
        
        # Get user's basket history
        user_baskets = self.history[user_id].copy()
        
        if exclude_last and len(user_baskets) > 1:
            user_baskets = user_baskets[:-1]
        
        if not user_baskets:
            return []
        
        # Create target user profile
        target_profile = self._create_user_profile(user_baskets)
        
        # Calculate item frequencies for frequency grouping
        item_freq = self._calculate_item_frequencies(user_baskets)
        
        # Create frequency groups
        freq_groups = self._create_frequency_groups(item_freq)
        
        # Find neighbors for each frequency group
        group_neighbors = {}
        for group_id, group_items in freq_groups.items():
            neighbors = self._find_knn_for_group(
                user_id, target_profile, group_items
            )
            group_neighbors[group_id] = neighbors
        
        # Aggregate predictions from all groups
        item_scores = self._aggregate_group_predictions(
            user_baskets, group_neighbors
        )
        
        # Add personalization boost for user's frequent items
        for item, freq in item_freq.items():
            if item in item_scores:
                # Boost existing collaborative score with personal frequency
                personal_weight = freq / len(user_baskets)
                item_scores[item] *= (1 + personal_weight)
            else:
                # Add items that user likes but neighbors don't suggest
                item_scores[item] = (freq / len(user_baskets)) * 0.3
        
        # Sort by score and return top-k
        sorted_items = sorted(item_scores.items(), key=lambda x: x[1], reverse=True)
        return [item for item, _ in sorted_items[:k]]
    
    def predict_from_baskets(self, user_baskets: List[List[int]], 
                           k: int = 20, temporal_metadata: Optional[Dict] = None) -> List[int]:
        """
        Generate prediction directly from basket data (for non-fitted scenarios)
        
        Args:
            user_baskets: List of user's basket history
            k: Number of items to recommend
            temporal_metadata: Optional temporal features per basket
            
        Returns:
            List of predicted item IDs
        """
        if not user_baskets:
            return []
        
        # Use frequency-temporal approach when full collaborative data not available
        item_freq = self._calculate_item_frequencies(user_baskets)
        item_scores = {}
        num_baskets = len(user_baskets)
        
        # Apply TIFU-KNN temporal-frequency weighting
        for item, freq in item_freq.items():
            # Find last occurrence for recency
            last_idx = -1
            for i in range(num_baskets - 1, -1, -1):
                if item in user_baskets[i]:
                    last_idx = i
                    break
            
            if last_idx >= 0:
                # Apply sequential decay (γ parameter)
                recency_score = self.sequential_decay_rate ** (num_baskets - last_idx - 1)
                freq_score = freq / num_baskets
                
                # Combine temporal and frequency signals
                item_scores[item] = recency_score * freq_score * 2.0
        
        # Enhanced temporal pattern detection
        if temporal_metadata:
            self._apply_temporal_patterns(item_scores, user_baskets, temporal_metadata)
        
        # Sort and return top-k
        sorted_items = sorted(item_scores.items(), key=lambda x: x[1], reverse=True)
        return [item for item, _ in sorted_items[:k]]
    
    def evaluate_prediction_quality(self, user_id: str, k: int = 20) -> Dict[str, float]:
        """
        CORE EVALUATION METHOD: Evaluate prediction quality for single user
        
        Args:
            user_id: User to evaluate
            k: Number of items to predict
            
        Returns:
            Dictionary with recall, precision, f1, hit_rate
        """
        if user_id not in self.future:
            return {'recall': 0.0, 'precision': 0.0, 'f1': 0.0, 'hit_rate': 0.0}
        
        # Generate prediction (excluding last basket)
        predicted = self.predict(user_id, k=k, exclude_last=True)
        actual = self.future[user_id]
        
        if not actual:
            return {'recall': 0.0, 'precision': 0.0, 'f1': 0.0, 'hit_rate': 0.0}
        
        # Calculate standard NBR metrics
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
            'hit_rate': hit_rate
        }
    
    # ==================================================================================
    # PRIVATE METHODS: Core algorithmic implementation
    # ==================================================================================
    
    def _build_item_universe(self):
        """Build the universal set of all items"""
        self.all_items = set()
        
        for baskets in self.history.values():
            for basket in baskets:
                self.all_items.update(basket)
        
        for basket in self.future.values():
            self.all_items.update(basket)
        
        logger.info(f"Built item universe: {len(self.all_items)} unique items")
    
    def _create_user_profile(self, baskets: List[List[int]]) -> Dict[int, float]:
        """
        Create temporal-frequency weighted user profile (core TIFU-KNN logic)
        
        This implements the personalized item frequency (PIF) calculation
        with temporal decay as described in the TIFU-KNN paper
        """
        profile = defaultdict(float)
        num_baskets = len(baskets)
        
        if num_baskets == 0:
            return {}
        
        # Apply temporal weighting with sequential decay (γ parameter)
        for basket_idx, basket in enumerate(baskets):
            # More recent baskets get higher weights
            temporal_weight = self.sequential_decay_rate ** (num_baskets - basket_idx - 1)
            
            for item in basket:
                profile[item] += temporal_weight
        
        # Normalize by number of baskets to get average temporal frequency
        for item in profile:
            profile[item] /= num_baskets
        
        return dict(profile)
    
    def _calculate_item_frequencies(self, baskets: List[List[int]]) -> Dict[int, int]:
        """Calculate raw item frequencies"""
        freq = defaultdict(int)
        for basket in baskets:
            for item in basket:
                freq[item] += 1
        return dict(freq)
    
    def _create_frequency_groups(self, item_freq: Dict[int, int]) -> Dict[int, Set[int]]:
        """
        Divide items into frequency groups for group-based neighbor finding
        
        Following reference implementation: equal division by frequency rank
        """
        if not item_freq:
            return {i: set() for i in range(self.group_size)}
        
        # Sort items by frequency (high to low)
        sorted_items = sorted(item_freq.items(), key=lambda x: x[1], reverse=True)
        
        # Equal division into groups
        groups = {i: set() for i in range(self.group_size)}
        items_per_group = len(sorted_items) // self.group_size
        
        for i, (item, _) in enumerate(sorted_items):
            group_id = min(i // items_per_group, self.group_size - 1)
            groups[group_id].add(item)
        
        return groups
    
    def _calculate_group_similarity(self, target_profile: Dict[int, float],
                                   neighbor_profile: Dict[int, float],
                                   group_items: Set[int]) -> float:
        """
        Calculate cosine similarity between users for specific frequency group
        """
        if not group_items:
            return 0.0
        
        # Extract vectors for items in this group only
        target_vec = [target_profile.get(item, 0) for item in group_items]
        neighbor_vec = [neighbor_profile.get(item, 0) for item in group_items]
        
        # Handle zero vectors
        if not any(target_vec) or not any(neighbor_vec):
            return 0.0
        
        try:
            similarity = 1.0 - cosine(target_vec, neighbor_vec)
            return max(0.0, similarity)
        except:
            return 0.0
    
    def _find_knn_for_group(self, target_user: str, target_profile: Dict[int, float],
                           group_items: Set[int], k: Optional[int] = None) -> List[Tuple[str, float]]:
        """
        Find k nearest neighbors for specific frequency group
        """
        if k is None:
            k = self.num_neighbors
        
        similarities = []
        
        for user_id, neighbor_profile in self.user_profiles.items():
            if user_id == target_user:
                continue
            
            sim = self._calculate_group_similarity(target_profile, neighbor_profile, group_items)
            
            if sim > 0:
                similarities.append((user_id, sim))
        
        # Return top-k neighbors by similarity
        similarities.sort(key=lambda x: x[1], reverse=True)
        return similarities[:k]
    
    def _aggregate_group_predictions(self, target_baskets: List[List[int]],
                                   group_neighbors: Dict[int, List[Tuple[str, float]]]) -> Dict[int, float]:
        """
        Aggregate predictions from all frequency groups (core TIFU-KNN algorithm)
        
        This implements the multi-group collaborative filtering with:
        - Group decay (β parameter) 
        - Within-group temporal decay (α parameter)
        - Repeat behavior modeling
        """
        item_scores = defaultdict(float)
        
        # Extract target user's recent items for repeat modeling
        recent_items = set()
        if target_baskets:
            # Consider last few baskets for repeat patterns
            for basket in target_baskets[-3:]:
                recent_items.update(basket)
        
        # Process each frequency group
        for group_id, neighbors in group_neighbors.items():
            # Apply group decay (β parameter): lower frequency groups get less weight
            group_weight = self.group_decay_rate ** group_id
            
            # Aggregate scores from neighbors in this group
            for neighbor_id, similarity in neighbors:
                neighbor_baskets = self.history.get(neighbor_id, [])
                if not neighbor_baskets:
                    continue
                
                # Process neighbor's baskets with temporal decay
                for basket_idx, basket in enumerate(neighbor_baskets):
                    # Apply within-group temporal decay (α parameter)
                    basket_weight = self.within_decay_rate ** (len(neighbor_baskets) - basket_idx - 1)
                    
                    for item in basket:
                        # Calculate base collaborative score
                        base_score = similarity * basket_weight * group_weight
                        
                        # Boost repeat items (items in target's recent history)
                        if item in recent_items:
                            base_score *= 1.15  # Repeat boost
                        
                        item_scores[item] += base_score
        
        return dict(item_scores)
    
    def _apply_temporal_patterns(self, item_scores: Dict[int, float], 
                               user_baskets: List[List[int]], 
                               temporal_metadata: Dict) -> None:
        """
        Enhanced temporal pattern detection using Instacart temporal features
        
        Leverages: days_since_prior_order, order_dow, order_hour_of_day
        """
        if not temporal_metadata:
            return
        
        # Analyze temporal patterns
        weekly_items = set()
        morning_items = set()
        weekend_items = set()
        
        for order_id, metadata in temporal_metadata.items():
            days_since = metadata.get('days_since_prior', 0)
            hour_of_day = metadata.get('order_hour_of_day', 12)
            day_of_week = metadata.get('order_dow', 0)
            
            # Map order_id to basket (if possible)
            try:
                basket_idx = list(temporal_metadata.keys()).index(order_id)
                if basket_idx < len(user_baskets):
                    basket = user_baskets[basket_idx]
                    
                    # Weekly pattern detection (5-9 days)
                    if 5 <= days_since <= 9:
                        weekly_items.update(basket)
                    
                    # Morning shopping pattern (6-11 AM)
                    if 6 <= hour_of_day <= 11:
                        morning_items.update(basket)
                    
                    # Weekend shopping pattern (Saturday=6, Sunday=0)
                    if day_of_week in [0, 6]:
                        weekend_items.update(basket)
            except:
                continue
        
        # Apply temporal boosts
        for item in item_scores:
            if item in weekly_items:
                item_scores[item] *= 1.12  # Weekly pattern boost
            if item in morning_items:
                item_scores[item] *= 1.05  # Morning preference boost
            if item in weekend_items:
                item_scores[item] *= 1.08  # Weekend shopping boost