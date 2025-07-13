# backend/ml_engine/build/keyset_fold.py
"""
Create train/validation/test user splits for model evaluation
Updated paths for new project structure
"""

import pandas as pd
import json
import random
import argparse
import os

# Updated data paths for new structure
DATA_DIR = "/app/data/dataset"

def create_keyset_fold(dataset='instacart', fold_id=0):
    try:
        """
        Create train/validation/test splits for users
        """
        print(f"Creating keyset fold for dataset: {dataset}, fold: {fold_id}")
        
        # Load the history and future data files
        future_path = os.path.join(DATA_DIR, f'{dataset}_future.csv')
        history_path = os.path.join(DATA_DIR, f'{dataset}_history.csv')
        
        try:
            data_future = pd.read_csv(future_path)
            data_history = pd.read_csv(history_path)
            print(f"✅ Loaded future data: {len(data_future)} records")
            print(f"✅ Loaded history data: {len(data_history)} records")
        except FileNotFoundError as e:
            print(f"❌ Error loading data files: {e}")
            print("Please make sure create_model_data.py has been run successfully.")
            raise SystemExit(1)
        
        # Combine data to get all records
        data = pd.concat([data_history, data_future])
        
        # Get unique users from future data (users who have ground truth)
        user = list(set(data_future['user_id']))
        user_num = len(user)
        
        print(f"👥 Total users with ground truth: {user_num}")
        
        # Shuffle users for random splits
        random.shuffle(user)
        user = [str(user_id) for user_id in user]
        
        # Create splits: 72% train, 8% validation, 20% test
        train_end = int(user_num * 4/5 * 0.9)  # 72%
        val_end = int(user_num * 4/5)          # 80%
        
        train_user = user[:train_end]
        val_user = user[train_end:val_end]
        test_user = user[val_end:]
        
        print(f"📊 Train users: {len(train_user)} ({len(train_user)/user_num*100:.1f}%)")
        print(f"📊 Validation users: {len(val_user)} ({len(val_user)/user_num*100:.1f}%)")
        print(f"📊 Test users: {len(test_user)} ({len(test_user)/user_num*100:.1f}%)")
        
        # Get maximum product ID for model dimensions
        item_num = max(data['product_id'].tolist()) + 1
        print(f"📦 Total items in dataset: {item_num}")
        
        # Create keyset dictionary
        keyset_dict = {
            'item_num': item_num,
            'train': train_user,
            'val': val_user,
            'test': test_user
        }
        
        print("\nKeyset summary:")
        print(f"  Item count: {keyset_dict['item_num']}")
        print(f"  Train users: {len(keyset_dict['train'])}")
        print(f"  Val users: {len(keyset_dict['val'])}")
        print(f"  Test users: {len(keyset_dict['test'])}")
        
        # Create keyset directory if it doesn't exist
        keyset_dir = os.path.join(DATA_DIR, 'keyset')
        if not os.path.exists(keyset_dir):
            os.makedirs(keyset_dir)
        
        # Save keyset file
        keyset_file = os.path.join(keyset_dir, f'{dataset}_keyset_{fold_id}.json')
        with open(keyset_file, 'w') as f:
            json.dump(keyset_dict, f)
        
        # Also save to root of dataset directory for easier access
        keyset_file_root = os.path.join(DATA_DIR, f'{dataset}_keyset_{fold_id}.json')
        with open(keyset_file_root, 'w') as f:
            json.dump(keyset_dict, f)
        
        print(f"✅ Keyset saved to: {keyset_file}")
        print(f"✅ Keyset saved to: {keyset_file_root}")
        print("🎯 Keyset creation complete!")
    
    except Exception as e:
        print(f"⚠️ Got into a problem: {e}")
        raise SystemExit(1)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--dataset', type=str, default='instacart', help='Dataset name')
    parser.add_argument('--fold_id', type=int, default=0, help='Fold ID')
    args = parser.parse_args()
    
    create_keyset_fold(args.dataset, args.fold_id)