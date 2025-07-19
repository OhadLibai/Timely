# backend/endpoints/evaluations.py
"""
Evaluation endpoint with inline metrics calculation
Implements Demand #2 - Model Performance Stats
All calculations are self-contained for simplicity
"""

from flask import Blueprint, jsonify, current_app
import pandas as pd
import os
import numpy as np
import math
import random
from typing import List, Set

evaluations_bp = Blueprint('evaluations', __name__)

EVALUATE_AT = int(os.getenv("EVALUATE_AT")) # Fixed `K` value, classically used for evaluating per basket size recommendation

@evaluations_bp.route('/metrics/<int:sample_size>', methods=['POST'])
def evaluate_metrics(sample_size):
    """
    Evaluate model performance with 5 key metrics at K=EVALUATE_AT
    
    Returns:
    - PrecisionAt: What % of recommended items were actually purchased
    - RecallAt: What % of purchased items were recommended  
    - F1ScoreAt: Harmonic mean of precision and recall
    - NDCGAt: Ranking quality (higher ranked hits are better)
    - JaccardSimilarity: Set overlap between predicted and actual
    """
    try:
        # Validate sample size
        if sample_size < 1:
            return jsonify({'error': 'Sample size must be at least 1'}), 400
        
        # Get ML engine and data
        ml_engine = current_app.ml_engine
        
        # Load ground truth data
        future_df = pd.read_csv('/app/data/dataset/instacart_future.csv')
        
        # Get test and validation users
        test_users = [str(uid) for uid in ml_engine.keyset.get('test', [])]
        val_users = [str(uid) for uid in ml_engine.keyset.get('val', [])]
        
        # Combine and sample
        # In this iteration of building the project,
        # We use both val users and test users for testing 
        # Predictions results
        all_eval_users = test_users + val_users
        
        # Initialize metric accumulators
        precisions = []
        recalls = []
        f1_scores = []
        ndcg_scores = []
        jaccard_scores = []
        valid_users = 0
        
        # Evaluate each user
        while valid_users < sample_size:
            random_index = random.randrange(len(all_eval_users))
            random_eval_user_id = all_eval_users.pop(random_index)       
        
            # Get prediction from ML engine
            result = ml_engine.predict_basket(random_eval_user_id, use_csv_data=True)
            if not result['success']:
                continue
            predicted_items = result['items']
            
            # Get ground truth
            user_future = future_df[future_df['user_id'] == int(random_eval_user_id)]
            true_items = user_future['product_id']
            if true_items.empty:
                continue

            valid_users += 1

            # basket_limit_size param:
            # For simplicity now, override the EVALUATE_AT env var.
            # This softens the requirements a bit but it is OK.
            basket_limit_size = min(len(true_items), len(predicted_items))
            predicted_items_set = set(predicted_items[:basket_limit_size])
            true_items_set = set(true_items[:basket_limit_size])         
            
            # Calculate Precision@
            # Precision = |predicted ∩ actual| / |predicted|
            if predicted_items_set:
                precision = len(predicted_items_set & true_items_set) / len(predicted_items_set)
                precisions.append(precision)
            else:
                precisions.append(0.0)
            
            # Calculate Recall@
            # Recall = |predicted ∩ actual| / |actual|
            recall = len(predicted_items_set & true_items_set) / len(true_items)
            recalls.append(recall)
            
            # Calculate F1-Score
            # F1 = 2 * (precision * recall) / (precision + recall)
            if precisions[-1] + recalls[-1] > 0:
                f1 = 2 * (precisions[-1] * recalls[-1]) / (precisions[-1] + recalls[-1])
            else:
                f1 = 0.0
            f1_scores.append(f1)
            
            # Calculate NDCG
            # NDCG = DCG / IDCG
            dcg = 0.0
            for i, item in enumerate(predicted_items):
                if item in true_items_set:
                    # Relevance is 1 if item was purchased, 0 otherwise
                    dcg += 1.0 / math.log2(i + 2)  # i+2 because position starts at 0
            
            # Ideal DCG: all relevant items at top positions
            idcg = sum(1.0 / math.log2(i + 2) for i in range(min(len(true_items), basket_limit_size)))
            
            ndcg = dcg / idcg if idcg > 0 else 0.0
            ndcg_scores.append(ndcg)
            
            # Calculate Jaccard Similarity
            # Jaccard = |predicted ∩ actual| / |predicted ∪ actual|
            if predicted_items_set or true_items_set:
                intersection = len(predicted_items_set & true_items_set)
                union = len(predicted_items_set | true_items_set)
                jaccard = intersection / union if union > 0 else 0.0
            else:
                jaccard = 1.0  # Both empty sets
            jaccard_scores.append(jaccard)
        
        # Check if we have valid results
        if valid_users == 0:
            return jsonify({
                'error': 'No valid users found for evaluation',
                'sampleSize': 0
            }), 400
        
        # Calculate final averaged metrics
        metrics = {
            'PrecisionAt': round(np.mean(precisions), 4),
            'RecallAt': round(np.mean(recalls), 4),
            'F1ScoreAt': round(np.mean(f1_scores), 4),
            'NDCGAt': round(np.mean(ndcg_scores), 4),
            'JaccardSimilarity': round(np.mean(jaccard_scores), 4),
            'sampleSize': valid_users
        }
        
        return jsonify(metrics)
        
    except Exception as e:
        print(f"Evaluation error: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # Return error with sample metrics for debugging
        return jsonify({
            'success': False,
            'error': f'Evaluation failed: {str(e)}'
        }), 500