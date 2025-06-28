"""
Enhanced frequency-based item grouping for TIFU-KNN algorithm
Renamed and enhanced from keyset_generation.py
"""

import numpy as np
from collections import defaultdict
from typing import Dict, List, Set
from loguru import logger
import os
import json
from app.config import config

class FrequencyGroupsGenerator:
    """Generate optimized frequency-based item groups for TIFU-KNN"""
    
    def __init__(self, n_groups: int = None, method: str = "equal_division"):
        self.n_groups = n_groups if n_groups is not None else config.TIFUKNN_CONFIG["group_size"]
        self.method = method
        
    def create_frequency_groups(self, user_baskets: Dict[int, List[List[int]]]) -> List[Set[int]]:
        """Create frequency groups using specified method"""
        logger.info(f"Creating frequency groups using {self.method} method...")
        
        item_frequencies = self._calculate_item_frequencies(user_baskets)
        
        if self.method == "kmeans":
            return self._kmeans_frequency_groups(item_frequencies)
        elif self.method == "quantile":
            return self._quantile_frequency_groups(item_frequencies)
        else:  # equal_division (backward compatibility)
            return self._equal_division_groups(item_frequencies)
    
    def _calculate_item_frequencies(self, user_baskets: Dict[int, List[List[int]]]) -> Dict[int, int]:
        """Calculate global item frequencies"""
        item_freq = defaultdict(int)
        for user_id, baskets in user_baskets.items():
            for basket in baskets:
                for item in basket:
                    item_freq[item] += 1
        return dict(item_freq)
    
    def _equal_division_groups(self, item_frequencies: Dict[int, int]) -> List[Set[int]]:
        """Original equal division method (backward compatibility)"""
        sorted_items = sorted(item_frequencies.items(), key=lambda x: x[1], reverse=True)
        frequency_groups = [set() for _ in range(self.n_groups)]
        items_per_group = len(sorted_items) // self.n_groups
        
        for i, (item, freq) in enumerate(sorted_items):
            group_idx = min(i // items_per_group, self.n_groups - 1)
            frequency_groups[group_idx].add(item)
        
        # Log group statistics
        for i, group in enumerate(frequency_groups):
            logger.info(f"Frequency Group {i}: {len(group)} items")
        
        return frequency_groups
    
    def _kmeans_frequency_groups(self, item_frequencies: Dict[int, int]) -> List[Set[int]]:
        """Enhanced K-means clustering for frequency groups"""
        try:
            from sklearn.cluster import KMeans
            
            frequencies = np.array(list(item_frequencies.values())).reshape(-1, 1)
            items = list(item_frequencies.keys())
            
            kmeans = KMeans(n_clusters=self.n_groups, random_state=42, n_init=10)
            cluster_labels = kmeans.fit_predict(frequencies)
            
            frequency_groups = [set() for _ in range(self.n_groups)]
            for item, cluster in zip(items, cluster_labels):
                frequency_groups[cluster].add(item)
            
            # Sort groups by average frequency (high to low)
            group_avg_freq = []
            for i, group in enumerate(frequency_groups):
                if group:  # Skip empty groups
                    avg_freq = np.mean([item_frequencies[item] for item in group])
                    group_avg_freq.append((avg_freq, i, group))
            
            group_avg_freq.sort(reverse=True)
            
            # Log group statistics
            for i, (avg_freq, _, group) in enumerate(group_avg_freq):
                logger.info(f"Frequency Group {i}: {len(group)} items (avg freq: {avg_freq:.1f})")
            
            return [group for _, _, group in group_avg_freq]
            
        except ImportError:
            logger.warning("scikit-learn not available, falling back to equal division")
            return self._equal_division_groups(item_frequencies)
    
    def _quantile_frequency_groups(self, item_frequencies: Dict[int, int]) -> List[Set[int]]:
        """Enhanced quantile-based frequency groups"""
        frequencies = list(item_frequencies.values())
        quantiles = np.quantile(frequencies, [i/self.n_groups for i in range(1, self.n_groups)])
        
        frequency_groups = [set() for _ in range(self.n_groups)]
        
        for item, freq in item_frequencies.items():
            group_idx = sum(freq > q for q in quantiles)
            frequency_groups[group_idx].add(item)
        
        # Log group statistics
        for i, group in enumerate(frequency_groups):
            if group:
                avg_freq = np.mean([item_frequencies[item] for item in group])
                logger.info(f"Frequency Group {i}: {len(group)} items (avg freq: {avg_freq:.1f})")
        
        return frequency_groups
    
    def save_frequency_groups(self, frequency_groups: List[Set[int]], output_path: str):
        """Save frequency groups to JSON file"""
        groups_list = [list(group) for group in frequency_groups]
        
        with open(output_path, 'w') as f:
            json.dump(groups_list, f)
            
        logger.info(f"Saved frequency groups to {output_path}")
        
    def load_frequency_groups(self, groups_path: str) -> List[Set[int]]:
        """Load frequency groups from JSON file"""
        with open(groups_path, 'r') as f:
            groups_list = json.load(f)
            
        frequency_groups = [set(group) for group in groups_list]
        return frequency_groups

# Helper function for backward compatibility
def generate_instacart_frequency_groups(data_loader, output_dir: str = None):
    """Generate frequency groups for Instacart data"""
    if output_dir is None:
        output_dir = config.DATA_PATH
    os.makedirs(output_dir, exist_ok=True)
    
    method = config.TIFUKNN_CONFIG.get("frequency_group_method", "equal_division")
    generator = FrequencyGroupsGenerator(
        n_groups=config.TIFUKNN_CONFIG["group_size"],
        method=method
    )
    
    groups = generator.create_frequency_groups(data_loader.user_baskets)
    
    # Save with new filename
    output_path = os.path.join(output_dir, "instacart_frequency_groups.json")
    generator.save_frequency_groups(groups, output_path)
    
    logger.info(f"Saved frequency groups to {output_path}")
    return groups