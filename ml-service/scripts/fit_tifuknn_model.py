# scripts/fit_tifuknn_model.py
"""
OFFLINE FITTING SCRIPT: Generate TIFU-KNN Model Files

This script processes the Instacart dataset and generates fitted model files
that the ML service can load for fast prediction serving.

Usage:
    python scripts/fit_tifuknn_model.py --dataset instacart --output /app/data/models

Based on existing components but creates persistent model files for production use.
"""

import os
import sys
import json
import pickle
import argparse
import time
from pathlib import Path
from typing import Dict, List, Any, Optional
import pandas as pd
import numpy as np
from loguru import logger

# Add ml-service to path
script_dir = Path(__file__).parent
ml_service_dir = script_dir.parent / 'ml-service'
sys.path.append(str(ml_service_dir))

from app.core.tifuknn import TIFUKNNEngine
from app.core.data_loader import DataLoader
from app.config import config

class TIFUKNNModelFitter:
    """
    Offline model fitting for TIFU-KNN
    
    Processes Instacart dataset and generates:
    1. Fitted model files (pickle)
    2. Processed data files (JSON)
    3. Model metadata and statistics
    4. Evaluation keysets for reproducibility
    """
    
    def __init__(self, dataset_path: str, output_dir: str):
        self.dataset_path = Path(dataset_path)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Create subdirectories
        self.models_dir = self.output_dir / 'models'
        self.data_dir = self.output_dir / 'data'
        self.keysets_dir = self.output_dir / 'keysets'
        
        for dir_path in [self.models_dir, self.data_dir, self.keysets_dir]:
            dir_path.mkdir(exist_ok=True)
        
        logger.info(f"Initialized model fitter for dataset: {dataset_path}")
        logger.info(f"Output directory: {output_dir}")
    
    def fit_model(self, 
                  train_ratio: float = 0.8,
                  validation_ratio: float = 0.1,
                  test_ratio: float = 0.1,
                  min_baskets: int = 3,
                  max_users: Optional[int] = None) -> Dict[str, Any]:
        """
        Complete model fitting pipeline
        
        Args:
            train_ratio: Ratio of data for training
            validation_ratio: Ratio of data for validation
            test_ratio: Ratio of data for testing
            min_baskets: Minimum baskets per user
            max_users: Maximum users to process (None = all)
            
        Returns:
            Dictionary with fitting results and statistics
        """
        logger.info("Starting TIFU-KNN model fitting pipeline...")
        start_time = time.time()
        
        # Step 1: Load and preprocess Instacart data
        logger.info("Step 1: Loading and preprocessing Instacart dataset...")
        processed_data = self._load_and_preprocess_instacart(min_baskets, max_users)
        
        # Step 2: Split data into train/validation/test
        logger.info("Step 2: Splitting data...")
        data_splits = self._split_data(processed_data, train_ratio, validation_ratio, test_ratio)
        
        # Step 3: Save processed data files
        logger.info("Step 3: Saving processed data files...")
        self._save_data_files(data_splits)
        
        # Step 4: Fit TIFU-KNN model on training data
        logger.info("Step 4: Fitting TIFU-KNN model...")
        fitted_model = self._fit_tifuknn_model(data_splits['train'])
        
        # Step 5: Save fitted model
        logger.info("Step 5: Saving fitted model...")
        model_path = self._save_fitted_model(fitted_model)
        
        # Step 6: Generate evaluation keysets
        logger.info("Step 6: Generating evaluation keysets...")
        keysets = self._generate_evaluation_keysets(data_splits)
        
        # Step 7: Calculate model statistics
        logger.info("Step 7: Calculating model statistics...")
        statistics = self._calculate_model_statistics(fitted_model, data_splits)
        
        # Step 8: Save metadata
        logger.info("Step 8: Saving metadata...")
        metadata = self._save_metadata(statistics, data_splits, model_path)
        
        total_time = time.time() - start_time
        
        logger.info(f"Model fitting complete in {total_time:.2f}s")
        logger.info(f"Model saved to: {model_path}")
        logger.info(f"Training users: {len(data_splits['train']['history'])}")
        logger.info(f"Test users: {len(data_splits['test']['history'])}")
        
        return {
            'success': True,
            'model_path': str(model_path),
            'data_files': {
                'train_history': str(self.data_dir / 'train_history.json'),
                'train_future': str(self.data_dir / 'train_future.json'),
                'test_history': str(self.data_dir / 'test_history.json'),
                'test_future': str(self.data_dir / 'test_future.json'),
                'validation_history': str(self.data_dir / 'validation_history.json'),
                'validation_future': str(self.data_dir / 'validation_future.json')
            },
            'keysets': keysets,
            'statistics': statistics,
            'fitting_time_seconds': total_time,
            'metadata_path': str(self.output_dir / 'model_metadata.json')
        }
    
    def _load_and_preprocess_instacart(self, min_baskets: int, max_users: Optional[int]) -> Dict[str, Any]:
        """
        Load and preprocess Instacart dataset
        """
        logger.info("Loading Instacart CSV files...")
        
        # Load required CSV files
        orders_df = pd.read_csv(self.dataset_path / 'orders.csv')
        order_products_prior_df = pd.read_csv(self.dataset_path / 'order_products__prior.csv')
        order_products_train_df = pd.read_csv(self.dataset_path / 'order_products__train.csv')
        products_df = pd.read_csv(self.dataset_path / 'products.csv')
        
        logger.info(f"Loaded {len(orders_df)} orders, {len(order_products_prior_df)} prior products, "
                   f"{len(order_products_train_df)} train products")
        
        # Combine order products
        all_order_products = pd.concat([order_products_prior_df, order_products_train_df])
        
        # Merge with orders to get user and temporal information
        order_data = orders_df.merge(all_order_products, on='order_id', how='inner')
        
        # Filter users with minimum baskets
        user_order_counts = order_data.groupby('user_id')['order_id'].nunique()
        valid_users = user_order_counts[user_order_counts >= min_baskets].index.tolist()
        
        if max_users:
            valid_users = valid_users[:max_users]
        
        logger.info(f"Processing {len(valid_users)} users with >= {min_baskets} baskets")
        
        # Filter data to valid users
        order_data = order_data[order_data['user_id'].isin(valid_users)]
        
        # Build user basket sequences
        user_baskets = {}
        user_temporal_data = {}
        
        for user_id in valid_users:
            user_orders = order_data[order_data['user_id'] == user_id].sort_values('order_number')
            
            baskets = []
            temporal_data = {}
            
            for order_id, order_group in user_orders.groupby('order_id'):
                # Get products in this order
                products = order_group['product_id'].tolist()
                baskets.append(products)
                
                # Get temporal information
                order_info = order_group.iloc[0]
                temporal_data[str(order_id)] = {
                    'days_since_prior_order': order_info.get('days_since_prior_order'),
                    'order_dow': order_info.get('order_dow'),
                    'order_hour_of_day': order_info.get('order_hour_of_day')
                }
            
            user_baskets[str(user_id)] = baskets
            user_temporal_data[str(user_id)] = temporal_data
        
        # Calculate dataset statistics
        total_orders = sum(len(baskets) for baskets in user_baskets.values())
        total_items = sum(len(item) for baskets in user_baskets.values() for item in baskets)
        unique_products = set(order_data['product_id'].unique())
        
        logger.info(f"Processed dataset: {len(user_baskets)} users, {total_orders} orders, "
                   f"{total_items} items, {len(unique_products)} unique products")
        
        return {
            'user_baskets': user_baskets,
            'user_temporal_data': user_temporal_data,
            'products_df': products_df,
            'statistics': {
                'users': len(user_baskets),
                'orders': total_orders,
                'items': total_items,
                'unique_products': len(unique_products)
            }
        }
    
    def _split_data(self, processed_data: Dict[str, Any], 
                   train_ratio: float, validation_ratio: float, test_ratio: float) -> Dict[str, Dict[str, Any]]:
        """
        Split data into train/validation/test sets using temporal split
        """
        user_baskets = processed_data['user_baskets']
        
        train_history = {}
        train_future = {}
        validation_history = {}
        validation_future = {}
        test_history = {}
        test_future = {}
        
        for user_id, baskets in user_baskets.items():
            if len(baskets) < 3:  # Need at least 3 baskets for splits
                continue
            
            # Calculate split points
            total_baskets = len(baskets)
            train_end = int(total_baskets * train_ratio)
            val_end = int(total_baskets * (train_ratio + validation_ratio))
            
            # Training split: all but last basket
            if train_end > 1:
                train_history[user_id] = baskets[:train_end-1]
                train_future[user_id] = baskets[train_end-1]
            
            # Validation split
            if val_end > train_end and val_end < total_baskets:
                validation_history[user_id] = baskets[:val_end-1]
                validation_future[user_id] = baskets[val_end-1]
            
            # Test split: all but last basket for history, last basket for future
            if total_baskets > val_end:
                test_history[user_id] = baskets[:-1]
                test_future[user_id] = baskets[-1]
        
        logger.info(f"Data split - Train: {len(train_history)}, "
                   f"Validation: {len(validation_history)}, Test: {len(test_history)}")
        
        return {
            'train': {'history': train_history, 'future': train_future},
            'validation': {'history': validation_history, 'future': validation_future},
            'test': {'history': test_history, 'future': test_future}
        }
    
    def _save_data_files(self, data_splits: Dict[str, Dict[str, Any]]) -> None:
        """
        Save processed data files in JSON format
        """
        for split_name, split_data in data_splits.items():
            history_file = self.data_dir / f'{split_name}_history.json'
            future_file = self.data_dir / f'{split_name}_future.json'
            
            with open(history_file, 'w') as f:
                json.dump(split_data['history'], f)
            
            with open(future_file, 'w') as f:
                json.dump(split_data['future'], f)
            
            logger.info(f"Saved {split_name} data: {len(split_data['history'])} users")
    
    def _fit_tifuknn_model(self, train_data: Dict[str, Any]) -> TIFUKNNEngine:
        """
        Fit TIFU-KNN model on training data
        """
        # Initialize engine with config parameters
        engine = TIFUKNNEngine(
            num_neighbors=config.TIFUKNN_CONFIG["num_neighbors"],
            within_decay_rate=config.TIFUKNN_CONFIG["within_decay_rate"],
            group_decay_rate=config.TIFUKNN_CONFIG["group_decay_rate"],
            sequential_decay_rate=config.TIFUKNN_CONFIG["sequential_decay_rate"],
            group_size=config.TIFUKNN_CONFIG["group_size"]
        )
        
        # Set training data
        engine.set_data(
            history=train_data['history'],
            future=train_data['future']
        )
        
        # Fit the model
        engine.fit()
        
        logger.info(f"Model fitted with {len(train_data['history'])} users")
        
        return engine
    
    def _save_fitted_model(self, fitted_model: TIFUKNNEngine) -> Path:
        """
        Save fitted model to disk
        """
        model_path = self.models_dir / 'tifuknn_fitted_model.pkl'
        
        with open(model_path, 'wb') as f:
            pickle.dump(fitted_model, f)
        
        logger.info(f"Fitted model saved to: {model_path}")
        
        return model_path
    
    def _generate_evaluation_keysets(self, data_splits: Dict[str, Dict[str, Any]]) -> Dict[str, str]:
        """
        Generate evaluation keysets for reproducible experiments
        """
        keysets = {}
        
        for split_name, split_data in data_splits.items():
            keyset_file = self.keysets_dir / f'{split_name}_keyset.json'
            user_list = list(split_data['history'].keys())
            
            with open(keyset_file, 'w') as f:
                json.dump(user_list, f)
            
            keysets[split_name] = str(keyset_file)
            logger.info(f"Generated {split_name} keyset: {len(user_list)} users")
        
        return keysets
    
    def _calculate_model_statistics(self, fitted_model: TIFUKNNEngine, 
                                   data_splits: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
        """
        Calculate comprehensive model statistics
        """
        stats = {
            'model_parameters': {
                'num_neighbors': fitted_model.num_neighbors,
                'within_decay_rate': fitted_model.within_decay_rate,
                'group_decay_rate': fitted_model.group_decay_rate,
                'sequential_decay_rate': fitted_model.sequential_decay_rate,
                'group_size': fitted_model.group_size
            },
            'data_statistics': {
                'total_users': len(fitted_model.history),
                'total_items': len(fitted_model.all_items),
                'avg_baskets_per_user': np.mean([len(baskets) for baskets in fitted_model.history.values()]),
                'avg_items_per_basket': np.mean([len(item) for baskets in fitted_model.history.values() for item in baskets])
            },
            'split_statistics': {}
        }
        
        for split_name, split_data in data_splits.items():
            stats['split_statistics'][split_name] = {
                'users': len(split_data['history']),
                'users_with_future': len(split_data['future'])
            }
        
        return stats
    
    def _save_metadata(self, statistics: Dict[str, Any], data_splits: Dict[str, Dict[str, Any]], 
                      model_path: Path) -> Path:
        """
        Save complete metadata about the fitted model
        """
        metadata = {
            'model_info': {
                'algorithm': 'TIFU-KNN',
                'version': '1.0.0',
                'fitted_at': time.time(),
                'model_file': str(model_path),
                'config_used': config.TIFUKNN_CONFIG
            },
            'dataset_info': {
                'source': 'Instacart',
                'preprocessing': {
                    'min_baskets_per_user': 3,
                    'temporal_features_included': True
                }
            },
            'statistics': statistics,
            'files': {
                'models_dir': str(self.models_dir),
                'data_dir': str(self.data_dir),
                'keysets_dir': str(self.keysets_dir)
            }
        }
        
        metadata_path = self.output_dir / 'model_metadata.json'
        
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        logger.info(f"Metadata saved to: {metadata_path}")
        
        return metadata_path

def main():
    """
    Main function for offline model fitting
    """
    parser = argparse.ArgumentParser(description='Fit TIFU-KNN model offline')
    parser.add_argument('--dataset', type=str, required=True,
                       help='Path to Instacart dataset directory')
    parser.add_argument('--output', type=str, required=True,
                       help='Output directory for fitted model and data')
    parser.add_argument('--max-users', type=int, default=None,
                       help='Maximum number of users to process (for testing)')
    parser.add_argument('--min-baskets', type=int, default=3,
                       help='Minimum baskets per user')
    
    args = parser.parse_args()
    
    # Setup logging
    logger.remove()
    logger.add(sys.stdout, level="INFO", format="{time} | {level} | {message}")
    logger.add(Path(args.output) / "fitting.log", level="DEBUG")
    
    try:
        # Initialize fitter
        fitter = TIFUKNNModelFitter(args.dataset, args.output)
        
        # Fit model
        results = fitter.fit_model(
            max_users=args.max_users,
            min_baskets=args.min_baskets
        )
        
        # Print results
        print("\n" + "="*60)
        print("TIFU-KNN MODEL FITTING COMPLETED SUCCESSFULLY")
        print("="*60)
        print(f"Model saved to: {results['model_path']}")
        print(f"Training users: {results['statistics']['data_statistics']['total_users']}")
        print(f"Unique items: {results['statistics']['data_statistics']['total_items']}")
        print(f"Fitting time: {results['fitting_time_seconds']:.2f} seconds")
        print(f"Metadata: {results['metadata_path']}")
        print("="*60)
        
        # Instructions for using the fitted model
        print("\nTo use the fitted model in your ML service:")
        print(f"1. Copy fitted model file to ml-service: {results['model_path']}")
        print(f"2. Copy data files to ml-service: {args.output}/data/")
        print("3. Update ML service to load pre-fitted model instead of fitting on startup")
        print("4. Use the keysets for reproducible evaluation")
        
    except Exception as e:
        logger.error(f"Model fitting failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()