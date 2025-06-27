# ml-service/services/data_preprocessor.py
"""
Data preprocessor to convert Instacart CSV data to TIFU-KNN JSON format
This bridges the gap between raw CSV data and what TIFU-KNN expects
"""

import json
import os
from typing import Dict, List, Optional
from loguru import logger
import pandas as pd
from app.config import config

class DataPreprocessor:
    """
    Preprocess Instacart data into formats required by TIFU-KNN
    """
    
    @staticmethod
    def create_history_json(user_baskets: Dict[int, List[List[int]]]) -> Dict[str, List[List[int]]]:
        """
        Convert user baskets to instacart_history.json format
        
        Format: {"user_id_string": [[basket1_items], [basket2_items], ...]}
        """
        # Convert integer keys to strings as expected by reference implementation
        history = {}
        for user_id, baskets in user_baskets.items():
            history[str(user_id)] = baskets
        return history
    
    @staticmethod
    def create_future_json(user_future_baskets: Dict[int, List[int]]) -> Dict[str, List[int]]:
        """
        Convert future baskets to instacart_future.json format
        
        Format: {"user_id_string": [future_basket_items]}
        """
        future = {}
        for user_id, basket in user_future_baskets.items():
            future[str(user_id)] = basket
        return future
    
    @staticmethod
    def save_json_files(history: Dict, future: Dict, keyset: Optional[List] = None, 
                       output_dir: str = None):
        """
        Save preprocessed data in TIFU-KNN format
        """
        if output_dir is None:
            output_dir = config.DATA_PATH
        os.makedirs(output_dir, exist_ok=True)
        
        # Save history
        history_path = os.path.join(output_dir, "instacart_history.json")
        with open(history_path, 'w') as f:
            json.dump(history, f)
        logger.info(f"Saved history to {history_path} ({len(history)} users)")
        
        # Save future
        future_path = os.path.join(output_dir, "instacart_future.json")
        with open(future_path, 'w') as f:
            json.dump(future, f)
        logger.info(f"Saved future to {future_path} ({len(future)} users)")
        
        # Save keyset if provided
        if keyset:
            keyset_path = os.path.join(output_dir, "instacart_keyset_0.json")
            with open(keyset_path, 'w') as f:
                json.dump(keyset, f)
            logger.info(f"Saved keyset to {keyset_path}")
            
    @staticmethod
    def create_merged_json(history: Dict, future: Dict) -> Dict:
        """
        Create merged format for some evaluation scripts
        
        Format: {"user_id": {"history": [...], "future": [...]}}
        """
        merged = {}
        
        # Get all user IDs
        all_users = set(history.keys()) | set(future.keys())
        
        for user_id in all_users:
            merged[user_id] = {
                "history": history.get(user_id, []),
                "future": future.get(user_id, [])
            }
            
        return merged
    
    @staticmethod
    def preprocess_for_tifuknn(data_loader, output_dir: str = None):
        """
        Complete preprocessing pipeline for TIFU-KNN
        """
        if output_dir is None:
            output_dir = config.DATA_PATH
        logger.info("Starting data preprocessing for TIFU-KNN...")
        
        # Create JSON files
        history = DataPreprocessor.create_history_json(data_loader.user_baskets)
        future = DataPreprocessor.create_future_json(data_loader.user_future_baskets)
        
        # Generate keyset
        from .keyset_generator import generate_instacart_keyset
        keyset = generate_instacart_keyset(data_loader, output_dir)
        
        # Save all files
        DataPreprocessor.save_json_files(history, future, output_dir=output_dir)
        
        # Also create merged format
        merged = DataPreprocessor.create_merged_json(history, future)
        merged_path = os.path.join(output_dir, "instacart_merged.json")
        with open(merged_path, 'w') as f:
            json.dump(merged, f)
        
        logger.info("Data preprocessing complete!")
        
        return {
            "history_path": os.path.join(output_dir, "instacart_history.json"),
            "future_path": os.path.join(output_dir, "instacart_future.json"),
            "keyset_path": os.path.join(output_dir, "instacart_keyset_0.json"),
            "merged_path": merged_path
        }