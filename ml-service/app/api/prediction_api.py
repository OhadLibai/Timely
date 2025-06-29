# ml-service/app/api/prediction_api.py
"""
MINIMAL API: Only essential endpoints for the 4 app demands
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from datetime import datetime
from loguru import logger

from app.models.schemas import (
    PredictionRequest, 
    PredictionResponse,
    EvaluationRequest,
    EvaluationResponse
)
from app.services.prediction import PredictionService
from app.services.evaluation import EvaluationService

router = APIRouter()

def get_prediction_service() -> PredictionService:
    from app.main import app
    return app.state.prediction_service

def get_evaluation_service() -> EvaluationService:
    from app.main import app
    return app.state.evaluation_service

# ============================================================================
# CORE ENDPOINTS - Only what we need for the 4 demands
# ============================================================================

@router.post("/predict", response_model=PredictionResponse)
async def predict(
    request: PredictionRequest,
    service: PredictionService = Depends(get_prediction_service)
):
    """
    SINGLE PREDICTION ENDPOINT
    Handles both CSV and database sources automatically
    """
    try:
        result = service.predict(
            user_id=request.user_id,
            k=request.k,
            exclude_last=request.exclude_last_order
        )
        
        return PredictionResponse(
            user_id=request.user_id,
            predicted_items=result['item_ids'],
            products=result['products'],
            algorithm="TIFU-KNN",
            source=result['source'],
            k_used=result['k_used'],
            generated_at=datetime.utcnow()
        )
        
    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/evaluate", response_model=EvaluationResponse)
async def evaluate_model(
    request: EvaluationRequest,
    evaluation_service: EvaluationService = Depends(get_evaluation_service)
):
    """
    MODEL EVALUATION ENDPOINT
    For admin model performance analysis
    """
    try:
        results = evaluation_service.evaluate_model_performance(request.sample_size)
        
        # Extract main metrics
        k20_metrics = results['performance_by_k'].get('k_20', {})
        
        return EvaluationResponse(
            metrics=k20_metrics,
            sample_size=results['evaluation_summary']['total_users_evaluated'],
            evaluation_time=results['evaluation_summary']['evaluation_time_seconds'],
            timestamp=datetime.utcnow()
        )
        
    except Exception as e:
        logger.error(f"Evaluation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/evaluate-user/{user_id}")
async def evaluate_user(
    user_id: int,
    evaluation_service: EvaluationService = Depends(get_evaluation_service)
):
    """
    INDIVIDUAL USER EVALUATION
    For admin individual user analysis
    """
    try:
        return evaluation_service.evaluate_single_user_performance(user_id)
    except Exception as e:
        logger.error(f"User evaluation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# THAT'S IT! Simple and clean.
# ============================================================================

# Removed all the bloated endpoints:
# - predict-from-csv (merged into /predict)
# - predict-from-database (merged into /predict) 
# - auto-generate-basket (this should be in backend, not ML service)
# - evaluate-model-detailed (can return detailed data from /evaluate)
# - evaluate-user (simplified to return dict)
# - evaluate-user-live (unnecessary complexity)
# - status (belongs in health check)
# - user-stats (can be computed in backend)