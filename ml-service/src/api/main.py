# ml-service/src/api/main.py
# CLEANED UP: Removed redundant FeatureEngineer, simplified structure

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
from ..services.enhanced_feature_engineering import DatabaseFeatureEngineer
from ..evaluation.evaluator import BasketPredictionEvaluator
from ..utils.logger import setup_logger
from ..database.connection import test_database_connection

logger = setup_logger(__name__)

# --- Configuration ---
MODEL_PATH_BASE = "/app/models"
PROCESSED_DATA_PATH = "/app/training-data/processed"
RAW_DATA_PATH = "/app/training-data" # Path to original CSVs

# --- Pydantic Models ---
class PredictionRequest(BaseModel):
    user_id: str

# --- Lifespan Management ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Timely ML Service...")
    app.state.database_available = test_database_connection()
    app.state.model = StackedBasketModel()
    try:
        app.state.model.load_models(MODEL_PATH_BASE)
        logger.info("✅ StackedBasketModel loaded successfully")
    except Exception as e:
        logger.error(f"🚨 ML model loading failed: {e}")
        app.state.model = None

    # Database-driven service for the main application
    app.state.prediction_service = EnhancedPredictionService(app.state.model, PROCESSED_DATA_PATH) if app.state.model else None
    
    # CLEANED UP: Use DatabaseFeatureEngineer for all CSV-based demo operations
    app.state.demo_feature_engineer = DatabaseFeatureEngineer(PROCESSED_DATA_PATH)
    logger.info("✅ DatabaseFeatureEngineer initialized for demo operations")
    
    # Load raw data for demo mode
    try:
        app.state.orders_df = pd.read_csv(os.path.join(RAW_DATA_PATH, "orders.csv"))
        app.state.order_products_prior_df = pd.read_csv(os.path.join(RAW_DATA_PATH, "order_products__prior.csv"))
        app.state.instacart_future_df = pd.read_csv(os.path.join(PROCESSED_DATA_PATH, "instacart_future.csv"))
        logger.info("✅ Raw CSV data for demo mode loaded")
    except Exception as e:
        logger.error(f"🚨 Could not load raw CSV data for demo: {e}")

    yield
    logger.info("ML Service shutdown complete.")

