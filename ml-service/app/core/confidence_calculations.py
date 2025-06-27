# confidence_calculation.py
"""
Real confidence score calculation for TIFU-KNN predictions.
TIFU-KNN doesn't use confidence scores internally.
Placeholder 0.85 can be replaced with actual calculated recommendation confidence.
"""

from typing import List, Dict, Tuple, Any
import numpy as np
from collections import defaultdict

class ConfidenceCalculator:
    """Calculate actual confidence scores for TIFU-KNN predictions"""
    
    @staticmethod
    def calculate_item_confidence(
        item_id: int,
        item_score: float,
        all_scores: Dict[int, float],
        neighbor_contributions: Dict[int, List[Tuple[str, float]]],
        user_history_length: int
    ) -> float:
        """
        Calculate confidence score for a single predicted item
        
        Args:
            item_id: The product ID
            item_score: Raw TIFU-KNN score for this item
            all_scores: All item scores from TIFU-KNN
            neighbor_contributions: Which neighbors contributed to this item
            user_history_length: Number of baskets in user's history
            
        Returns:
            Confidence score between 0 and 1
        """
        
        # 1. Normalized score component (how strong is this item vs others)
        max_score = max(all_scores.values()) if all_scores else 1.0
        normalized_score = item_score / max_score if max_score > 0 else 0.0
        
        # 2. Support component (how many neighbors recommended this)
        contributors = neighbor_contributions.get(item_id, [])
        num_contributors = len(contributors)
        max_possible_contributors = 900  # TIFUKNN_NEIGHBORS
        support_score = min(num_contributors / 100, 1.0)  # Cap at 100 contributors
        
        # 3. Neighbor agreement component (how similar are contributing neighbors)
        neighbor_similarities = [sim for _, sim in contributors]
        if neighbor_similarities:
            avg_similarity = np.mean(neighbor_similarities)
            similarity_std = np.std(neighbor_similarities)
            # High agreement = high avg similarity, low std
            agreement_score = avg_similarity * (1 - min(similarity_std, 0.5))
        else:
            agreement_score = 0.0
        
        # 4. User history component (confidence based on data availability)
        history_score = min(user_history_length / 10, 1.0)  # Cap at 10 orders
        
        # 5. Rank component (top-ranked items get confidence boost)
        sorted_items = sorted(all_scores.items(), key=lambda x: x[1], reverse=True)
        rank = next((i for i, (iid, _) in enumerate(sorted_items) if iid == item_id), 20)
        rank_score = 1.0 - (rank / 20)  # Linear decay for top 20
        
        # Combine components with weights
        confidence = (
            0.30 * normalized_score +      # Item's relative strength
            0.20 * support_score +          # Number of neighbors supporting
            0.20 * agreement_score +        # Neighbor agreement
            0.15 * history_score +          # User data availability
            0.15 * rank_score              # Position in ranking
        )
        
        # Ensure confidence is in [0, 1]
        return max(0.0, min(1.0, confidence))
    
    @staticmethod
    def calculate_basket_confidence(
        predicted_items: List[int],
        item_scores: Dict[int, float],
        neighbor_data: Dict[str, Any],
        user_profile: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calculate confidence metrics for entire predicted basket
        
        Returns:
            Dictionary with overall and per-item confidence scores
        """
        
        # Calculate individual item confidences
        item_confidences = {}
        neighbor_contributions = neighbor_data.get('contributions', {})
        user_history_length = len(user_profile.get('baskets', []))
        
        for item_id in predicted_items:
            confidence = ConfidenceCalculator.calculate_item_confidence(
                item_id=item_id,
                item_score=item_scores.get(item_id, 0.0),
                all_scores=item_scores,
                neighbor_contributions=neighbor_contributions,
                user_history_length=user_history_length
            )
            item_confidences[item_id] = confidence
        
        # Calculate overall basket confidence
        if item_confidences:
            # Weighted average by item rank
            weights = [1.0 / (i + 1) for i in range(len(predicted_items))]
            weighted_sum = sum(
                item_confidences.get(item, 0) * weight 
                for item, weight in zip(predicted_items, weights)
            )
            overall_confidence = weighted_sum / sum(weights)
        else:
            overall_confidence = 0.0
        
        # Calculate additional metrics
        confidence_metrics = {
            'overall': round(overall_confidence, 3),
            'mean': round(np.mean(list(item_confidences.values())), 3) if item_confidences else 0,
            'min': round(min(item_confidences.values()), 3) if item_confidences else 0,
            'max': round(max(item_confidences.values()), 3) if item_confidences else 0,
            'std': round(np.std(list(item_confidences.values())), 3) if item_confidences else 0,
            'per_item': {str(k): round(v, 3) for k, v in item_confidences.items()}
        }
        
        # Add interpretation
        if overall_confidence >= 0.8:
            confidence_metrics['interpretation'] = 'High confidence - Strong prediction'
        elif overall_confidence >= 0.6:
            confidence_metrics['interpretation'] = 'Medium confidence - Good prediction'
        elif overall_confidence >= 0.4:
            confidence_metrics['interpretation'] = 'Low confidence - Uncertain prediction'
        else:
            confidence_metrics['interpretation'] = 'Very low confidence - Weak prediction'
            
        return confidence_metrics

# Example integration in TIFU-KNN:
"""
# In tifuknn_complete.py, modify the predict method to track contributions:

def predict_with_confidence(self, user_id: str, k: int = 20):
    # ... existing prediction logic ...
    
    # Track which neighbors contributed to each item
    neighbor_contributions = defaultdict(list)
    
    for group_id, neighbors in group_neighbors.items():
        for neighbor_id, similarity in neighbors:
            # ... scoring logic ...
            for item in neighbor_basket:
                neighbor_contributions[item].append((neighbor_id, similarity))
    
    # Calculate confidences
    confidence_calc = ConfidenceCalculator()
    confidence_metrics = confidence_calc.calculate_basket_confidence(
        predicted_items=predicted_items,
        item_scores=item_scores,
        neighbor_data={'contributions': neighbor_contributions},
        user_profile={'baskets': user_baskets}
    )
    
    return {
        'items': predicted_items,
        'confidence_metrics': confidence_metrics,
        'item_scores': item_scores
    }
"""

# Example usage in service:
"""
# In prediction service:
result = tifuknn.predict_with_confidence(user_id, k=20)

# For each product in the response:
products = []
for i, item_id in enumerate(result['items']):
    product_info = {
        'product_id': item_id,
        'name': get_product_name(item_id),
        'confidence': result['confidence_metrics']['per_item'].get(str(item_id), 0.5),
        'rank': i + 1
    }
    products.append(product_info)

# Include overall metrics
response = {
    'products': products,
    'confidence_metrics': result['confidence_metrics']
}
"""