"""
Shared utilities for the generators module
"""

import numpy as np
from typing import Dict, List, Any
from loguru import logger

class GeneratorUtils:
    """Utility functions shared across generator classes"""
    
    @staticmethod
    def calculate_user_statistics(user_baskets: Dict[int, List[List[int]]]) -> Dict[str, Any]:
        """Calculate comprehensive user behavior statistics"""
        stats = {
            'total_users': len(user_baskets),
            'total_orders': 0,
            'unique_items': set(),
            'avg_orders_per_user': 0,
            'avg_items_per_order': 0,
            'user_diversity_scores': []
        }
        
        for user_id, baskets in user_baskets.items():
            stats['total_orders'] += len(baskets)
            user_items = set()
            
            for basket in baskets:
                stats['unique_items'].update(basket)
                user_items.update(basket)
            
            # Calculate user diversity (unique items / total items)
            total_user_items = sum(len(basket) for basket in baskets)
            if total_user_items > 0:
                diversity = len(user_items) / total_user_items
                stats['user_diversity_scores'].append(diversity)
        
        if stats['total_users'] > 0:
            stats['avg_orders_per_user'] = stats['total_orders'] / stats['total_users']
        
        if stats['total_orders'] > 0:
            total_items = sum(len(basket) for baskets in user_baskets.values() for basket in baskets)
            stats['avg_items_per_order'] = total_items / stats['total_orders']
        
        stats['unique_items_count'] = len(stats['unique_items'])
        stats['unique_items'] = list(stats['unique_items'])  # Convert set to list for JSON serialization
        
        if stats['user_diversity_scores']:
            stats['avg_user_diversity'] = np.mean(stats['user_diversity_scores'])
            stats['diversity_std'] = np.std(stats['user_diversity_scores'])
        
        return stats
    
    @staticmethod
    def validate_generator_output(output: List[Any], expected_type: type = set, min_groups: int = 1) -> bool:
        """Validate generator output format and content"""
        if not isinstance(output, list):
            logger.error("Generator output must be a list")
            return False
        
        if len(output) < min_groups:
            logger.error(f"Generator output must have at least {min_groups} groups")
            return False
        
        for i, group in enumerate(output):
            if not isinstance(group, expected_type):
                logger.error(f"Group {i} must be of type {expected_type.__name__}")
                return False
            
            if expected_type == set and len(group) == 0:
                logger.warning(f"Group {i} is empty")
        
        logger.info(f"Generator output validation passed: {len(output)} groups")
        return True
    
    @staticmethod
    def log_generation_summary(groups: List[Any], method: str, generation_time: float = None):
        """Log a comprehensive summary of generation results"""
        logger.info(f"=== Generation Summary ({method}) ===")
        logger.info(f"Total groups: {len(groups)}")
        
        if groups and hasattr(groups[0], '__len__'):
            group_sizes = [len(group) for group in groups]
            logger.info(f"Group sizes: min={min(group_sizes)}, max={max(group_sizes)}, avg={np.mean(group_sizes):.1f}")
        
        if generation_time:
            logger.info(f"Generation time: {generation_time:.2f}s")
        
        logger.info("==================================")