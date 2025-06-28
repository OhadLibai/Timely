# ml-service/services/evaluation.py
"""
Enhanced evaluation service with complete Next Basket Recommendation metrics
Matches the reference implementation from A-Next-Basket-Recommendation-Reality-Check
"""

import numpy as np
from typing import Dict, List, Any, Tuple, Set
from loguru import logger
import time
from collections import defaultdict
import random
from app.config import config
from app.core.generators import EvaluationSetsGenerator

class EvaluationService:
    """
    Service for evaluating TIFU-KNN model performance with complete NBR metrics
    """
    
    def __init__(self, data_loader, prediction_service):
        self.data_loader = data_loader
        self.prediction_service = prediction_service
        self.evaluation_generator = EvaluationSetsGenerator()
        
    def evaluate_model(self, sample_size: int = None) -> Dict[str, Any]:
        """
        Evaluate model performance with comprehensive NBR metrics
        
        Args:
            sample_size: Number of users to evaluate (None = all users)
            
        Returns:
            Dictionary containing all evaluation metrics
        """
        logger.info(f"Starting comprehensive model evaluation...")
        start_time = time.time()
        
        # Get users with future baskets for evaluation
        eval_users = [
            uid for uid in self.data_loader.user_ids 
            if self.data_loader.get_user_future_basket(uid) is not None
        ]
        
        if not eval_users:
            logger.error("No users with future baskets found for evaluation")
            return {"error": "No evaluation data available"}
        
        # Sample users if requested
        if sample_size and sample_size < len(eval_users):
            eval_users = self.evaluation_generator.stratified_user_sampling(
                {str(uid): self.data_loader.get_user_baskets(uid) for uid in eval_users},
                sample_size
            )
            eval_users = [int(uid) for uid in eval_users]  # Convert back to int
        
        logger.info(f"Evaluating on {len(eval_users)} users")
        
        # Initialize metric collectors
        all_metrics = defaultdict(list)
        user_predictions = {}  # Store for personalization calculation
        
        # Metrics at different k values
        k_values = [5, 10, 20]
        
        # User behavior analysis
        repeat_users = []
        explore_users = []
        
        # Progress tracking
        for idx, user_id in enumerate(eval_users):
            if idx % 100 == 0:
                logger.info(f"Progress: {idx}/{len(eval_users)} users evaluated")
            
            # Get actual next basket
            actual_basket = self.data_loader.get_user_future_basket(user_id)
            if not actual_basket:
                continue
                
            # Get user's historical items
            user_history = set()
            for basket in self.data_loader.get_user_baskets(user_id):
                user_history.update(basket)
            
            # Classify user behavior
            repeat_items = set(actual_basket) & user_history
            explore_items = set(actual_basket) - user_history
            
            if len(repeat_items) > len(explore_items):
                repeat_users.append(user_id)
            else:
                explore_users.append(user_id)
            
            # Generate predictions for different k values
            max_k = max(k_values)
            predicted_items = self.prediction_service.predict_next_basket(
                user_id, k=max_k, exclude_last_order=True
            )
            user_predictions[user_id] = predicted_items
            
            # Calculate metrics for each k
            for k in k_values:
                k_predictions = predicted_items[:k]
                metrics = self._calculate_user_metrics(
                    k_predictions, actual_basket, user_history
                )
                
                for metric_name, value in metrics.items():
                    all_metrics[f"{metric_name}@{k}"].append(value)
            
            # Calculate behavior-specific metrics
            if repeat_items:
                repeat_recall = len(set(predicted_items[:20]) & repeat_items) / len(repeat_items)
                all_metrics['repeat_recall@20'].append(repeat_recall)
                
            if explore_items:
                explore_recall = len(set(predicted_items[:20]) & explore_items) / len(explore_items)
                all_metrics['explore_recall@20'].append(explore_recall)
        
        # Aggregate metrics
        aggregated_metrics = {}
        for metric_name, values in all_metrics.items():
            if values:
                aggregated_metrics[metric_name] = np.mean(values)
        
        # Calculate personalization score
        personalization = self._calculate_personalization(user_predictions)
        aggregated_metrics['personalization_score'] = personalization
        
        # Add user behavior breakdown
        total_eval_users = len(eval_users)
        aggregated_metrics['repeat_users_ratio'] = len(repeat_users) / total_eval_users
        aggregated_metrics['explore_users_ratio'] = len(explore_users) / total_eval_users
        
        # Add evaluation metadata
        aggregated_metrics['users_evaluated'] = len(eval_users)
        aggregated_metrics['evaluation_time'] = time.time() - start_time
        
        logger.info(f"Evaluation complete in {aggregated_metrics['evaluation_time']:.2f} seconds")
        return aggregated_metrics
    
    def _calculate_user_metrics(self, 
                               predicted: List[int], 
                               actual: List[int],
                               user_history: Set[int]) -> Dict[str, float]:
        """
        Calculate comprehensive metrics for a single user
        """
        predicted_set = set(predicted)
        actual_set = set(actual)
        
        # Basic metrics
        true_positives = len(predicted_set & actual_set)
        
        recall = true_positives / len(actual_set) if actual_set else 0.0
        precision = true_positives / len(predicted_set) if predicted_set else 0.0
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
        
        # Hit rate (binary - did we get at least one item right?)
        hit_rate = 1.0 if true_positives > 0 else 0.0
        
        # Coverage of actual basket
        coverage = true_positives / len(actual_set) if actual_set else 0.0
        
        # Novelty (proportion of recommended items not in user history)
        novel_items = predicted_set - user_history
        novelty = len(novel_items) / len(predicted_set) if predicted_set else 0.0
        
        return {
            'recall': recall,
            'precision': precision,
            'f1': f1,
            'hit_rate': hit_rate,
            'coverage': coverage,
            'novelty': novelty
        }
    
    def _calculate_personalization(self, user_predictions: Dict[int, List[int]]) -> float:
        """
        Calculate personalization score (how different recommendations are across users)
        Based on the reference implementation
        """
        if len(user_predictions) < 2:
            return 0.0
            
        # Calculate pairwise differences
        users = list(user_predictions.keys())
        total_pairs = 0
        total_difference = 0
        
        for i in range(len(users)):
            for j in range(i + 1, len(users)):
                set_i = set(user_predictions[users[i]])
                set_j = set(user_predictions[users[j]])
                
                if set_i or set_j:
                    # Jaccard distance
                    intersection = len(set_i & set_j)
                    union = len(set_i | set_j)
                    similarity = intersection / union if union > 0 else 0
                    difference = 1 - similarity
                    
                    total_difference += difference
                    total_pairs += 1
        
        return total_difference / total_pairs if total_pairs > 0 else 0.0
    
    async def cross_validate_model(self, n_folds: int = 5) -> Dict[str, Any]:
        """Cross-validation using enhanced evaluation generators"""
        all_users = [str(uid) for uid in self.data_loader.user_ids]
        folds = self.evaluation_generator.generate_kfold_sets(all_users, n_folds)
        
        fold_results = []
        for i, test_users in enumerate(folds):
            logger.info(f"Running fold {i+1}/{n_folds}")
            
            fold_metrics = {}
            for user_id in test_users[:100]:  # Limit for speed
                user_metrics = self.evaluate_single_user(int(user_id))
                if 'metrics' in user_metrics:
                    for metric, value in user_metrics['metrics'].items():
                        if metric not in fold_metrics:
                            fold_metrics[metric] = []
                        fold_metrics[metric].append(value)
            
            fold_avg = {metric: np.mean(values) for metric, values in fold_metrics.items()}
            fold_results.append(fold_avg)
        
        # Calculate cross-validation metrics
        cv_metrics = {}
        for metric in fold_results[0].keys():
            values = [fold[metric] for fold in fold_results]
            cv_metrics[f'{metric}_mean'] = np.mean(values)
            cv_metrics[f'{metric}_std'] = np.std(values)
        
        return {
            "cv_metrics": cv_metrics,
            "fold_results": fold_results,
            "n_folds": n_folds
        }
    
    def evaluate_single_user(self, user_id: int) -> Dict[str, Any]:
        """
        Detailed evaluation for a single user (for demo purposes)
        """
        # Get actual basket
        actual_basket = self.data_loader.get_user_future_basket(user_id)
        if not actual_basket:
            return {"error": f"No future basket for user {user_id}"}
        
        # Get predictions
        predicted_basket = self.prediction_service.predict_next_basket(
            user_id, k=20, exclude_last_order=True
        )
        
        # Get user history for analysis
        user_history = set()
        for basket in self.data_loader.get_user_baskets(user_id):
            user_history.update(basket)
        
        # Calculate detailed metrics
        predicted_set = set(predicted_basket)
        actual_set = set(actual_basket)
        
        correct_items = predicted_set & actual_set
        repeat_items = actual_set & user_history
        explore_items = actual_set - user_history
        
        return {
            "user_id": user_id,
            "predicted": predicted_basket,
            "actual": list(actual_basket),
            "correct_predictions": list(correct_items),
            "metrics": {
                "recall": len(correct_items) / len(actual_set) if actual_set else 0,
                "precision": len(correct_items) / len(predicted_set) if predicted_set else 0,
                "correct_items": len(correct_items),
                "total_predicted": len(predicted_basket),
                "total_actual": len(actual_basket),
                "repeat_items_in_actual": len(repeat_items),
                "explore_items_in_actual": len(explore_items),
                "user_history_size": len(user_history)
            }
        }