# ml-service/src/api/main.py
# SIMPLIFIED VERSION: Direct environment variable usage from .env file

import os
import json
import pandas as pd
from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional

from ..models.stacked_basket_model import StackedBasketModel
from ..services.prediction import EnhancedPredictionService
from ..features.engineering import UnifiedFeatureEngineer as DatabaseFeatureEngineer
from ..core.evaluator import BasketPredictionEvaluator
from ..core.logger import setup_logger
from ..data.connection import test_database_connection

logger = setup_logger(__name__)

# ============================================================================
# ENVIRONMENT VARIABLES (Loaded from .env file)
# ============================================================================

# Core paths - use existing .env pattern
MODEL_PATH_BASE = os.getenv("MODEL_PATH_BASE", "/app/models")
PROCESSED_DATA_PATH = os.getenv("PROCESSED_DATA_PATH", "/app/training-data/processed")
RAW_DATA_PATH = os.getenv("RAW_DATA_PATH", "/app/training-data")

# Database - reuse existing DATABASE_URL from .env
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://timely_user:timely_password@postgres:5432/timely_db")

# Service settings
SERVICE_HOST = os.getenv("SERVICE_HOST", "0.0.0.0")
SERVICE_PORT = int(os.getenv("SERVICE_PORT", "8000"))
DEBUG_MODE = os.getenv("DEBUG_MODE", "false").lower() == "true"

# Optional settings with sensible defaults
EVALUATION_SAMPLE_SIZE = int(os.getenv("EVALUATION_SAMPLE_SIZE", "100"))

logger.info(f"ML Service starting - Model Path: {MODEL_PATH_BASE}")
logger.info(f"Environment: {os.getenv('NODE_ENV', 'development')}")

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class PredictionRequest(BaseModel):
    user_id: str

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    database_available: bool
    architecture: str
    feature_engineering: str
    data_loaded: Dict[str, int]