# --- FastAPI App ---
app = FastAPI(title="Timely ML Service", version="2.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# ============================================================================
# ENDPOINTS
# ============================================================================

@app.get("/health", tags=["Health"])
async def health_check():
    """Main health check for the service."""
    return { 
        "status": "healthy", 
        "model_loaded": app.state.model is not None, 
        "database_available": app.state.database_available,
        "architecture": "direct_database_access",
        "feature_engineering": "black_box"
    }

@app.get("/service-info", tags=["Info"])
async def service_info():
    """Service information endpoint."""
    return {
        "mode": "production",
        "architecture": "direct_database_access",
        "feature_engineering": "black_box",
        "model_type": "stacked_basket_model",
        "version": "2.0.0"
    }

# --- MAIN PREDICTION ENDPOINT (for functioning app) ---
@app.post("/predict/from-database", tags=["Prediction"])
async def predict_from_database(request: PredictionRequest):
    """Predicts by fetching user's history directly from the application database."""
    if not app.state.prediction_service:
        raise HTTPException(status_code=503, detail="Prediction service not available")
    
    predictions = app.state.prediction_service.predict_next_basket(request.user_id)
    return { 
        "user_id": request.user_id, 
        "predicted_products": predictions, 
        "source": "database", 
        "feature_engineering": "black_box" 
    }

# --- DEMAND 3: LIVE DEMO ENDPOINT (temporary, from CSVs) ---
@app.post("/predict/for-demo", tags=["Demo"])
async def predict_for_demo(request: PredictionRequest):
    """Generates a temporary prediction for a demo user ID directly from CSV files."""
    user_id = int(request.user_id)
    
    # Generate order history from CSV data
    order_history = _generate_order_history_from_csv(user_id)
    if not order_history:
        raise HTTPException(status_code=404, detail=f"No order history found for user {user_id} in CSV data")
    
    # Use DatabaseFeatureEngineer's CSV-compatible method
    features_df = app.state.demo_feature_engineer._generate_features_from_history(str(user_id), order_history)
    if features_df.empty:
        raise HTTPException(status_code=404, detail=f"No features could be generated for demo user {user_id}")
    
    predicted_basket = app.state.model.predict(features_df, user_id)
    return { 
        "user_id": user_id, 
        "predicted_products": predicted_basket, 
        "source": "csv_live_demo",
        "feature_engineering": "black_box"
    }

# --- DEMAND 1 & 3 HELPER: Get Instacart History from CSVs ---
@app.get("/demo-data/instacart-user-order-history/{user_id_str}", tags=["Demo Data"])
async def get_instacart_user_order_history(user_id_str: str):
    """Fetches a user's complete order history from the original Instacart CSVs."""
    user_id = int(user_id_str)
    order_history = _generate_order_history_from_csv(user_id)
    
    if not order_history:
        raise HTTPException(status_code=404, detail="No prior order history found for this user in CSVs.")
    
    return {"user_id": user_id, "orders": order_history}

# --- DEMAND 3 HELPER: Get Ground Truth Basket from CSVs ---
@app.get("/demo-data/user-future-basket/{user_id_str}", tags=["Demo Data"])
async def get_user_future_basket(user_id_str: str):
    """Fetches the ground truth 'future' basket for a user from the processed CSVs."""
    user_id = int(user_id_str)
    future_series = app.state.instacart_future_df[app.state.instacart_future_df['user_id'] == user_id]
    if future_series.empty:
        raise HTTPException(status_code=404, detail=f"Future basket not found for user {user_id}")
    products_str = future_series.iloc[0]['products']
    return {"user_id": user_id, "products": json.loads(products_str)}

# --- DEMAND 2: MODEL EVALUATION ENDPOINT ---
@app.post("/evaluate-model", tags=["Model Evaluation"])
async def evaluate_model():
    """Triggers a full model evaluation against the test set from the CSVs."""
    if not app.state.model:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        # Load test set
        with open(os.path.join(PROCESSED_DATA_PATH, 'instacart_keyset_0.json'), 'r') as f:
            keyset = json.load(f)
        
        test_user_ids = keyset.get('test', [])
        if not test_user_ids:
            raise HTTPException(status_code=404, detail="No test users found in keyset")

        predictions_for_eval = []
        for user_id in test_user_ids:
            # Generate features using the same method as demo predictions
            order_history = _generate_order_history_from_csv(user_id)
            if not order_history:
                continue
                
            features_df = app.state.demo_feature_engineer._generate_features_from_history(str(user_id), order_history)
            if features_df.empty:
                continue
            
            predicted_products = app.state.model.predict(features_df, user_id)
            
            # Get actual products
            future_df = app.state.instacart_future_df
            actual_products_series = future_df[future_df['user_id'] == user_id]['products']
            actual_products = json.loads(actual_products_series.iloc[0]) if not actual_products_series.empty else []
            
            predictions_for_eval.append({
                "user_id": user_id, 
                "predicted_products": predicted_products, 
                "actual_products": actual_products
            })

        evaluator = BasketPredictionEvaluator()
        results = evaluator.evaluate_model(predictions_for_eval)
        
        return { 
            "message": "Evaluation complete", 
            "metrics": results, 
            "timestamp": datetime.utcnow().isoformat(),
            "feature_engineering": "black_box"
        }
    except Exception as e:
        logger.error(f"Evaluation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _generate_order_history_from_csv(user_id: int) -> List[Dict]:
    """
    CLEANED UP: Consolidated CSV order history generation logic.
    """
    user_orders = app.state.orders_df[
        (app.state.orders_df['user_id'] == user_id) & 
        (app.state.orders_df['eval_set'] == 'prior')
    ]
    
    if user_orders.empty:
        return []

    order_ids = user_orders['order_id'].tolist()
    order_products = app.state.order_products_prior_df[
        app.state.order_products_prior_df['order_id'].isin(order_ids)
    ]
    
    history = []
    for _, order_row in user_orders.iterrows():
        products = order_products[
            order_products['order_id'] == order_row['order_id']
        ]['product_id'].tolist()
        
        history.append({
            "order_id": int(order_row['order_id']),
            "order_number": int(order_row['order_number']),
            "order_dow": int(order_row['order_dow']),
            "order_hour_of_day": int(order_row['order_hour_of_day']),
            "days_since_prior_order": float(order_row['days_since_prior_order']) if pd.notna(order_row['days_since_prior_order']) else None,
            "products": products
        })
    
    return history