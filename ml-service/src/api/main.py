# ml-service/src/api/main.py
# COMPLETELY UPDATED: Fixed initialization, removed legacy mode, black box feature engineering

import os
import json
import pandas as pd
from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional

from ..models.stacked_basket_model import StackedBasketModel
from ..services.prediction_service import EnhancedPredictionService
from ..evaluation.evaluator import BasketPredictionEvaluator
from ..utils.logger import setup_logger
from ..database.connection import get_database_connection

# Import routers
try:
    from . import predictions, metrics, training
except ImportError:
    predictions = metrics = training = None

logger = setup_logger(__name__)

# Configuration
MODEL_PATH_BASE = "/app/models"
PROCESSED_DATA_PATH = "/app/training-data/processed"
USE_DATABASE = True  # Only database mode - no legacy

# Request models
class DatabasePredictionRequest(BaseModel):
    user_id: str

class UserHistoryPredictionRequest(BaseModel):
    user_id: str
    order_history: Optional[List[Dict]] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Timely ML Service...")
    
    # 1. Test Database Connection
    app.state.database_available = False
    try:
        db = get_database_connection()
        if db:
            logger.info("✅ Database connection established")
            app.state.database_available = True
        else:
            logger.warning("⚠️ Database connection failed - using fallback mode")
    except Exception as e:
        logger.warning(f"Database connection error: {e}")

    # 2. Load ML Model
    app.state.model = StackedBasketModel()
    try:
        app.state.model.load_models(MODEL_PATH_BASE)
        logger.info("✅ StackedBasketModel loaded successfully")
    except Exception as e:
        logger.error(f"🚨 ML model loading failed: {e}")
        app.state.model = None

    # 3. Load Static Features (for product features and fallback)
    app.state.features_df = None
    try:
        features_csv_path = os.path.join(PROCESSED_DATA_PATH, "features.csv")
        if os.path.exists(features_csv_path):
            app.state.features_df = pd.read_csv(features_csv_path)
            logger.info(f"✅ Static features loaded: {app.state.features_df.shape}")
        else:
            logger.warning("Static features file not found")
    except Exception as e:
        logger.warning(f"Static features loading failed: {e}")

    # 4. Initialize Prediction Service - DATABASE MODE ONLY
    app.state.prediction_service = None
    if app.state.model:
        try:
            if app.state.database_available:
                # Use enhanced database-driven prediction service
                app.state.prediction_service = EnhancedPredictionService(
                    app.state.model, 
                    PROCESSED_DATA_PATH
                )
                logger.info("✅ DATABASE PredictionService initialized (BLACK BOX feature engineering)")
            else:
                logger.error("❌ Database required but not available - prediction service disabled")
                
        except Exception as e:
            logger.error(f"PredictionService initialization failed: {e}")

    yield

    logger.info("ML Service shutdown complete.")

