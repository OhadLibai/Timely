# ml-service/models/schemas.py
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime

# ============================================================================
# PREDICTION SCHEMAS
# ============================================================================

class PredictionRequest(BaseModel):
    """Request for next basket prediction"""
    user_id: int = Field(..., description="User ID to predict for")
    k: Optional[int] = Field(20, description="Number of items to recommend", ge=1, le=50)
    exclude_last_order: Optional[bool] = Field(False, description="Exclude last order for evaluation")

class ProductInfo(BaseModel):
    """Product information"""
    product_id: int
    product_name: str
    aisle: Optional[str] = "Unknown"
    department: Optional[str] = "Unknown"

class PredictionResponse(BaseModel):
    """Response for next basket prediction"""
    user_id: int
    predicted_products: List[ProductInfo]
    confidence_score: float = Field(..., ge=0, le=1)
    model_version: str

# ============================================================================
# EVALUATION SCHEMAS
# ============================================================================

class EvaluationRequest(BaseModel):
    """Request for model evaluation"""
    sample_size: Optional[int] = Field(100, description="Number of users to evaluate", ge=1, le=10000)

class EvaluationMetrics(BaseModel):
    """Evaluation metrics"""
    sample_size: int
    evaluation_time_seconds: float
    recall_at_5: Optional[float] = Field(None, alias="recall@5")
    recall_at_10: Optional[float] = Field(None, alias="recall@10")
    recall_at_20: Optional[float] = Field(None, alias="recall@20")
    precision_at_5: Optional[float] = Field(None, alias="precision@5")
    precision_at_10: Optional[float] = Field(None, alias="precision@10")
    precision_at_20: Optional[float] = Field(None, alias="precision@20")
    f1_at_5: Optional[float] = Field(None, alias="f1@5")
    f1_at_10: Optional[float] = Field(None, alias="f1@10")
    f1_at_20: Optional[float] = Field(None, alias="f1@20")
    hit_rate_at_5: Optional[float] = Field(None, alias="hit_rate@5")
    hit_rate_at_10: Optional[float] = Field(None, alias="hit_rate@10")
    hit_rate_at_20: Optional[float] = Field(None, alias="hit_rate@20")
    repeat_recall_at_20: Optional[float] = Field(None, alias="repeat_recall@20")
    explore_recall_at_20: Optional[float] = Field(None, alias="explore_recall@20")
    personalization_score: Optional[float]

    class Config:
        populate_by_name = True

class EvaluationResponse(BaseModel):
    """Response for model evaluation"""
    metrics: Dict[str, Any]  # Using dict for flexibility with metric names
    evaluation_date: str
    sample_size: int
    model_version: str

# ============================================================================
# DEMO DATA SCHEMAS
# ============================================================================

class OrderProduct(BaseModel):
    """Product in an order"""
    product_id: int
    product_name: str

class OrderInfo(BaseModel):
    """Order information"""
    order_sequence: int
    products: List[OrderProduct]
    days_since_prior_order: Optional[float]
    order_dow: int = Field(..., ge=0, le=6)
    order_hour_of_day: int = Field(..., ge=0, le=23)

class UserOrderHistory(BaseModel):
    """User's order history"""
    user_id: int
    orders: List[OrderInfo]
    total_orders: int

class DemoUserPrediction(BaseModel):
    """Demo prediction comparison"""
    user_id: int
    predicted_basket: List[OrderProduct]
    actual_basket: List[OrderProduct]
    metrics: Dict[str, Any]

# ============================================================================
# HEALTH CHECK SCHEMAS
# ============================================================================

class DataLoadStatus(BaseModel):
    """Data loading status"""
    users: int
    products: int
    orders: int
    future_baskets: int

class HealthCheckResponse(BaseModel):
    """Health check response"""
    status: str
    timestamp: str
    database_available: bool
    data_loaded: DataLoadStatus
    model_loaded: bool
    version: str