# ml-service/src/api/main.py
# UPDATED: Fixed initialization, database integration, and feature engineering black box

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import os
import pandas as pd
import json
from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional

# Updated imports with database integration
from ..models.stacked_basket_model import StackedBasketModel
from ..evaluation.evaluator import BasketPredictionEvaluator
from ..services.prediction_service import PredictionService, EnhancedPredictionService
from ..database.connection import init_database, test_database_connection, get_database_info
from ..api.routes import predictions, metrics, training
from ..utils.logger import setup_logger

logger = setup_logger(__name__)

# Environment configuration
PROCESSED_DATA_PATH = os.getenv("PROCESSED_DATA_PATH", "/app/training-data/processed")
INSTACART_DATA_PATH = os.getenv("RAW_DATA_PATH", "/app/training-data")
MODEL_PATH_BASE = os.getenv("MODEL_PATH", "/app/models")
USE_DATABASE = os.getenv("USE_DATABASE", "true").lower() == "true"

# Load Instacart data for demo compatibility
try:
    ORDERS_DF = pd.read_csv(os.path.join(INSTACART_DATA_PATH, 'orders.csv'))
    ORDER_PRODUCTS_PRIOR_DF = pd.read_csv(os.path.join(INSTACART_DATA_PATH, 'order_products__prior.csv'))
    logger.info("Demo Instacart data loaded successfully")
except Exception as e:
    logger.warning(f"Demo Instacart data loading failed: {e}")
    ORDERS_DF = pd.DataFrame()
    ORDER_PRODUCTS_PRIOR_DF = pd.DataFrame()

# Request models
class PredictionRequestFromDbHistory(BaseModel):
    """Legacy request model for backward compatibility"""
    user_id: str
    order_history: List[List[int]]

class DatabasePredictionRequest(BaseModel):
    """New request model for database predictions"""
    user_id: str

@asynccontextmanager
async def lifespan(app: FastAPI):
    """FIXED: Application startup with proper database integration and feature engineering."""
    logger.info("Application startup...")

    # 1. Initialize Database Connection
    app.state.database_available = False
    if USE_DATABASE:
        try:
            logger.info("Initializing database connection...")
            init_database()
            
            if test_database_connection():
                app.state.database_available = True
                logger.info("✅ Database connection established successfully")
            else:
                logger.warning("⚠️ Database connection test failed - using legacy mode")
                
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")

    # 2. Load ML Model
    app.state.model = StackedBasketModel()
    try:
        app.state.model.load_models(MODEL_PATH_BASE)
        logger.info("✅ StackedBasketModel loaded successfully")
    except Exception as e:
        logger.error(f"🚨 ML model loading failed: {e}")
        app.state.model = None

    # 3. Load Static Features (for fallback and global features)
    app.state.features_df = None
    try:
        features_csv_path = os.path.join(PROCESSED_DATA_PATH, "features.csv")
        app.state.features_df = pd.read_csv(features_csv_path)
        logger.info(f"✅ Static features loaded: {app.state.features_df.shape}")
    except Exception as e:
        logger.warning(f"Static features loading failed: {e}")

    # 4. Initialize Prediction Service - FIXED INITIALIZATION
    app.state.prediction_service = None
    if app.state.model:
        try:
            if app.state.database_available and USE_DATABASE:
                # Use enhanced database-driven prediction service
                app.state.prediction_service = EnhancedPredictionService(
                    app.state.model, 
                    PROCESSED_DATA_PATH
                )
                logger.info("✅ DATABASE PredictionService initialized (feature engineering: BLACK BOX)")
            else:
                # Fallback to legacy prediction service
                app.state.prediction_service = PredictionService(
                    app.state.model, 
                    PROCESSED_DATA_PATH,
                    use_database=False
                )
                logger.info("✅ LEGACY PredictionService initialized (feature engineering: BLACK BOX)")
                
        except Exception as e:
            logger.error(f"PredictionService initialization failed: {e}")

    yield

    logger.info("Application shutdown.")

