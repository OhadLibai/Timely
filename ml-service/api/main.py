# ml-service/api/main.py
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
from datetime import datetime
from loguru import logger

# Import our modules
from core.logger import setup_logger
from core.database import get_db_connection
from training_data.training_data_loader import DataLoader
from services.prediction import PredictionService
from services.evaluation import EvaluationService
from models.schemas import (
    PredictionRequest, PredictionResponse,
    EvaluationRequest, EvaluationResponse,
    UserOrderHistory, DemoUserPrediction
)

# Setup logging
setup_logger()

# Initialize FastAPI app
app = FastAPI(
    title="Timely ML Service",
    description="TIFU-KNN based Next Basket Recommendation Engine",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for data and services
data_loader = None
prediction_service = None
evaluation_service = None

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    global data_loader, prediction_service, evaluation_service
    
    logger.info("Starting ML Service...")
    
    # Initialize data loader
    data_loader = DataLoader()
    
    # Load Instacart dataset
    dataset_path = os.getenv("RAW_DATA_PATH", "/app/dataset")
    try:
        data_loader.load_instacart_data(dataset_path)
        logger.info(f"Loaded data for {data_loader.get_user_count()} users")
    except Exception as e:
        logger.error(f"Failed to load dataset: {e}")
        # Continue anyway for development
    
    # Initialize services
    prediction_service = PredictionService(data_loader)
    evaluation_service = EvaluationService(data_loader, prediction_service)
    
    logger.info("ML Service initialized successfully")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check database connection
        db_available = False
        try:
            conn = get_db_connection()
            if conn:
                conn.close()
                db_available = True
        except:
            pass
        
        # Check data loading status
        data_loaded = {
            "users": data_loader.get_user_count() if data_loader else 0,
            "products": data_loader.get_product_count() if data_loader else 0,
            "orders": data_loader.get_total_orders() if data_loader else 0,
            "future_baskets": data_loader.get_future_basket_count() if data_loader else 0
        }
        
        # Check model status
        model_loaded = prediction_service is not None
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "database_available": db_available,
            "data_loaded": data_loaded,
            "model_loaded": model_loaded,
            "version": "1.0.0"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# PREDICTION ENDPOINTS
# ============================================================================

@app.post("/predict", response_model=PredictionResponse)
async def predict_next_basket(request: PredictionRequest):
    """
    Predict next basket for a user using TIFU-KNN
    """
    try:
        # Check if we should exclude last order (for evaluation)
        exclude_last = request.exclude_last_order if hasattr(request, 'exclude_last_order') else False
        
        # Get prediction
        predicted_items = prediction_service.predict_next_basket(
            user_id=request.user_id,
            k=request.k if hasattr(request, 'k') else 20,
            exclude_last_order=exclude_last
        )
        
        # Get product names
        products = []
        for item_id in predicted_items:
            product_info = data_loader.get_product_info(item_id)
            if product_info:
                products.append({
                    "product_id": item_id,
                    "product_name": product_info['product_name'],
                    "aisle": product_info.get('aisle', 'Unknown'),
                    "department": product_info.get('department', 'Unknown')
                })
        
        return PredictionResponse(
            user_id=request.user_id,
            predicted_products=products,
            confidence_score=0.85,  # Placeholder - could calculate actual confidence
            model_version="TIFU-KNN-1.0"
        )
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Prediction failed for user {request.user_id}: {e}")
        raise HTTPException(status_code=500, detail="Prediction failed")

@app.post("/predict-from-db")
async def predict_from_database(request: Dict[str, Any]):
    """
    Predict next basket for a user based on database order history
    """
    try:
        user_id = request.get("user_id")
        instacart_user_id = request.get("instacart_user_id")
        
        if not instacart_user_id:
            raise HTTPException(status_code=400, detail="instacart_user_id required")
        
        # Use the Instacart user ID for prediction
        predicted_items = prediction_service.predict_next_basket(
            user_id=instacart_user_id,
            k=20
        )
        
        # Format response
        products = []
        for item_id in predicted_items:
            product_info = data_loader.get_product_info(item_id)
            if product_info:
                products.append({
                    "productId": str(item_id),  # Frontend expects productId
                    "productName": product_info['product_name'],
                    "confidence": 0.85
                })
        
        return {
            "userId": user_id,
            "products": products,
            "generatedAt": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Database prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# EVALUATION ENDPOINTS
# ============================================================================

@app.post("/evaluate-model", response_model=EvaluationResponse)
async def evaluate_model(request: Optional[EvaluationRequest] = None):
    """
    Evaluate TIFU-KNN model performance on Instacart dataset
    """
    try:
        # Get sample size from request or environment
        if request and hasattr(request, 'sample_size'):
            sample_size = request.sample_size
        else:
            sample_size = int(os.getenv("EVALUATION_SAMPLE_SIZE", "100"))
        
        logger.info(f"Starting model evaluation with sample_size={sample_size}")
        
        # Run evaluation
        metrics = evaluation_service.evaluate_model(sample_size=sample_size)
        
        # Format response
        return EvaluationResponse(
            metrics=metrics,
            evaluation_date=datetime.utcnow().isoformat(),
            sample_size=sample_size,
            model_version="TIFU-KNN-1.0"
        )
        
    except Exception as e:
        logger.error(f"Model evaluation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# DEMO DATA ENDPOINTS
# ============================================================================

@app.get("/demo-data/instacart-user-order-history/{user_id}")
async def get_instacart_user_order_history(user_id: str):
    """
    Get order history for an Instacart user (for seeding)
    """
    try:
        user_id_int = int(user_id)
        
        # Get user's order history
        user_baskets = data_loader.get_user_baskets(user_id_int)
        if not user_baskets:
            raise HTTPException(
                status_code=404, 
                detail=f"User {user_id} not found in Instacart dataset"
            )
        
        # Format orders
        orders = []
        for idx, basket in enumerate(user_baskets):
            # Get temporal data if available
            order_info = data_loader.get_order_info(user_id_int, idx)
            
            # Convert product IDs to product info
            products = []
            for product_id in basket:
                product_info = data_loader.get_product_info(product_id)
                if product_info:
                    products.append({
                        "product_id": product_id,
                        "product_name": product_info['product_name']
                    })
            
            orders.append({
                "order_sequence": idx + 1,
                "products": products,
                "days_since_prior_order": order_info.get('days_since_prior_order', 7) if order_info else 7,
                "order_dow": order_info.get('order_dow', 0) if order_info else 0,
                "order_hour_of_day": order_info.get('order_hour_of_day', 10) if order_info else 10
            })
        
        return UserOrderHistory(
            user_id=user_id_int,
            orders=orders,
            total_orders=len(orders)
        )
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get order history for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/demo-data/available-users")
async def get_available_users(limit: int = Query(100, ge=1, le=1000)):
    """
    Get list of available Instacart user IDs for demo
    """
    try:
        user_ids = data_loader.get_available_user_ids(limit=limit)
        
        return {
            "user_ids": user_ids,
            "total_available": data_loader.get_user_count(),
            "description": "Instacart user IDs available for demo seeding"
        }
        
    except Exception as e:
        logger.error(f"Failed to get available users: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/demo-data/user-prediction/{user_id}")
async def get_demo_user_prediction(user_id: str):
    """
    Get prediction vs actual comparison for a specific user
    """
    try:
        user_id_int = int(user_id)
        
        # Get prediction (excluding last order)
        predicted_items = prediction_service.predict_next_basket(
            user_id=user_id_int,
            k=20,
            exclude_last_order=True
        )
        
        # Get actual next basket
        actual_basket = data_loader.get_user_future_basket(user_id_int)
        if not actual_basket:
            raise HTTPException(
                status_code=404,
                detail=f"No future basket found for user {user_id} (might be in test set)"
            )
        
        # Convert to product info
        predicted_products = []
        for item_id in predicted_items:
            product_info = data_loader.get_product_info(item_id)
            if product_info:
                predicted_products.append({
                    "product_id": item_id,
                    "product_name": product_info['product_name']
                })
        
        actual_products = []
        for item_id in actual_basket:
            product_info = data_loader.get_product_info(item_id)
            if product_info:
                actual_products.append({
                    "product_id": item_id,
                    "product_name": product_info['product_name']
                })
        
        # Calculate metrics
        predicted_set = set(predicted_items[:len(actual_basket)])
        actual_set = set(actual_basket)
        correct_predictions = predicted_set.intersection(actual_set)
        
        recall = len(correct_predictions) / len(actual_set) if actual_set else 0
        precision = len(correct_predictions) / len(predicted_set) if predicted_set else 0
        
        return DemoUserPrediction(
            user_id=user_id_int,
            predicted_basket=predicted_products,
            actual_basket=actual_products,
            metrics={
                "recall": round(recall, 3),
                "precision": round(precision, 3),
                "correct_items": len(correct_predictions),
                "total_actual_items": len(actual_set),
                "total_predicted_items": len(predicted_set)
            }
        )
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get demo prediction for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/demo-data/user-stats/{user_id}")
async def get_user_stats(user_id: str):
    """
    Get statistics for a specific user
    """
    try:
        user_id_int = int(user_id)
        
        user_baskets = data_loader.get_user_baskets(user_id_int)
        if not user_baskets:
            raise HTTPException(status_code=404, detail=f"User {user_id} not found")
        
        # Calculate stats
        all_products = []
        for basket in user_baskets:
            all_products.extend(basket)
        
        unique_products = set(all_products)
        product_frequency = {}
        for product in all_products:
            product_frequency[product] = product_frequency.get(product, 0) + 1
        
        # Get top products
        top_products = sorted(product_frequency.items(), key=lambda x: x[1], reverse=True)[:10]
        top_products_info = []
        for product_id, count in top_products:
            product_info = data_loader.get_product_info(product_id)
            if product_info:
                top_products_info.append({
                    "product_name": product_info['product_name'],
                    "purchase_count": count
                })
        
        return {
            "user_id": user_id_int,
            "total_orders": len(user_baskets),
            "unique_products": len(unique_products),
            "avg_basket_size": round(len(all_products) / len(user_baskets), 1),
            "top_products": top_products_info
        }
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get user stats for {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)