# FastAPI application
app = FastAPI(
    title="Timely ML Service",
    version="2.0.0",
    lifespan=lifespan,
    description="AI-Powered Grocery Basket Prediction Service"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers if available
if predictions:
    app.include_router(predictions.router, prefix="/api/predictions", tags=["predictions"])
if metrics:
    app.include_router(metrics.router, prefix="/api/metrics", tags=["metrics"])  
if training:
    app.include_router(training.router, prefix="/api/training", tags=["training"])

# ============================================================================
# MAIN PREDICTION ENDPOINTS - DATABASE MODE ONLY
# ============================================================================

@app.post("/predict/from-database", tags=["Database Prediction"])
async def predict_from_database(request: DatabasePredictionRequest):
    """
    MAIN ENDPOINT: Predict by fetching user data directly from database.
    This implements the direct database access architecture.
    """
    if not app.state.prediction_service:
        raise HTTPException(status_code=503, detail="Prediction service not available")
    
    try:
        predictions = app.state.prediction_service.predict_next_basket(request.user_id)
        
        return {
            "user_id": request.user_id,
            "predictions": predictions,
            "feature_engineering": "black_box",
            "architecture": "direct_database_access",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Database prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/for-user-history", tags=["Prediction"])
async def predict_for_user_history(request: UserHistoryPredictionRequest):
    """
    Demo/compatibility endpoint for historical prediction comparison.
    Used by admin demo functionality.
    """
    if not app.state.prediction_service:
        raise HTTPException(status_code=503, detail="Prediction service not available")
    
    try:
        # Use database mode prediction
        predictions = app.state.prediction_service.predict_next_basket(request.user_id)
        
        # Format for demo compatibility
        formatted_predictions = [
            {"productId": int(pid), "score": 0.8}  # Demo confidence score
            for pid in predictions
        ]
        
        return {
            "user_id": request.user_id,
            "predictions": formatted_predictions,
            "feature_engineering": "black_box",
            "demo_mode": True
        }
        
    except Exception as e:
        logger.error(f"User history prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# MONITORING AND HEALTH ENDPOINTS
# ============================================================================

@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "Timely ML Service",
        "version": "2.0.0",
        "architecture": "direct_database_access",
        "feature_engineering": "black_box",
        "model_loaded": app.state.model is not None,
        "database_available": app.state.database_available,
        "prediction_service_ready": app.state.prediction_service is not None,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/service-info", tags=["Monitoring"])
async def get_service_info():
    """Get detailed service information."""
    if not app.state.prediction_service:
        raise HTTPException(status_code=503, detail="Prediction service not available")
    
    try:
        if hasattr(app.state.prediction_service, 'get_service_stats'):
            return app.state.prediction_service.get_service_stats()
        else:
            return app.state.prediction_service.get_service_info()
    except Exception as e:
        logger.error(f"Service stats failed: {e}")
        raise HTTPException(status_code=500, detail="Service stats unavailable")

# ============================================================================
# MODEL EVALUATION - BLACK BOX
# ============================================================================

@app.post("/evaluate-model", tags=["Model Evaluation"])
async def evaluate_model():
    """
    Trigger model evaluation using BLACK BOX approach.
    No feature importance exposure.
    """
    if not app.state.model:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        logger.info("Starting BLACK BOX model evaluation...")
        
        # Load required data
        features_df = pd.read_csv(os.path.join(PROCESSED_DATA_PATH, 'features.csv'))
        instacart_future_df = pd.read_csv(os.path.join(PROCESSED_DATA_PATH, 'instacart_future.csv'))
        
        with open(os.path.join(PROCESSED_DATA_PATH, 'instacart_keyset_0.json'), 'r') as f:
            keyset = json.load(f)

        test_user_ids = keyset.get('test', [])
        if not test_user_ids:
            raise HTTPException(status_code=404, detail="No test users found")

        # Evaluate model predictions
        predictions_for_eval = []
        test_features = features_df[features_df['user_id'].isin(test_user_ids)]
        
        for user_id in test_user_ids:
            # Get actual products
            actual_products_series = instacart_future_df[instacart_future_df['user_id'] == user_id]['products']
            actual_products = json.loads(actual_products_series.iloc[0]) if not actual_products_series.empty else []
            
            # Get predictions using BLACK BOX model
            prediction_result = app.state.model.predict(test_features, user_id)
            predicted_products = prediction_result if isinstance(prediction_result, list) else []
            
            predictions_for_eval.append({
                "user_id": user_id,
                "predicted_products": predicted_products,
                "actual_products": actual_products,
            })

        # Evaluate performance
        evaluator = BasketPredictionEvaluator()
        results = evaluator.evaluate_model(predictions_for_eval)
        logger.info("BLACK BOX model evaluation completed")
        
        return {
            "message": "Evaluation complete", 
            "metrics": results,
            "feature_engineering": "black_box",
            "architecture": "direct_database_access",
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"Evaluation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# DEMO ENDPOINTS - KEEP FOR COMPATIBILITY
# ============================================================================

@app.get("/demo-data/user-future-basket/{user_id_str}", tags=["Demo Data"])
async def get_user_future_basket_debug_endpoint(user_id_str: str):
    """Demo endpoint for admin demo functionality."""
    try:
        user_id = int(user_id_str)
        future_df_path = os.path.join(PROCESSED_DATA_PATH, "instacart_future.csv")
        
        if not os.path.exists(future_df_path):
            raise HTTPException(status_code=500, detail="Demo data not found")
        
        future_df = pd.read_csv(future_df_path)
        user_future_series = future_df[future_df['user_id'] == user_id]

        if user_future_series.empty:
            raise HTTPException(status_code=404, detail=f"Demo user {user_id} not found")
        
        products_str = user_future_series.iloc[0]['products']
        product_ids = [int(p) for p in json.loads(products_str)]
        
        return {"user_id": user_id, "products": product_ids}
        
    except Exception as e:
        logger.error(f"Demo endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# ROOT ENDPOINT
# ============================================================================

@app.get("/")
async def root():
    """Root endpoint with service information."""
    return {
        "service": "Timely ML Service",
        "version": "2.0.0", 
        "status": "running",
        "architecture": "direct_database_access",
        "feature_engineering": "black_box",
        "legacy_mode": False,
        "endpoints": {
            "main": "/predict/from-database",
            "demo": "/predict/for-user-history", 
            "evaluation": "/evaluate-model",
            "health": "/health",
            "monitoring": "/service-info"
        },
        "timestamp": datetime.utcnow().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)