# FastAPI application
app = FastAPI(
    title="Timely ML Service",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
try:
    app.include_router(predictions.router, prefix="/api/predictions", tags=["predictions"])
    app.include_router(metrics.router, prefix="/api/metrics", tags=["metrics"])  
    app.include_router(training.router, prefix="/api/training", tags=["training"])
except ImportError as e:
    logger.warning(f"Some routers not available: {e}")

# ============================================================================
# NEW PREDICTION ENDPOINTS
# ============================================================================

@app.post("/predict/from-database", tags=["Database Prediction"])
async def predict_from_database(request: DatabasePredictionRequest):
    """
    NEW ENDPOINT: Predict by fetching user data directly from database.
    This implements the new architecture where ML service fetches its own data.
    """
    if not app.state.prediction_service:
        raise HTTPException(status_code=503, detail="Prediction service unavailable")
    
    if not app.state.database_available:
        raise HTTPException(status_code=503, detail="Database connection unavailable")
    
    try:
        logger.info(f"Database prediction request for user {request.user_id}")
        
        # Use prediction service in database mode
        predicted_products = app.state.prediction_service.predict_for_user(request.user_id)
        
        return {
            "user_id": request.user_id,
            "predicted_products": predicted_products,
            "source": "database",
            "feature_engineering": "black_box",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Database prediction failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database prediction failed")

@app.post("/predict/from-db-history", tags=["Legacy Prediction"])
async def predict_from_db_history(request: PredictionRequestFromDbHistory):
    """
    LEGACY ENDPOINT: Predict from provided order history (backend-mediated).
    Maintained for backward compatibility during transition.
    """
    if not app.state.prediction_service:
        raise HTTPException(status_code=503, detail="Prediction service unavailable")
    
    try:
        logger.info(f"Legacy prediction request for user {request.user_id}")
        
        # Convert order_history format for compatibility
        formatted_history = []
        for i, order_products in enumerate(request.order_history):
            order_dict = {
                'order_id': f"legacy_{i}",
                'order_number': i + 1,
                'days_since_prior_order': i * 7.0 if i > 0 else 0.0,  # Estimate weekly orders
                'order_dow': i % 7,  # Cycle through days
                'order_hour_of_day': 10,  # Default hour
                'products': [str(pid) for pid in order_products]
            }
            formatted_history.append(order_dict)
        
        # Use prediction service in legacy mode
        predicted_products = app.state.prediction_service.predict_next_basket(
            request.user_id, 
            formatted_history
        )
        
        return {
            "user_id": request.user_id,
            "predicted_skus": predicted_products,  # Legacy field name
            "source": "legacy",
            "feature_engineering": "black_box",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Legacy prediction failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Legacy prediction failed")

# ============================================================================
# HEALTH AND MONITORING ENDPOINTS
# ============================================================================

@app.get("/health")
async def health_check():
    """Enhanced health check with database and service status."""
    try:
        model_status = "Not Loaded"
        if app.state.model:
            model_status = "Loaded"

        database_status = "Not Available"
        if USE_DATABASE:
            if app.state.database_available:
                database_status = "Connected"
            else:
                database_status = "Connection Failed"

        prediction_service_status = "Not Available"
        service_info = {}
        if app.state.prediction_service:
            service_info = app.state.prediction_service.get_service_info()
            prediction_service_status = f"{service_info.get('mode', 'unknown').title()} Mode"

        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "services": {
                "model": model_status,
                "database": database_status,
                "prediction_service": prediction_service_status
            },
            "configuration": {
                "use_database": USE_DATABASE,
                "feature_engineering": "black_box",
                **service_info
            },
            "version": "2.0.0"
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service health check failed")

@app.get("/database/status")
async def database_status():
    """Detailed database connection status."""
    if not USE_DATABASE:
        return {"status": "disabled", "message": "Database mode disabled"}
    
    if not app.state.database_available:
        return {"status": "unavailable", "message": "Database not initialized"}
    
    try:
        db_info = get_database_info()
        return {
            **db_info,
            "timestamp": datetime.utcnow().isoformat()
        }
            
    except Exception as e:
        logger.error(f"Database status check failed: {e}")
        return {
            "status": "error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

@app.get("/service/stats")
async def service_stats():
    """Get prediction service statistics."""
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
# DEMO ENDPOINTS (KEEP FOR COMPATIBILITY) 
# ============================================================================

@app.get("/demo-data/user-future-basket/{user_id_str}", tags=["Demo Data"])
async def get_user_future_basket_debug_endpoint(user_id_str: str):
    """Demo endpoint - keep for existing functionality."""
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

@app.get("/demo-data/instacart-user-order-history/{user_id}", tags=["Demo Data"])
def get_instacart_user_order_history(user_id: int):
    """Demo endpoint - keep for existing functionality."""
    if ORDERS_DF.empty:
        raise HTTPException(status_code=503, detail="Demo data not available")
        
    user_orders = ORDERS_DF[ORDERS_DF['user_id'] == user_id]
    if user_orders.empty:
        raise HTTPException(status_code=404, detail="Demo user not found")

    user_order_ids = user_orders['order_id'].tolist()
    order_details = ORDER_PRODUCTS_PRIOR_DF[ORDER_PRODUCTS_PRIOR_DF['order_id'].isin(user_order_ids)]
    grouped_orders = order_details.groupby('order_id')['product_id'].apply(list).reset_index()
    final_history = pd.merge(grouped_orders, user_orders, on='order_id')
    
    return final_history.to_dict(orient='records')

# ============================================================================
# EVALUATION ENDPOINT (NO FEATURE IMPORTANCE)
# ============================================================================

@app.post("/evaluate", tags=["Evaluation"])
async def evaluate_model_endpoint():
    """Model evaluation endpoint - BLACK BOX (no feature importance exposure)."""
    if not app.state.model:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        logger.info("Starting model evaluation...")
        features_df = pd.read_csv(os.path.join(PROCESSED_DATA_PATH, 'features.csv'))
        instacart_future_df = pd.read_csv(os.path.join(PROCESSED_DATA_PATH, 'instacart_future.csv'))
        
        with open(os.path.join(PROCESSED_DATA_PATH, 'instacart_keyset_0.json'), 'r') as f:
            keyset = json.load(f)

        test_user_ids = keyset.get('test', [])
        if not test_user_ids:
            raise HTTPException(status_code=404, detail="No test users found")

        predictions_for_eval = []
        test_features = features_df[features_df['user_id'].isin(test_user_ids)]
        
        for user_id in test_user_ids:
            actual_products_series = instacart_future_df[instacart_future_df['user_id'] == user_id]['products']
            actual_products = json.loads(actual_products_series.iloc[0]) if not actual_products_series.empty else []
            
            # Use model's predict method directly (BLACK BOX)
            prediction_result = app.state.model.predict(test_features, user_id)
            predicted_products = prediction_result if isinstance(prediction_result, list) else []
            
            predictions_for_eval.append({
                "user_id": user_id,
                "predicted_products": predicted_products,
                "actual_products": actual_products,
            })

        evaluator = BasketPredictionEvaluator()
        results = evaluator.evaluate_model(predictions_for_eval)
        logger.info("Model evaluation completed")
        
        return {
            "message": "Evaluation complete", 
            "metrics": results,
            "feature_engineering": "black_box"
        }

    except Exception as e:
        logger.error(f"Evaluation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# Root endpoint
@app.get("/")
async def root():
    return {
        "service": "Timely ML Service",
        "version": "2.0.0", 
        "status": "running",
        "architecture": "direct_database_access",
        "feature_engineering": "black_box",
        "endpoints": {
            "new": "/predict/from-database",
            "legacy": "/predict/from-db-history", 
            "demo": "/demo-data/*",
            "health": "/health"
        },
        "timestamp": datetime.utcnow().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)