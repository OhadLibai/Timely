# ml-service/app/services/evaluation.py
"""
CLEANED: Evaluation Service - Service Orchestrator for Model Performance Evaluation
Implements complete NBR evaluation metrics matching reference implementation
"""

import numpy as np
from typing import Dict, List, Any, Tuple, Set, Optional
from loguru import logger
import time
from collections import defaultdict
import random
from app.config import config
from app.core.generators import EvaluationSetsGenerator

class EvaluationService:
    """
    SERVICE ORCHESTRATOR: Handles all evaluation tasks for TIFU-KNN model
    
    This is the SINGLE ENTRY POINT for all evaluation requests from backend.
    
    Responsibilities:
    - Centralized home for ALL metric calculations
    - Global evaluation logic (triggered by /evaluate)
    - Individual evaluation logic (triggered by /evaluate-user)  
    - Uses prediction service as intermediary (NO direct TIFUKNN calls)
    - In-memory evaluation (NO database persistence)
    
    Evaluation Contexts with Different K Values:
    - Overall performance: k=20 (standard NBR evaluation)
    - Precision-focused: k=10 (higher precision, lower recall)
    - Recall-focused: k=50 (higher recall, lower precision) 
    - Quick evaluation: k=5 (fast assessment)
    """
    
    def __init__(self, data_loader, prediction_service):
        self.data_loader = data_loader
        self.prediction_service = prediction_service  # Uses this as intermediary
        self.evaluation_generator = EvaluationSetsGenerator()
        
        logger.info("Evaluation service initialized")
    
    # ==================================================================================
    # MAIN EVALUATION ENDPOINTS - Called by Backend API
    # ==================================================================================
    
    def evaluate_model_performance(self, sample_size: int = None) -> Dict[str, Any]:
        """
        GLOBAL EVALUATION LOGIC: Complete model evaluation on multiple users
        
        This is triggered by backend /evaluate endpoint.
        Implements the evaluation pipeline from A-Next-Basket-Recommendation-Reality-Check
        
        Args:
            sample_size: Number of users to evaluate (None = all users)
            
        Returns:
            Dictionary containing comprehensive evaluation metrics
        """
        logger.info(f"Starting comprehensive model evaluation (sample_size={sample_size})...")
        start_time = time.time()
        
        # Get users with future baskets for evaluation
        eval_users = [
            uid for uid in self.data_loader.user_ids 
            if self.data_loader.get_user_future_basket(uid) is not None
        ]
        
        if not eval_users:
            logger.error("No users with future baskets found for evaluation")
            return {"error": "No evaluation data available"}
        
        # Apply stratified sampling if requested
        if sample_size and sample_size < len(eval_users):
            eval_users = self._apply_stratified_sampling(eval_users, sample_size)
        
        logger.info(f"Evaluating on {len(eval_users)} users")
        
        # Initialize metric collectors for different K values
        k_values = [5, 10, 20, 50]  # Different evaluation contexts
        all_metrics = {k: defaultdict(list) for k in k_values}
        
        # User behavior analysis (repeat vs explore)
        repeat_users = []
        explore_users = []
        
        # Progress tracking
        for idx, user_id in enumerate(eval_users):
            if idx % 100 == 0:
                logger.info(f"Progress: {idx}/{len(eval_users)} users evaluated")
            
            # Get actual next basket (ground truth)
            actual_basket = self.data_loader.get_user_future_basket(user_id)
            if not actual_basket:
                continue
            
            # Classify user behavior (repeat vs explore)
            user_history = set()
            for basket in self.data_loader.get_user_baskets(user_id):
                user_history.update(basket)
            
            repeat_items = set(actual_basket) & user_history
            explore_items = set(actual_basket) - user_history
            
            # Classify user type
            if len(repeat_items) > len(explore_items):
                repeat_users.append(user_id)
            else:
                explore_users.append(user_id)
            
            # Evaluate at different K values
            for k in k_values:
                try:
                    # Use prediction service as intermediary
                    predicted_basket = self.prediction_service.predict_for_evaluation(
                        user_id=user_id, k=k, exclude_last=True
                    )
                    
                    # Calculate metrics using centralized functions
                    user_metrics = self._calculate_user_metrics(
                        predicted_basket, actual_basket, user_history
                    )
                    
                    # Collect metrics for this K value
                    for metric_name, value in user_metrics.items():
                        all_metrics[k][metric_name].append(value)
                        
                except Exception as e:
                    logger.error(f"Evaluation failed for user {user_id} at k={k}: {e}")
                    continue
        
        # Aggregate results
        evaluation_time = time.time() - start_time
        
        results = {
            'evaluation_summary': {
                'total_users_evaluated': len(eval_users),
                'repeat_users': len(repeat_users),
                'explore_users': len(explore_users),
                'evaluation_time_seconds': evaluation_time,
                'timestamp': time.time()
            },
            'performance_by_k': {},
            'user_behavior_analysis': {
                'repeat_user_ratio': len(repeat_users) / len(eval_users) if eval_users else 0,
                'explore_user_ratio': len(explore_users) / len(eval_users) if eval_users else 0
            }
        }
        
        # Calculate aggregate metrics for each K value
        for k in k_values:
            if k in all_metrics and all_metrics[k]:
                k_results = self._aggregate_metrics(all_metrics[k])
                results['performance_by_k'][f'k_{k}'] = k_results
        
        # Add repeat/explore analysis
        results['repeat_explore_analysis'] = self._analyze_repeat_explore_performance(
            repeat_users, explore_users
        )
        
        logger.info(f"Model evaluation complete in {evaluation_time:.2f}s")
        logger.info(f"Results at k=20: Recall={results['performance_by_k'].get('k_20', {}).get('recall_mean', 0):.3f}, "
                   f"Precision={results['performance_by_k'].get('k_20', {}).get('precision_mean', 0):.3f}")
        
        return results
    
    def evaluate_single_user_performance(self, user_id: int) -> Dict[str, Any]:
        """
        INDIVIDUAL EVALUATION LOGIC: Detailed evaluation for single user
        
        This is triggered by backend /evaluate-user endpoint.
        Used for admin interface to analyze specific user performance.
        
        Args:
            user_id: User ID to evaluate
            
        Returns:
            Dictionary with detailed user evaluation results
        """
        logger.info(f"Evaluating individual user {user_id}")
        
        try:
            # Get actual basket (ground truth)
            actual_basket = self.data_loader.get_user_future_basket(user_id)
            if not actual_basket:
                return {"error": f"No future basket found for user {user_id}"}
            
            # Get user's historical baskets
            user_baskets = self.data_loader.get_user_baskets(user_id)
            if not user_baskets:
                return {"error": f"No historical baskets found for user {user_id}"}
            
            # Use prediction service as intermediary
            predicted_basket = self.prediction_service.predict_for_evaluation(
                user_id=user_id, k=20, exclude_last=True
            )
            
            # Analyze user's historical behavior
            user_history = set()
            for basket in user_baskets:
                user_history.update(basket)
            
            # Detailed analysis
            predicted_set = set(predicted_basket)
            actual_set = set(actual_basket)
            correct_items = predicted_set & actual_set
            repeat_items = actual_set & user_history
            explore_items = actual_set - user_history
            
            # Calculate comprehensive metrics
            metrics = self._calculate_user_metrics(predicted_basket, actual_basket, user_history)
            
            return {
                "user_id": user_id,
                "prediction_results": {
                    "predicted": predicted_basket,
                    "actual": list(actual_basket),
                    "correct_predictions": list(correct_items)
                },
                "performance_metrics": metrics,
                "behavior_analysis": {
                    "user_history_size": len(user_history),
                    "total_baskets": len(user_baskets),
                    "repeat_items_in_actual": len(repeat_items),
                    "explore_items_in_actual": len(explore_items),
                    "repeat_ratio": len(repeat_items) / len(actual_basket) if actual_basket else 0,
                    "explore_ratio": len(explore_items) / len(actual_basket) if actual_basket else 0
                },
                "detailed_analysis": {
                    "correctly_predicted_repeat": len(correct_items & repeat_items),
                    "correctly_predicted_explore": len(correct_items & explore_items),
                    "missed_repeat": len(repeat_items - predicted_set),
                    "missed_explore": len(explore_items - predicted_set),
                    "false_positive_repeat": len((predicted_set - actual_set) & user_history),
                    "false_positive_explore": len((predicted_set - actual_set) - user_history)
                }
            }
            
        except Exception as e:
            logger.error(f"Individual user evaluation failed for {user_id}: {e}")
            return {"error": f"Evaluation failed: {str(e)}"}
    
    # ==================================================================================
    # CENTRALIZED METRIC CALCULATION FUNCTIONS
    # ==================================================================================
    
    def _calculate_user_metrics(self, predicted: List[int], actual: List[int], 
                               user_history: Set[int]) -> Dict[str, float]:
        """
        CENTRALIZED METRIC CALCULATIONS: All business metrics calculated here
        
        Args:
            predicted: List of predicted items
            actual: List of actual items (ground truth)
            user_history: Set of items user has purchased before
            
        Returns:
            Dictionary with all calculated metrics
        """
        predicted_set = set(predicted)
        actual_set = set(actual)
        
        # Basic metrics
        tp = len(predicted_set & actual_set)
        fp = len(predicted_set - actual_set)
        fn = len(actual_set - predicted_set)
        
        # Standard NBR metrics
        recall = tp / len(actual_set) if actual_set else 0.0
        precision = tp / len(predicted_set) if predicted_set else 0.0
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
        hit_rate = 1.0 if tp > 0 else 0.0
        
        # Repeat/Explore analysis
        repeat_items_actual = actual_set & user_history
        explore_items_actual = actual_set - user_history
        
        repeat_tp = len(predicted_set & repeat_items_actual)
        explore_tp = len(predicted_set & explore_items_actual)
        
        repeat_recall = repeat_tp / len(repeat_items_actual) if repeat_items_actual else 0.0
        explore_recall = explore_tp / len(explore_items_actual) if explore_items_actual else 0.0
        
        # Coverage metrics
        coverage = len(predicted_set) / len(predicted) if predicted else 0.0
        
        return {
            'recall': recall,
            'precision': precision,
            'f1': f1,
            'hit_rate': hit_rate,
            'repeat_recall': repeat_recall,
            'explore_recall': explore_recall,
            'coverage': coverage,
            'true_positives': tp,
            'false_positives': fp,
            'false_negatives': fn,
            'repeat_items_actual': len(repeat_items_actual),
            'explore_items_actual': len(explore_items_actual)
        }
    
    def _calculate_ndcg(self, predicted: List[int], actual: List[int], k: int = 20) -> float:
        """
        Calculate Normalized Discounted Cumulative Gain (NDCG)
        
        Args:
            predicted: List of predicted items (ranked)
            actual: List of actual items
            k: Cutoff for NDCG calculation
            
        Returns:
            NDCG@k score
        """
        actual_set = set(actual)
        
        # Calculate DCG
        dcg = 0.0
        for i, item in enumerate(predicted[:k]):
            if item in actual_set:
                dcg += 1.0 / np.log2(i + 2)  # i+2 because log2(1) = 0
        
        # Calculate IDCG (perfect ranking)
        idcg = 0.0
        for i in range(min(len(actual), k)):
            idcg += 1.0 / np.log2(i + 2)
        
        return dcg / idcg if idcg > 0 else 0.0
    
    def _calculate_mrr(self, predicted: List[int], actual: List[int]) -> float:
        """
        Calculate Mean Reciprocal Rank (MRR)
        
        Args:
            predicted: List of predicted items (ranked)
            actual: List of actual items
            
        Returns:
            MRR score
        """
        actual_set = set(actual)
        
        for i, item in enumerate(predicted):
            if item in actual_set:
                return 1.0 / (i + 1)
        
        return 0.0
    
    # ==================================================================================
    # ANALYSIS AND AGGREGATION METHODS
    # ==================================================================================
    
    def _aggregate_metrics(self, metrics_dict: Dict[str, List[float]]) -> Dict[str, float]:
        """
        Aggregate individual user metrics into summary statistics
        
        Args:
            metrics_dict: Dictionary of metric name -> list of values
            
        Returns:
            Dictionary with aggregated metrics (mean, std, etc.)
        """
        aggregated = {}
        
        for metric_name, values in metrics_dict.items():
            if values:
                aggregated[f'{metric_name}_mean'] = np.mean(values)
                aggregated[f'{metric_name}_std'] = np.std(values)
                aggregated[f'{metric_name}_median'] = np.median(values)
                aggregated[f'{metric_name}_min'] = np.min(values)
                aggregated[f'{metric_name}_max'] = np.max(values)
            else:
                aggregated[f'{metric_name}_mean'] = 0.0
                aggregated[f'{metric_name}_std'] = 0.0
                aggregated[f'{metric_name}_median'] = 0.0
                aggregated[f'{metric_name}_min'] = 0.0
                aggregated[f'{metric_name}_max'] = 0.0
        
        return aggregated
    
    def _analyze_repeat_explore_performance(self, repeat_users: List[int], 
                                          explore_users: List[int]) -> Dict[str, Any]:
        """
        Analyze model performance on repeat vs explore users
        
        Args:
            repeat_users: List of repeat-focused user IDs
            explore_users: List of explore-focused user IDs
            
        Returns:
            Dictionary with repeat/explore analysis
        """
        analysis = {
            'repeat_users_performance': {},
            'explore_users_performance': {},
            'performance_gap': {}
        }
        
        try:
            # Evaluate repeat users
            if repeat_users:
                repeat_metrics = self._evaluate_user_subset(repeat_users[:100])  # Sample for performance
                analysis['repeat_users_performance'] = repeat_metrics
            
            # Evaluate explore users  
            if explore_users:
                explore_metrics = self._evaluate_user_subset(explore_users[:100])  # Sample for performance
                analysis['explore_users_performance'] = explore_metrics
            
            # Calculate performance gaps
            if repeat_users and explore_users:
                repeat_recall = analysis['repeat_users_performance'].get('recall_mean', 0)
                explore_recall = analysis['explore_users_performance'].get('recall_mean', 0)
                
                analysis['performance_gap'] = {
                    'recall_gap': repeat_recall - explore_recall,
                    'favors': 'repeat_users' if repeat_recall > explore_recall else 'explore_users'
                }
                
        except Exception as e:
            logger.error(f"Repeat/explore analysis failed: {e}")
            analysis['error'] = str(e)
        
        return analysis
    
    def _evaluate_user_subset(self, user_ids: List[int]) -> Dict[str, float]:
        """
        Evaluate a subset of users for performance analysis
        
        Args:
            user_ids: List of user IDs to evaluate
            
        Returns:
            Dictionary with aggregated metrics
        """
        metrics = defaultdict(list)
        
        for user_id in user_ids:
            try:
                actual_basket = self.data_loader.get_user_future_basket(user_id)
                if not actual_basket:
                    continue
                
                predicted_basket = self.prediction_service.predict_for_evaluation(
                    user_id=user_id, k=20, exclude_last=True
                )
                
                user_history = set()
                for basket in self.data_loader.get_user_baskets(user_id):
                    user_history.update(basket)
                
                user_metrics = self._calculate_user_metrics(
                    predicted_basket, actual_basket, user_history
                )
                
                for metric_name, value in user_metrics.items():
                    metrics[metric_name].append(value)
                    
            except Exception as e:
                logger.error(f"Failed to evaluate user {user_id}: {e}")
                continue
        
        return self._aggregate_metrics(metrics)
    
    def _apply_stratified_sampling(self, user_ids: List[int], sample_size: int) -> List[int]:
        """
        Apply stratified sampling to get representative user sample
        
        Args:
            user_ids: List of all available user IDs
            sample_size: Desired sample size
            
        Returns:
            List of sampled user IDs
        """
        try:
            # Build history for stratified sampling
            user_history = {}
            for uid in user_ids:
                baskets = self.data_loader.get_user_baskets(uid)
                if baskets:
                    user_history[str(uid)] = baskets
            
            # Use evaluation generator for stratified sampling
            sampled_user_ids = self.evaluation_generator.stratified_user_sampling(
                user_history, sample_size
            )
            
            # Convert back to integers
            return [int(uid) for uid in sampled_user_ids]
            
        except Exception as e:
            logger.error(f"Stratified sampling failed: {e}")
            # Fallback to random sampling
            random.seed(config.EVALUATION_RANDOM_SEED)
            return random.sample(user_ids, min(sample_size, len(user_ids)))