# ============================================================================
# LIFESPAN MANAGEMENT
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan manager - loads from .env automatically."""
    logger.info("🚀 Starting Timely ML Service...")
    
    # Test database connection
    app.state.database_available = test_database_connection()
    if app.state.database_available:
        logger.info("✅ Database connection successful")
    else:
        logger.warning("⚠️ Database connection failed - demo mode only")
    
    # Load and initialize model
    app.state.model = StackedBasketModel()
    try:
        app.state.model.load_models(MODEL_PATH_BASE)
        logger.info(f"✅ StackedBasketModel loaded from {MODEL_PATH_BASE}")
        app.state.model_loaded = True
    except Exception as e:
        logger.error(f"🚨 ML model loading failed: {e}")
        app.state.model = None
        app.state.model_loaded = False
    
    # Initialize prediction service for database-driven predictions
    if app.state.model and app.state.database_available:
        app.state.prediction_service = EnhancedPredictionService(app.state.model, PROCESSED_DATA_PATH)
        logger.info("✅ EnhancedPredictionService initialized")
    else:
        app.state.prediction_service = None
        logger.warning("⚠️ Prediction service not available")
    
    # Initialize feature engineer for CSV-based demo operations
    app.state.demo_feature_engineer = DatabaseFeatureEngineer(PROCESSED_DATA_PATH)
    logger.info("✅ DatabaseFeatureEngineer initialized for demo operations")
    
    # Load raw CSV data for demo mode
    app.state.data_loaded = {}
    try:
        logger.info(f"Loading CSV data from {RAW_DATA_PATH}")
        
        # Load raw Instacart data
        app.state.orders_df = pd.read_csv(os.path.join(RAW_DATA_PATH, "orders.csv"))
        app.state.order_products_prior_df = pd.read_csv(os.path.join(RAW_DATA_PATH, "order_products__prior.csv"))
        app.state.order_products_train_df = pd.read_csv(os.path.join(RAW_DATA_PATH, "order_products__train.csv"))
        app.state.products_df = pd.read_csv(os.path.join(RAW_DATA_PATH, "products.csv"))
        
        # Load processed data
        app.state.instacart_future_df = pd.read_csv(os.path.join(PROCESSED_DATA_PATH, "instacart_future.csv"))
        
        app.state.data_loaded = {
            "orders": len(app.state.orders_df),
            "products": len(app.state.products_df),
            "future_baskets": len(app.state.instacart_future_df),
            "order_products_prior": len(app.state.order_products_prior_df)
        }
        
        logger.info("✅ Raw CSV data and processed data loaded for demo mode")
        logger.info(f"Data loaded: {app.state.data_loaded}")
        
    except Exception as e:
        logger.error(f"🚨 Could not load CSV data for demo: {e}")
        # Initialize empty DataFrames to prevent crashes
        app.state.orders_df = pd.DataFrame()
        app.state.order_products_prior_df = pd.DataFrame()
        app.state.order_products_train_df = pd.DataFrame()
        app.state.products_df = pd.DataFrame()
        app.state.instacart_future_df = pd.DataFrame()
        app.state.data_loaded = {"orders": 0, "products": 0, "future_baskets": 0, "order_products_prior": 0}
    
    logger.info("🎉 ML Service startup complete!")
    
    yield
    
    logger.info("🔄 ML Service shutdown complete.")

# ============================================================================
# FASTAPI APP INITIALIZATION
# ============================================================================

app = FastAPI(
    title="Timely ML Service", 
    version="2.0.0",
    description="AI-Powered Grocery Shopping - Next Basket Prediction Service",
    lifespan=lifespan,
    debug=DEBUG_MODE
)

# CORS configuration
ALLOWED_ORIGINS = ["*"]  # Configure as needed

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# ============================================================================
# HEALTH AND STATUS ENDPOINTS
# ============================================================================

@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Comprehensive health check for the service."""
    return HealthResponse(
        status="healthy" if app.state.model_loaded else "degraded",
        model_loaded=app.state.model_loaded,
        database_available=app.state.database_available,
        architecture="direct_database_access",
        feature_engineering="black_box",
        data_loaded=app.state.data_loaded
    )

@app.get("/service-info", tags=["Info"])
async def service_info():
    """Service information and available endpoints."""
    return {
        "service": "Timely ML Service",
        "version": "2.0.0",
        "mode": "production",
        "architecture": "direct_database_access",
        "feature_engineering": "black_box",
        "model_type": "stacked_basket_model",
        "environment": os.getenv("NODE_ENV", "development"),
        "endpoints": {
            "main_prediction": "/predict/from-database",
            "demo_prediction_consolidated": "/demo/prediction-comparison/{user_id}",
            "user_history": "/demo-data/instacart-user-order-history/{user_id}",
            "available_users": "/demo-data/available-users",
            "user_stats": "/demo-data/user-stats/{user_id}",
            "evaluation": "/evaluate-model"
        },
        "capabilities": {
            "database_predictions": app.state.database_available and app.state.model_loaded,
            "demo_predictions": app.state.model_loaded and app.state.data_loaded["orders"] > 0,
            "model_evaluation": app.state.model_loaded and app.state.data_loaded["future_baskets"] > 0,
            "csv_data_access": app.state.data_loaded["products"] > 0
        }
    }

# ============================================================================
# CORE PREDICTION ENDPOINTS
# ============================================================================

