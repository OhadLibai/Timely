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
    confidence: float
    price: Optional[float] = None
    image_url: Optional[str] = None

class PredictionResponse(BaseModel):
    user_id: int
    products: List[ProductInfo]
    algorithm: str = "TIFU-KNN"
    source: str  # "csv" or "database"
    generated_at: datetime

class EvaluationRequest(BaseModel):
    sample_size: Optional[int] = None

class EvaluationResponse(BaseModel):
    metrics: Dict[str, float]
    sample_size: int
    evaluation_time: float
    timestamp: datetime