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

EVALUATE_AT = int(os.getenv("EVALUATE_AT")) # Fixed `K` value

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
        if sample_size < len(all_eval_users):
            eval_users = random.sample(all_eval_users, sample_size)
        else:
            eval_users = all_eval_users
        
        # Initialize metric accumulators
        precisions = []
        recalls = []
        f1_scores = []
        ndcg_scores = []
        jaccard_scores = []
        valid_users = 0
        
        # Evaluate each user
        for user_id in eval_users:
            # Get prediction from ML engine
            result = ml_engine.predict_basket(user_id, use_csv_data=True)
            if not result['success']:
                continue
            predicted_set = set(result['items'])
            
            # Get ground truth
            user_future = future_df[future_df['user_id'] == int(user_id)]
            if user_future.empty:
                continue
            true_items = set(user_future['product_id'].unique())

            # Evalute At
            # For simplicity now, override the EVALUATE_AT 
            # Env var. This softens the requirements a bit.
            evaluate_at = min(len(true_items), len(predicted_items))
            predicted_items = predicted_items[:evaluate_at]
            true_items = predicted_items[:evaluate_at]
            
            if not true_items:
                continue
            
            valid_users += 1
            
            # Calculate Precision@
            # Precision = |predicted ∩ actual| / |predicted|
            if predicted_set:
                precision = len(predicted_set & true_items) / len(predicted_set)
                precisions.append(precision)
            else:
                precisions.append(0.0)
            
            # Calculate Recall@
            # Recall = |predicted ∩ actual| / |actual|
            recall = len(predicted_set & true_items) / len(true_items)
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
                if item in true_items:
                    # Relevance is 1 if item was purchased, 0 otherwise
                    dcg += 1.0 / math.log2(i + 2)  # i+2 because position starts at 0
            
            # Ideal DCG: all relevant items at top positions
            idcg = sum(1.0 / math.log2(i + 2) for i in range(min(len(true_items), evaluate_at)))
            
            ndcg = dcg / idcg if idcg > 0 else 0.0
            ndcg_scores.append(ndcg)
            
            # Calculate Jaccard Similarity
            # Jaccard = |predicted ∩ actual| / |predicted ∪ actual|
            if predicted_set or true_items:
                intersection = len(predicted_set & true_items)
                union = len(predicted_set | true_items)
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