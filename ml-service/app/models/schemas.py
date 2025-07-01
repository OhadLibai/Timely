# ml-service/app/models/schemas.py
"""
DEFINITIVE: Only schemas that are ACTUALLY used in the codebase
Based on research of current API endpoints and evaluation_api.py
"""

from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

# ==================================================================================
# CORE PREDICTION SCHEMAS - Used by prediction_api.py
# ==================================================================================

class PredictionRequest(BaseModel):
    """Used by /predict endpoint"""
    user_id: int
    k: Optional[int] = None
    exclude_last_order: Optional[bool] = False

class ProductInfo(BaseModel):
    """Used in all prediction responses"""
    product_id: int
    name: str
    price: Optional[float] = None
    image_url: Optional[str] = None

class PredictionResponse(BaseModel):
    """Used by /predict endpoint response"""
    user_id: int
    predicted_items: List[int]
    products: List[ProductInfo]
    algorithm: str = "TIFU-KNN"
    source: str
    k_used: int
    generated_at: datetime

# ==================================================================================
# EVALUATION SCHEMAS - Used by evaluation_api.py
# ==================================================================================

class EvaluationRequest(BaseModel):
    """Used by /evaluate endpoint"""
    sample_size: Optional[int] = None

class EvaluationResponse(BaseModel):
    """Used by evaluation_api.py - CONFIRMED with actual endpoint"""
    evaluation_id: Optional[str] = None  # For async jobs
    status: Optional[str] = "completed"
    metrics: Dict[str, float]
    sample_size: Any  # Can be int or "all"
    users_evaluated: int = 0
    evaluation_time: float
    timestamp: datetime
    message: Optional[str] = None

class MetricsVisualization(BaseModel):
    """Used by evaluation_api.py /metrics/visualization endpoint"""
    metric_type: str
    chart_data: Dict[str, Any]
    summary_stats: Dict[str, float]
    generated_at: datetime


# ==================================================================================
# SCHEMAS WE CAN ELIMINATE (not used in current API endpoints):
# ==================================================================================

# ❌ UserEvaluationRequest/Response - /evaluate-user returns Dict directly
# ❌ UserStatsResponse - not used in current endpoints
# ❌ DemoPredictionResponse - same as PredictionResponse
# ❌ ModelPerformanceResponse - evaluation returns Dict
# ❌ PopularItemsResponse - same as PredictionResponse