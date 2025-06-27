# ml-service/services/evaluation.py
import numpy as np
from typing import Dict, List, Any
from loguru import logger
import time
from collections import defaultdict

class EvaluationService:
    """
    Service for evaluating TIFU-KNN model performance
    """
    
    def __init__(self, data_loader, prediction_service):
        self.data_loader = data_loader
        self.prediction_service = prediction_service
    
    def evaluate_model(self, sample_size: int = 100) -> Dict[str, Any]:
        """
        Evaluate model performance on a sample of users
        
        Args:
            sample_size: Number of users to evaluate
            
        Returns:
            Dictionary containing evaluation metrics
        """
        logger.info(f"Starting model evaluation with sample_size={sample_size}")
        start_time = time.time()
        
        # Get users with future baskets for evaluation
        eval_users = [
            uid for uid in self.data_loader.user_ids 
            if self.data_loader.get_user_future_basket(uid) is not None
        ]
        
        if not eval_users:
            logger.error("No users with future baskets found for evaluation")
            return {"error": "No evaluation data available"}
        
        # Sample users
        if sample_size < len(eval_users):
            import random
            random.seed(42)  # For reproducibility
            eval_users = random.sample(eval_users, sample_size)
        
        logger.info(f"Evaluating on {len(eval_users)} users")
        
        # Initialize metric collectors
        recalls = defaultdict(list)  # recall@k for different k values
        precisions = defaultdict(list)
        f1_scores = defaultdict(list)
        hit_rates = defaultdict(int)
        
        # User type analysis
        repeat_recalls = []
        explore_recalls = []
        
        k_values = [5, 10, 20]  # Different basket sizes to evaluate
        
        # Evaluate each user
        for idx, user_id in enumerate(eval_users):
            if idx % 50 == 0:
                logger.info(f"Progress: {idx}/{len(eval_users)} users evaluated")
            
            # Get actual next basket
            actual_basket = self.data_loader.get_user_future_basket(user_id)
            if not actual_basket:
                continue
            
            actual_set = set(actual_basket)
            
            # Get user's historical items
            user_baskets = self.data_loader.get_user_baskets(user_id)
            historical_items = set(item for basket in user_baskets for item in basket)
            
            # Classify actual items as repeat or explore
            repeat_items = actual_set.intersection(historical_items)
            explore_items = actual_set - historical_items
            
            # Get predictions for different k values
            max_k = max(k_values)
            predictions = self.prediction_service.predict_next_basket(
                user_id, k=max_k, exclude_last_order=True
            )
            
            # Calculate metrics for each k
            for k in k_values:
                pred_k = set(predictions[:k])
                
                # Intersection
                correct = pred_k.intersection(actual_set)
                
                # Recall: what fraction of actual items were predicted
                if actual_set:
                    recall = len(correct) / len(actual_set)
                    recalls[k].append(recall)
                
                # Precision: what fraction of predictions were correct
                if pred_k:
                    precision = len(correct) / len(pred_k)
                    precisions[k].append(precision)
                
                # F1 score
                if recall > 0 or precision > 0:
                    f1 = 2 * (precision * recall) / (precision + recall)
                    f1_scores[k].append(f1)
                else:
                    f1_scores[k].append(0)
                
                # Hit rate: was at least one item correct
                if correct:
                    hit_rates[k] += 1
            
            # Separate recall for repeat vs explore items
            if repeat_items:
                repeat_correct = pred_k.intersection(repeat_items)
                repeat_recall = len(repeat_correct) / len(repeat_items)
                repeat_recalls.append(repeat_recall)
            
            if explore_items:
                explore_correct = pred_k.intersection(explore_items)
                explore_recall = len(explore_correct) / len(explore_items)
                explore_recalls.append(explore_recall)
        
        # Calculate average metrics
        metrics = {
            "sample_size": len(eval_users),
            "evaluation_time_seconds": round(time.time() - start_time, 2)
        }
        
        # Add metrics for each k
        for k in k_values:
            if recalls[k]:
                metrics[f"recall@{k}"] = round(np.mean(recalls[k]), 4)
                metrics[f"precision@{k}"] = round(np.mean(precisions[k]), 4)
                metrics[f"f1@{k}"] = round(np.mean(f1_scores[k]), 4)
                metrics[f"hit_rate@{k}"] = round(hit_rates[k] / len(eval_users), 4)
        
        # Add repeat vs explore analysis
        if repeat_recalls:
            metrics["repeat_recall@20"] = round(np.mean(repeat_recalls), 4)
        if explore_recalls:
            metrics["explore_recall@20"] = round(np.mean(explore_recalls), 4)
        
        # Add personalization metric
        metrics["personalization_score"] = self._calculate_personalization(
            eval_users[:min(100, len(eval_users))]
        )
        
        logger.info(f"Evaluation completed in {metrics['evaluation_time_seconds']}s")
        logger.info(f"Recall@20: {metrics.get('recall@20', 'N/A')}")
        
        return metrics
    
    def _calculate_personalization(self, users: List[int]) -> float:
        """
        Calculate personalization score (how different recommendations are across users)
        """
        if len(users) < 2:
            return 0.0
        
        user_recommendations = {}
        for user_id in users:
            recs = self.prediction_service.predict_next_basket(
                user_id, k=20, exclude_last_order=True
            )
            user_recommendations[user_id] = set(recs)
        
        # Calculate pairwise differences
        differences = []
        user_list = list(user_recommendations.keys())
        
        for i in range(len(user_list)):
            for j in range(i + 1, len(user_list)):
                recs1 = user_recommendations[user_list[i]]
                recs2 = user_recommendations[user_list[j]]
                
                if recs1 or recs2:
                    # Jaccard distance
                    intersection = len(recs1.intersection(recs2))
                    union = len(recs1.union(recs2))
                    if union > 0:
                        similarity = intersection / union
                        differences.append(1 - similarity)
        
        if differences:
            return round(np.mean(differences), 4)
        return 0.0
    
    def evaluate_single_user(self, user_id: int) -> Dict[str, Any]:
        """
        Detailed evaluation for a single user
        """
        actual_basket = self.data_loader.get_user_future_basket(user_id)
        if not actual_basket:
            return {"error": f"No future basket found for user {user_id}"}
        
        # Get predictions
        predictions = self.prediction_service.predict_next_basket(
            user_id, k=20, exclude_last_order=True
        )
        
        # Calculate metrics
        actual_set = set(actual_basket)
        pred_set = set(predictions[:len(actual_basket)])
        correct = pred_set.intersection(actual_set)
        
        # Get user history
        user_baskets = self.data_loader.get_user_baskets(user_id)
        historical_items = set(item for basket in user_baskets for item in basket)
        
        # Classify items
        repeat_items = actual_set.intersection(historical_items)
        explore_items = actual_set - historical_items
        
        return {
            "user_id": user_id,
            "actual_basket_size": len(actual_basket),
            "predicted_basket_size": len(predictions),
            "correct_predictions": len(correct),
            "recall": round(len(correct) / len(actual_set) if actual_set else 0, 3),
            "precision": round(len(correct) / len(pred_set) if pred_set else 0, 3),
            "repeat_items_count": len(repeat_items),
            "explore_items_count": len(explore_items),
            "historical_basket_count": len(user_baskets),
            "historical_unique_items": len(historical_items)
        }