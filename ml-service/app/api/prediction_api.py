# ml-service/app/api/prediction_api.py
"""
Prediction API endpoints for TIFU-KNN next basket recommendation
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Dict, Any, List, Optional
from datetime import datetime
from loguru import logger
import os
from dotenv import load_dotenv
from pathlib import Path
from app.config import config

from app.models.schemas import (
    PredictionRequest, 
    PredictionResponse,
    ProductInfo,
    UserStatsResponse,
    DemoPredictionResponse
)
from app.services.prediction import PredictionService
from app.core.database import get_db_connection

# Load root .env
root_dir = Path(__file__).parent.parent.parent.parent
load_dotenv(root_dir / '.env')

router = APIRouter()

def get_prediction_service() -> PredictionService:
    """Dependency to get prediction service from app state"""
    from app.main import app
    if not hasattr(app.state, 'prediction_service'):
        raise HTTPException(status_code=503, detail="Prediction service not initialized")
    return app.state.prediction_service

# ============================================================================
# PREDICTION ENDPOINTS
# ============================================================================

@router.post("/predict", response_model=PredictionResponse)
async def predict_from_csv(
    request: PredictionRequest,
    service: PredictionService = Depends(get_prediction_service)
):
    """
    Generate next basket prediction using CSV data
    
    This endpoint is primarily for evaluation purposes where we need
    to compare against ground truth from the Instacart dataset.
    """
    try:
        logger.info(f"CSV prediction request for user {request.user_id}")
        
        # Get prediction with confidence scores
        result = await service.predict_from_csv(
            user_id=request.user_id,
            k=request.k or config.TIFUKNN_CONFIG["top_k"],
            exclude_last_order=request.exclude_last_order or False
        )
        
        return PredictionResponse(
            user_id=request.user_id,
            predicted_items=result['item_ids'],
            products=result['products'],
            algorithm="TIFU-KNN",
            source="csv",
            confidence_metrics=result['confidence_metrics'],
            generated_at=datetime.utcnow()
        )
        
    except ValueError as e:
        logger.error(f"User not found: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        raise HTTPException(status_code=500, detail="Prediction failed")

@router.post("/predict-from-db")
async def predict_from_database(
    request: Dict[str, Any],
    service: PredictionService = Depends(get_prediction_service)
):
    """
    Generate next basket prediction using database data
    
    This is the main endpoint for demo users - it reads their
    order history from the database (not CSV) to demonstrate
    real application functionality.
    """
    try:
        user_id = request.get("userId")
        k = request.get("k", config.TIFUKNN_CONFIG["top_k"])
        
        if not user_id:
            raise HTTPException(status_code=400, detail="userId is required")
            
        logger.info(f"Database prediction request for user {user_id}")
        
        # Get prediction from database data
        result = await service.predict_from_database(user_id, k)
        
        return {
            "userId": user_id,
            "instacartUserId": result.get("instacart_user_id"),
            "products": result['products'],
            "predictedItems": result['item_ids'],
            "basketCount": result.get("basket_count", 0),
            "source": "database",
            "algorithm": "TIFU-KNN",
            "confidenceMetrics": result['confidence_metrics'],
            "generatedAt": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Database prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/auto-generate")
async def auto_generate_basket(
    user_id: str,
    service: PredictionService = Depends(get_prediction_service)
):
    """
    Auto-generate next basket for logged-in user
    
    This is the endpoint called when a user clicks "Auto-Generate Basket"
    in the UI. It uses database data for seeded demo users.
    """
    try:
        logger.info(f"Auto-generate basket request for user {user_id}")
        
        # Check if user has database history (is a demo user)
        conn = get_db_connection()
        if not conn:
            raise HTTPException(status_code=503, detail="Database unavailable")
            
        cursor = conn.cursor()
        cursor.execute("""
            SELECT COUNT(*) FROM orders WHERE user_id = %s
        """, (user_id,))
        
        order_count = cursor.fetchone()[0]
        cursor.close()
        conn.close()
        
        if order_count > 0:
            # Demo user - use database
            result = await service.predict_from_database(user_id, k=config.TIFUKNN_CONFIG["top_k"])
        else:
            # Fallback to default recommendations
            result = await service.get_popular_items(k=config.TIFUKNN_CONFIG["top_k"])
            
        return {
            "success": True,
            "products": result['products'],
            "source": "database" if order_count > 0 else "popular",
            "confidenceMetrics": result.get('confidence_metrics', {}),
            "message": "Your personalized basket has been generated!"
        }
        
    except Exception as e:
        logger.error(f"Auto-generate failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate basket")

# ============================================================================
# DEMO DATA ENDPOINTS
# ============================================================================

@router.get("/demo/user-stats/{user_id}", response_model=UserStatsResponse)
async def get_user_stats(
    user_id: str,
    source: str = Query("csv", enum=["csv", "database"]),
    service: PredictionService = Depends(get_prediction_service)
):
    """
    Get comprehensive statistics for a user
    
    This endpoint provides detailed analytics about a user's
    purchase history for demo purposes.
    """
    try:
        if source == "database":
            stats = await service.get_user_stats_from_database(user_id)
        else:
            stats = await service.get_user_stats_from_csv(int(user_id))
            
        if not stats:
            raise HTTPException(status_code=404, detail="User not found")
            
        return UserStatsResponse(**stats)
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get user statistics")

@router.get("/demo/instacart-user/{instacart_id}")
async def get_instacart_user_data(
    instacart_id: int,
    service: PredictionService = Depends(get_prediction_service)
):
    """
    Get order history for an Instacart user (for seeding)
    
    This endpoint is used by the admin to preview what data
    will be seeded for a given Instacart user ID.
    """
    try:
        data = await service.get_instacart_user_data(instacart_id)
        
        if not data:
            raise HTTPException(
                status_code=404,
                detail=f"No data found for Instacart user {instacart_id}"
            )
            
        return data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching Instacart user data: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch user data")

@router.post("/demo/compare-prediction", response_model=DemoPredictionResponse)
async def compare_prediction_with_ground_truth(
    request: Dict[str, Any],
    service: PredictionService = Depends(get_prediction_service)
):
    """
    Compare prediction with ground truth for demo (Demand #3)
    
    This endpoint generates a prediction and compares it with
    the actual next basket from the Instacart dataset.
    """
    try:
        instacart_id = request.get("instacartId")
        if not instacart_id:
            raise HTTPException(status_code=400, detail="instacartId is required")
            
        logger.info(f"Comparing prediction for Instacart user {instacart_id}")
        
        # Get prediction and ground truth
        result = await service.compare_with_ground_truth(int(instacart_id))
        
        return DemoPredictionResponse(
            instacart_user_id=instacart_id,
            predicted_basket=result['predicted'],
            actual_basket=result['actual'],
            metrics=result['metrics'],
            overlap_items=result['overlap'],
            confidence_scores=result['confidence_scores']
        )
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Comparison failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to compare prediction")

# ============================================================================
# UTILITY ENDPOINTS
# ============================================================================

@router.get("/algorithms")
async def get_available_algorithms(
    service: PredictionService = Depends(get_prediction_service)
):
    """Get information about available recommendation algorithms"""
    return {
        "algorithms": [
            {
                "id": "tifuknn",
                "name": "TIFU-KNN",
                "description": "Temporal-Item-Frequency-based User-KNN",
                "version": "1.0",
                "parameters": config.TIFUKNN_CONFIG,
                "reference": "https://github.com/liming-7/A-Next-Basket-Recommendation-Reality-Check"
            }
        ],
        "default": "tifuknn"
    }

@router.get("/sample-users")
async def get_sample_users():
    """Get sample Instacart user IDs for testing"""
    return {
        "sample_users": [
            {"id": 1, "description": "Heavy grocery shopper", "order_count": 40},
            {"id": 7, "description": "Frequent organic buyer", "order_count": 35},
            {"id": 13, "description": "Family shopper", "order_count": 50},
            {"id": 25, "description": "Health-conscious", "order_count": 30},
            {"id": 31, "description": "Bulk shopper", "order_count": 25},
            {"id": 42, "description": "Diverse preferences", "order_count": 45},
            {"id": 55, "description": "Regular weekly shopper", "order_count": 20},
            {"id": 60, "description": "Weekend shopper", "order_count": 55},
            {"id": 78, "description": "Premium brands buyer", "order_count": 35},
            {"id": 92, "description": "Convenience focused", "order_count": 30}
        ],
        "note": "These are real Instacart users with interesting purchase patterns"
    }