@app.post("/predict/from-database", tags=["Prediction"])
async def predict_from_database(request: PredictionRequest):
    """
    DEMAND 1: Main prediction endpoint using user's history from the database.
    """
    if not app.state.prediction_service:
        raise HTTPException(status_code=503, detail="Prediction service not available")
    
    try:
        logger.info(f"Database prediction request for user: {request.user_id}")
        predictions = app.state.prediction_service.predict_next_basket(request.user_id)
        
        return { 
            "user_id": request.user_id, 
            "predicted_products": predictions, 
            "source": "database", 
            "feature_engineering": "black_box",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Database prediction failed for user {request.user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

# ============================================================================
# DEMAND 3: CONSOLIDATED PREDICTION COMPARISON ENDPOINT
# ============================================================================

@app.post("/demo/prediction-comparison/{user_id_str}", tags=["Demo"])
async def get_demo_prediction_comparison(user_id_str: str):
    """
    DEMAND 3: Consolidated endpoint - prediction + ground truth + metrics in single call.
    CRITICAL FIX: This endpoint was missing and breaking Demand 3.
    """
    try:
        user_id = int(user_id_str)
        
        # Validate model and data availability
        if not app.state.model:
            raise HTTPException(status_code=503, detail="Model not loaded")
        
        if app.state.data_loaded["orders"] == 0:
            raise HTTPException(status_code=503, detail="CSV data not available")
        
        logger.info(f"Generating consolidated prediction comparison for user {user_id}")
        
        # STEP 1: Generate prediction from CSV data
        order_history = _generate_order_history_from_csv(user_id)
        if not order_history:
            raise HTTPException(
                status_code=404, 
                detail=f"No order history found for user {user_id} in CSV data. Try user IDs: 1, 7, 13, 25, 31, 42, 55, 60, 78, 92"
            )
        
        # Use DatabaseFeatureEngineer's CSV-compatible method
        features_df = app.state.demo_feature_engineer.generate_features_from_csv_data(
            str(user_id), app.state.orders_df, app.state.order_products_prior_df
        )
        
        if features_df.empty:
            raise HTTPException(status_code=404, detail=f"No features could be generated for demo user {user_id}")
        
        # Generate prediction using the model
        predicted_product_ids = app.state.model.predict(features_df, user_id)
        
        # STEP 2: Get ground truth basket from processed CSV
        user_future = app.state.instacart_future_df[app.state.instacart_future_df['user_id'] == user_id]
        
        if user_future.empty:
            raise HTTPException(status_code=404, detail=f"No ground truth future basket found for user {user_id}")
        
        # Extract ground truth product IDs
        true_product_ids = []
        for _, row in user_future.iterrows():
            if pd.notna(row['products']) and row['products']:
                # Handle both string and list formats
                if isinstance(row['products'], str):
                    try:
                        products = eval(row['products']) if row['products'].startswith('[') else [int(row['products'])]
                    except:
                        products = [int(row['products'])]
                else:
                    products = row['products'] if isinstance(row['products'], list) else [row['products']]
                true_product_ids.extend(products)
        
        # Remove duplicates and convert to integers
        true_product_ids = list(set([int(pid) for pid in true_product_ids if pd.notna(pid)]))
        
        # STEP 3: Calculate comparison metrics
        predicted_set = set(predicted_product_ids)
        true_set = set(true_product_ids)
        
        # Core metrics
        common_items = len(predicted_set.intersection(true_set))
        predicted_count = len(predicted_set)
        actual_count = len(true_set)
        
        # Precision, Recall, F1
        precision = common_items / predicted_count if predicted_count > 0 else 0
        recall = common_items / actual_count if actual_count > 0 else 0
        f1_score = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
        
        # Jaccard similarity
        union_items = len(predicted_set.union(true_set))
        jaccard_similarity = common_items / union_items if union_items > 0 else 0
        
        # STEP 4: Get product details for response
        predicted_products = _get_product_details(predicted_product_ids)
        true_products = _get_product_details(true_product_ids)
        
        # STEP 5: Generate performance summary
        if f1_score >= 0.5:
            match_quality = "Excellent"
        elif f1_score >= 0.3:
            match_quality = "Good"
        elif f1_score >= 0.1:
            match_quality = "Fair"
        else:
            match_quality = "Poor"
        
        # STEP 6: Return consolidated response
        return {
            "user_id": user_id,
            "predicted_basket": predicted_products,
            "true_future_basket": true_products,
            "comparison_metrics": {
                "predicted_count": predicted_count,
                "actual_count": actual_count,
                "common_items": common_items,
                "precision": round(precision, 4),
                "recall": round(recall, 4),
                "f1_score": round(f1_score, 4),
                "jaccard_similarity": round(jaccard_similarity, 4)
            },
            "performance_summary": {
                "match_quality": match_quality,
                "common_products": common_items,
                "prediction_accuracy": f"Predicted {predicted_count} items, {actual_count} were actually purchased",
                "model_performance": f"F1 Score: {f1_score:.3f}, Precision: {precision:.3f}, Recall: {recall:.3f}"
            },
            "source": "csv_live_demo",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except ValueError:
        raise HTTPException(status_code=400, detail="User ID must be a valid integer")
    except Exception as e:
        logger.error(f"Demo prediction comparison failed for user {user_id_str}: {e}")
        raise HTTPException(status_code=500, detail=f"Demo prediction comparison failed: {str(e)}")

# ============================================================================
# DEMAND 1 & 3 HELPER ENDPOINTS
# ============================================================================

@app.get("/demo-data/instacart-user-order-history/{user_id_str}", tags=["Demo Data"])
async def get_instacart_user_order_history(user_id_str: str):
    """DEMAND 1 & 3 HELPER: Get user's order history from CSV files."""
    try:
        user_id = int(user_id_str)
        order_history = _generate_order_history_from_csv(user_id)
        
        if not order_history:
            raise HTTPException(
                status_code=404, 
                detail=f"No prior order history found for user {user_id} in CSV data. Try user IDs: 1, 7, 13, 25, 31, 42, 55, 60, 78, 92"
            )
        
        return {
            "user_id": user_id, 
            "orders": order_history,
            "total_orders": len(order_history),
            "source": "instacart_csv",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except ValueError:
        raise HTTPException(status_code=400, detail="User ID must be a valid integer")
    except Exception as e:
        logger.error(f"Error fetching order history for user {user_id_str}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch order history: {str(e)}")

@app.get("/demo-data/available-users", tags=["Demo Data"])
async def get_available_users(limit: int = Query(50, description="Maximum number of user IDs to return")):
    """DEMAND 3 HELPER: Get available demo user IDs from CSV data."""
    try:
        if app.state.data_loaded["orders"] == 0:
            return {
                "message": "Demo user IDs (fallback list)",
                "note": "CSV data not available - using hardcoded demo user IDs",
                "available_users": [1, 7, 13, 25, 31, 42, 55, 60, 78, 92],
                "total_count": 10,
                "limit": limit
            }
        
        # Get users with multiple orders
        user_order_counts = app.state.orders_df['user_id'].value_counts()
        qualified_users = user_order_counts[user_order_counts >= 3].head(limit).index.tolist()
        
        return {
            "message": "Demo user IDs retrieved successfully",
            "note": "These are Instacart user IDs available for demonstration",
            "available_users": qualified_users,
            "total_count": len(qualified_users),
            "limit": limit
        }
        
    except Exception as e:
        logger.error(f"Error fetching available users: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch available users: {str(e)}")

@app.get("/demo-data/user-stats/{user_id_str}", tags=["Demo Data"])
async def get_user_stats(user_id_str: str):
    """Get statistical information about a demo user from CSV data."""
    try:
        user_id = int(user_id_str)
        
        if app.state.data_loaded["orders"] == 0:
            raise HTTPException(status_code=503, detail="CSV data not available")
        
        # Get user's orders
        user_orders = app.state.orders_df[app.state.orders_df['user_id'] == user_id]
        
        if user_orders.empty:
            raise HTTPException(status_code=404, detail=f"No data found for user {user_id}")
        
        # Calculate statistics
        total_orders = len(user_orders)
        avg_days_between_orders = user_orders['days_since_prior_order'].mean()
        favorite_dow = user_orders['order_dow'].mode().iloc[0] if not user_orders['order_dow'].mode().empty else 0
        favorite_hour = user_orders['order_hour_of_day'].mode().iloc[0] if not user_orders['order_hour_of_day'].mode().empty else 10
        
        # Get total products ordered
        user_order_ids = user_orders['order_id'].tolist()
        user_products = app.state.order_products_prior_df[
            app.state.order_products_prior_df['order_id'].isin(user_order_ids)
        ]
        total_products = len(user_products) if not user_products.empty else 0
        unique_products = user_products['product_id'].nunique() if not user_products.empty else 0
        
        # Day of week mapping
        dow_map = {0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 
                   4: 'Thursday', 5: 'Friday', 6: 'Saturday'}
        
        return {
            "user_id": user_id,
            "total_orders": total_orders,
            "total_products_ordered": total_products,
            "unique_products": unique_products,
            "avg_days_between_orders": round(avg_days_between_orders, 1) if pd.notna(avg_days_between_orders) else None,
            "favorite_day_of_week": dow_map.get(favorite_dow, 'Unknown'),
            "favorite_hour": favorite_hour,
            "order_frequency": "Weekly" if avg_days_between_orders and avg_days_between_orders <= 10 else "Bi-weekly",
            "customer_segment": "High-value" if total_orders >= 10 else "Regular",
            "data_quality": "Good" if total_orders >= 5 else "Limited"
        }
        
    except ValueError:
        raise HTTPException(status_code=400, detail="User ID must be a valid integer")
    except Exception as e:
        logger.error(f"Error fetching user stats for {user_id_str}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch user stats: {str(e)}")

# ============================================================================
# DEMAND 2: MODEL EVALUATION ENDPOINT
# ============================================================================

@app.post("/evaluate-model", tags=["Evaluation"])
async def evaluate_model():
    """DEMAND 2: Trigger comprehensive model evaluation."""
    if not app.state.model:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    if app.state.data_loaded["future_baskets"] == 0:
        raise HTTPException(status_code=503, detail="Evaluation data not available")
    
    try:
        logger.info("Starting comprehensive model evaluation...")
        
        # Load evaluation configuration
        keyset_path = os.path.join(PROCESSED_DATA_PATH, "instacart_keyset_0.json")
        if not os.path.exists(keyset_path):
            raise HTTPException(status_code=503, detail="Evaluation keyset not found")
        
        with open(keyset_path, 'r') as f:
            keyset = json.load(f)
        
        test_users = keyset.get('test', [])
        if not test_users:
            raise HTTPException(status_code=503, detail="No test users in keyset")
        
        # Limit evaluation size for performance
        sample_size = min(EVALUATION_SAMPLE_SIZE, len(test_users))
        test_sample = test_users[:sample_size]
        
        logger.info(f"Evaluating model on {sample_size} test users...")
        
        # Initialize evaluator
        evaluator = BasketPredictionEvaluator()
        
        predictions_data = []
        successful_evaluations = 0
        failed_evaluations = 0
        
        # Generate predictions and collect ground truth
        for user_id in test_sample:
            try:
                # Generate features and prediction
                features_df = app.state.demo_feature_engineer.generate_features_from_csv_data(
                    str(user_id), app.state.orders_df, app.state.order_products_prior_df
                )
                
                if features_df.empty:
                    failed_evaluations += 1
                    continue
                
                predicted_basket = app.state.model.predict(features_df, user_id)
                
                # Get ground truth
                user_future = app.state.instacart_future_df[app.state.instacart_future_df['user_id'] == user_id]
                
                if user_future.empty:
                    failed_evaluations += 1
                    continue
                
                # Extract ground truth product IDs
                true_products = []
                for _, row in user_future.iterrows():
                    if pd.notna(row['products']):
                        if isinstance(row['products'], str):
                            try:
                                products = eval(row['products']) if row['products'].startswith('[') else [int(row['products'])]
                            except:
                                products = [int(row['products'])]
                        else:
                            products = row['products'] if isinstance(row['products'], list) else [row['products']]
                        true_products.extend(products)
                
                true_products = list(set([int(pid) for pid in true_products if pd.notna(pid)]))
                
                if true_products:  # Only include if we have ground truth
                    predictions_data.append({
                        'user_id': user_id,
                        'predicted': predicted_basket,
                        'actual': true_products
                    })
                    successful_evaluations += 1
                
            except Exception as e:
                logger.warning(f"Evaluation failed for user {user_id}: {e}")
                failed_evaluations += 1
                continue
        
        if not predictions_data:
            raise HTTPException(status_code=500, detail="No successful evaluations generated")
        
        logger.info(f"Generated {successful_evaluations} successful evaluations, {failed_evaluations} failed")
        
        # Calculate comprehensive metrics
        metrics = evaluator.evaluate_predictions(predictions_data)
        
        # Add evaluation metadata
        evaluation_results = {
            **metrics,
            "evaluation_metadata": {
                "total_test_users": len(test_users),
                "sample_size": sample_size,
                "successful_evaluations": successful_evaluations,
                "failed_evaluations": failed_evaluations,
                "success_rate": round(successful_evaluations / sample_size * 100, 2),
                "evaluation_date": datetime.utcnow().isoformat(),
                "feature_engineering": "black_box"
            }
        }
        
        logger.info(f"Model evaluation completed successfully - F1@10: {metrics.get('f1_at_10', 0):.3f}")
        
        return evaluation_results
        
    except Exception as e:
        logger.error(f"Model evaluation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Model evaluation failed: {str(e)}")

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _generate_order_history_from_csv(user_id: int) -> List[Dict]:
    """Helper function to generate order history from CSV data."""
    try:
        # Get user's orders
        user_orders = app.state.orders_df[app.state.orders_df['user_id'] == user_id]
        
        if user_orders.empty:
            return []
        
        # Sort by order number to get chronological order
        user_orders = user_orders.sort_values('order_number')
        
        order_history = []
        for _, order in user_orders.iterrows():
            # Get products for this order
            order_products = app.state.order_products_prior_df[
                app.state.order_products_prior_df['order_id'] == order['order_id']
            ]
            
            if not order_products.empty:
                products = order_products['product_id'].tolist()
                product_details = _get_product_details(products)
                
                order_data = {
                    "order_id": int(order['order_id']),
                    "order_number": int(order['order_number']),
                    "order_dow": int(order['order_dow']),
                    "order_hour_of_day": int(order['order_hour_of_day']),
                    "days_since_prior_order": int(order['days_since_prior_order']) if pd.notna(order['days_since_prior_order']) else 7,
                    "products": product_details,
                    "total_items": len(product_details)
                }
                order_history.append(order_data)
        
        return order_history
        
    except Exception as e:
        logger.error(f"Error generating order history for user {user_id}: {e}")
        return []

def _get_product_details(product_ids: List[int]) -> List[Dict]:
    """Helper function to get product names and details from product IDs."""
    products = []
    for pid in product_ids:
        try:
            product_row = app.state.products_df[app.state.products_df['product_id'] == pid]
            if not product_row.empty:
                products.append({
                    "id": int(pid),
                    "name": product_row.iloc[0]['product_name'],
                    "aisle_id": int(product_row.iloc[0]['aisle_id']),
                    "department_id": int(product_row.iloc[0]['department_id'])
                })
            else:
                products.append({
                    "id": int(pid),
                    "name": f"Product {pid}",
                    "aisle_id": 0,
                    "department_id": 0
                })
        except Exception as e:
            logger.warning(f"Error getting details for product {pid}: {e}")
            products.append({
                "id": int(pid),
                "name": f"Product {pid}",
                "aisle_id": 0,
                "department_id": 0
            })
    return products

# ============================================================================
# MAIN APPLICATION ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        app, 
        host=SERVICE_HOST, 
        port=SERVICE_PORT,
        log_level="info"
    )