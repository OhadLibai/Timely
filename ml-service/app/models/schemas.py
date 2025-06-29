from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class PredictionRequest(BaseModel):
    user_id: int
    k: Optional[int] = 20
    exclude_last_order: Optional[bool] = False

class ProductInfo(BaseModel):
    product_id: int
    name: str
    price: Optional[float] = None
    image_url: Optional[str] = None

class PredictionResponse(BaseModel):
    user_id: int
    predicted_items: List[int]
    products: List[ProductInfo]
    algorithm: str = "TIFU-KNN"
    source: str  # "csv" or "database"
    k_used: int  # Actual K value used
    generated_at: datetime

class EvaluationRequest(BaseModel):
    sample_size: Optional[int] = None

class EvaluationResponse(BaseModel):
    metrics: Dict[str, float]
    sample_size: int
    evaluation_time: float
    k_used: int
    timestamp: datetime

class UserEvaluationRequest(BaseModel):
    """Request schema for single user evaluation"""
    user_id: int
    k: Optional[int] = None

class UserEvaluationResponse(BaseModel):
    """Response schema for single user evaluation"""
    user_id: int
    prediction_results: Dict[str, Any]
    performance_metrics: Dict[str, float]
    behavior_analysis: Dict[str, Any]
    detailed_analysis: Dict[str, Any]
    k_used: int

class UserStatsResponse(BaseModel):
    """User statistics response - NO confidence fields"""
    user_id: int
    total_orders: int
    total_items: int
    unique_items: int
    avg_basket_size: float
    temporal_patterns: Dict[str, Any]

class DemoPredictionResponse(BaseModel):
    """Demo prediction response for seeded users - NO confidence fields"""
    user_id: str
    instacart_user_id: Optional[int]
    products: List[ProductInfo]
    predicted_items: List[int]
    basket_count: int
    source: str
    algorithm: str = "TIFU-KNN"
    temporal_patterns_detected: Dict[str, Any]
    k_used: int
    generated_at: datetime

class ModelPerformanceResponse(BaseModel):
    """Model performance evaluation response"""
    evaluation_summary: Dict[str, Any]
    performance_by_k: Dict[str, Dict[str, float]]
    user_behavior_analysis: Dict[str, Any]
    repeat_explore_analysis: Dict[str, Any]

class PopularItemsResponse(BaseModel):
    """Popular items fallback response - NO confidence fields"""
    products: List[ProductInfo]
    source: str = "global_popularity"
    algorithm: str = "frequency_based"
    