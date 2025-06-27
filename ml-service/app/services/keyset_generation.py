# ml-service/services/keyset_generator.py
"""
Keyset generation for TIFU-KNN - creates frequency-based item groups
Based on reference implementation from keyset_fold.py
"""

import json
import numpy as np
from collections import defaultdict, Counter
from typing import Dict, List, Set, Tuple
from loguru import logger
import os
from app.config import config

class KeysetGenerator:
    """
    Generate keyset (frequency-based item groupings) for TIFU-KNN
    This is critical for the "Frequency" part of Temporal-Item-Frequency-KNN
    """
    
    def __init__(self, n_groups: int = None):
        self.n_groups = n_groups if n_groups is not None else config.TIFUKNN_CONFIG["group_size"]
        
    def create_keyset_from_data(self, user_baskets: Dict[int, List[List[int]]]) -> List[Set[int]]:
        """
        Create keyset directly from user baskets data
        
        Args:
            user_baskets: Dictionary of user_id -> list of baskets
            
        Returns:
            List of sets, each containing items for that frequency group
        """
        logger.info("Creating keyset from user baskets...")
        
        # Calculate global item frequencies
        item_freq = defaultdict(int)
        total_baskets = 0
        
        for user_id, baskets in user_baskets.items():
            for basket in baskets:
                total_baskets += 1
                for item in basket:
                    item_freq[item] += 1
                    
        # Sort items by frequency
        sorted_items = sorted(item_freq.items(), key=lambda x: x[1], reverse=True)
        logger.info(f"Total unique items: {len(sorted_items)}")
        
        # Divide into groups
        keyset = [set() for _ in range(self.n_groups)]
        items_per_group = len(sorted_items) // self.n_groups
        
        for i, (item, freq) in enumerate(sorted_items):
            group_idx = min(i // items_per_group, self.n_groups - 1)
            keyset[group_idx].add(item)
            
        # Log group statistics
        for i, group in enumerate(keyset):
            logger.info(f"Group {i}: {len(group)} items")
            
        return keyset
    
    def create_keyset_from_json(self, history_path: str) -> List[Set[int]]:
        """
        Create keyset from instacart_history.json file
        Compatible with reference implementation
        """
        logger.info(f"Creating keyset from {history_path}")
        
        with open(history_path, 'r') as f:
            history = json.load(f)
            
        # Convert to internal format
        user_baskets = {}
        for user_id, baskets in history.items():
            user_baskets[int(user_id)] = baskets
            
        return self.create_keyset_from_data(user_baskets)
    
    def save_keyset(self, keyset: List[Set[int]], output_path: str):
        """
        Save keyset to JSON file in format expected by TIFU-KNN
        """
        # Convert sets to lists for JSON serialization
        keyset_list = [list(group) for group in keyset]
        
        with open(output_path, 'w') as f:
            json.dump(keyset_list, f)
            
        logger.info(f"Saved keyset to {output_path}")
        
    def load_keyset(self, keyset_path: str) -> List[Set[int]]:
        """
        Load keyset from JSON file
        """
        with open(keyset_path, 'r') as f:
            keyset_list = json.load(f)
            
        # Convert lists back to sets
        keyset = [set(group) for group in keyset_list]
        return keyset


def generate_instacart_keyset(data_loader, output_dir: str = None):
    """
    Helper function to generate keyset for Instacart data
    """
    if output_dir is None:
        output_dir = config.DATA_PATH
    os.makedirs(output_dir, exist_ok=True)
    
    generator = KeysetGenerator(n_groups=config.TIFUKNN_CONFIG["group_size"])
    keyset = generator.create_keyset_from_data(data_loader.user_baskets)
    
    output_path = os.path.join(output_dir, "instacart_keyset_0.json")
    generator.save_keyset(keyset, output_path)
    
    return keyset