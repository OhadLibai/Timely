# app/models/types.py
"""
Type definitions for ML service
Only include if need shared types across modules
"""

from typing import List, Dict, Optional, TypedDict, Union, Tuple

# Type aliases for clarity
UserId = Union[int, str]  # Can be int (Instacart) or string (UUID)
ProductId = int  # Instacart product ID
Basket = List[ProductId]  # List of product IDs
UserHistory = List[Basket]  # List of baskets

# Score types
Score = float  # 0.0 to 1.0
ItemScore = Tuple[ProductId, Score]

# TypedDict for structured data (requires Python 3.8+)
class PredictionResult(TypedDict):
    items: List[ProductId]
    scores: Dict[ProductId, Score]
    confidence: float
    metadata: Optional[Dict]

class EvaluationMetrics(TypedDict):
    recall: float
    precision: float
    f1: float
    hit_rate: float

class UserProfile(TypedDict):
    user_id: UserId
    basket_count: int
    total_items: int
    unique_items: int
    frequency_map: Dict[ProductId, int]

# Constants
MAX_PREDICTION_ITEMS = 20
MIN_BASKETS_FOR_PREDICTION = 1
DEFAULT_CONFIDENCE = 0.75