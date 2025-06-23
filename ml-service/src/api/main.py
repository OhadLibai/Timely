# ml-service/src/api/main.py
# COMPLETE IMPLEMENTATION: All helper functions and endpoints for four demands

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
    
    # DatabaseFeatureEngineer for all CSV-based demo operations
    app.state.demo_feature_engineer = DatabaseFeatureEngineer(PROCESSED_DATA_PATH)
    logger.info("✅ DatabaseFeatureEngineer initialized for demo operations")
    
    # Load raw data for demo mode
    try:
        app.state.orders_df = pd.read_csv(os.path.join(RAW_DATA_PATH, "orders.csv"))
        app.state.order_products_prior_df = pd.read_csv(os.path.join(RAW_DATA_PATH, "order_products__prior.csv"))
        app.state.order_products_train_df = pd.read_csv(os.path.join(RAW_DATA_PATH, "order_products__train.csv"))
        app.state.products_df = pd.read_csv(os.path.join(RAW_DATA_PATH, "products.csv"))
        
        # Load processed data
        app.state.instacart_future_df = pd.read_csv(os.path.join(PROCESSED_DATA_PATH, "instacart_future.csv"))
        logger.info("✅ Raw CSV data and processed data loaded for demo mode")
    except Exception as e:
        logger.error(f"🚨 Could not load CSV data for demo: {e}")
        # Initialize empty DataFrames to prevent crashes
        app.state.orders_df = pd.DataFrame()
        app.state.order_products_prior_df = pd.DataFrame()
        app.state.order_products_train_df = pd.DataFrame()
        app.state.products_df = pd.DataFrame()
        app.state.instacart_future_df = pd.DataFrame()

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
        "feature_engineering": "black_box",
        "data_loaded": {
            "orders": len(app.state.orders_df) if hasattr(app.state, 'orders_df') else 0,
            "products": len(app.state.products_df) if hasattr(app.state, 'products_df') else 0,
            "future_baskets": len(app.state.instacart_future_df) if hasattr(app.state, 'instacart_future_df') else 0
        }
    }

@app.get("/service-info", tags=["Info"])
async def service_info():
    """Service information endpoint."""
    return {
        "mode": "production",
        "architecture": "direct_database_access",
        "feature_engineering": "black_box",
        "model_type": "stacked_basket_model",
        "version": "2.0.0",
        "endpoints": {
            "main_prediction": "/predict/from-database",
            "demo_prediction": "/predict/for-demo", 
            "user_history": "/demo-data/instacart-user-order-history/{user_id}",
            "ground_truth": "/demo-data/user-future-basket/{user_id}",
            "evaluation": "/evaluate-model"
        }
    }

# --- MAIN PREDICTION ENDPOINT (for functioning app) ---
@app.post("/predict/from-database", tags=["Prediction"])
async def predict_from_database(request: PredictionRequest):
    """Predicts by fetching user's history directly from the application database."""
    if not app.state.prediction_service:
        raise HTTPException(status_code=503, detail="Prediction service not available")
    
    try:
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

# --- DEMAND 3: LIVE DEMO ENDPOINT (temporary, from CSVs) ---
@app.post("/predict/for-demo", tags=["Demo"])
async def predict_for_demo(request: PredictionRequest):
    """Generates a temporary prediction for a demo user ID directly from CSV files."""
    if not app.state.model:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        user_id = int(request.user_id)
        
        # Generate order history from CSV data
        order_history = _generate_order_history_from_csv(user_id)
        if not order_history:
            raise HTTPException(status_code=404, detail=f"No order history found for user {user_id} in CSV data")
        
        # Use DatabaseFeatureEngineer's CSV-compatible method
        features_df = app.state.demo_feature_engineer.extract_features_from_csv(
            str(user_id), 
            app.state.orders_df, 
            app.state.order_products_prior_df
        )
        
        if features_df.empty:
            raise HTTPException(status_code=404, detail=f"No features could be generated for demo user {user_id}")
        
        predicted_basket = app.state.model.predict(features_df, user_id)
        return { 
            "user_id": user_id, 
            "predicted_products": predicted_basket, 
            "source": "csv_live_demo",
            "feature_engineering": "black_box",
            "timestamp": datetime.utcnow().isoformat()
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="User ID must be a valid integer")
    except Exception as e:
        logger.error(f"Demo prediction failed for user {request.user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Demo prediction failed: {str(e)}")

# --- DEMAND 1 & 3 HELPER: Get Instacart History from CSVs ---
@app.get("/demo-data/instacart-user-order-history/{user_id_str}", tags=["Demo Data"])
async def get_instacart_user_order_history(user_id_str: str):
    """Fetches a user's complete order history from the original Instacart CSVs."""
    try:
        user_id = int(user_id_str)
        order_history = _generate_order_history_from_csv(user_id)
        
        if not order_history:
            raise HTTPException(status_code=404, detail=f"No prior order history found for user {user_id} in CSV data. Try user IDs: 1, 7, 13, 25, 31, 42, 55, 60, 78, 92")
        
        return {
            "user_id": user_id, 
            "orders": order_history,
            "total_orders": len(order_history),
            "timestamp": datetime.utcnow().isoformat()
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="User ID must be a valid integer")
    except Exception as e:
        logger.error(f"Error fetching order history for user {user_id_str}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch order history: {str(e)}")

# --- DEMAND 3 HELPER: Get Ground Truth Basket from CSVs ---
@app.get("/demo-data/user-future-basket/{user_id_str}", tags=["Demo Data"])
async def get_user_future_basket(user_id_str: str):
    """Fetches the ground truth 'future' basket for a user from the processed CSVs."""
    try:
        user_id = int(user_id_str)
        
        if app.state.instacart_future_df.empty:
            raise HTTPException(status_code=503, detail="Future basket data not loaded")
        
        future_series = app.state.instacart_future_df[app.state.instacart_future_df['user_id'] == user_id]
        if future_series.empty:
            raise HTTPException(status_code=404, detail=f"Future basket not found for user {user_id}")
        
        # Handle both string and list formats for products
        products_data = future_series.iloc[0]['products']
        if isinstance(products_data, str):
            try:
                products = json.loads(products_data)
            except json.JSONDecodeError:
                products = []
        else:
            products = products_data if isinstance(products_data, list) else []
        
        return {
            "user_id": user_id, 
            "products": products,
            "timestamp": datetime.utcnow().isoformat()
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="User ID must be a valid integer")
    except Exception as e:
        logger.error(f"Error fetching future basket for user {user_id_str}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch future basket: {str(e)}")

# --- DEMAND 2: MODEL EVALUATION ENDPOINT ---
@app.post("/evaluate-model", tags=["Model Evaluation"])
async def evaluate_model():
    """Triggers a full model evaluation against the test set from the CSVs."""
    if not app.state.model:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        # Load test set
        keyset_path = os.path.join(PROCESSED_DATA_PATH, 'instacart_keyset_0.json')
        if not os.path.exists(keyset_path):
            raise HTTPException(status_code=404, detail="Test keyset not found")
        
        with open(keyset_path, 'r') as f:
            keyset = json.load(f)
        
        test_user_ids = keyset.get('test', [])
        if not test_user_ids:
            raise HTTPException(status_code=404, detail="No test users found in keyset")

        logger.info(f"Starting evaluation with {len(test_user_ids)} test users...")
        
        predictions_for_eval = []
        successful_predictions = 0
        
        # Limit evaluation to prevent timeout
        max_eval_users = min(100, len(test_user_ids))
        test_sample = test_user_ids[:max_eval_users]
        
        for user_id in test_sample:
            try:
                # Generate features using the same method as demo predictions
                order_history = _generate_order_history_from_csv(user_id)
                if not order_history:
                    continue
                    
                features_df = app.state.demo_feature_engineer.extract_features_from_csv(
                    str(user_id), 
                    app.state.orders_df, 
                    app.state.order_products_prior_df
                )
                
                if features_df.empty:
                    continue
                
                predicted_products = app.state.model.predict(features_df, user_id)
                
                # Get actual products from future data
                future_df = app.state.instacart_future_df
                actual_products_series = future_df[future_df['user_id'] == user_id]['products']
                
                if not actual_products_series.empty:
                    actual_data = actual_products_series.iloc[0]
                    if isinstance(actual_data, str):
                        try:
                            actual_products = json.loads(actual_data)
                        except json.JSONDecodeError:
                            actual_products = []
                    else:
                        actual_products = actual_data if isinstance(actual_data, list) else []
                else:
                    actual_products = []
                
                predictions_for_eval.append({
                    "user_id": user_id, 
                    "predicted_products": predicted_products, 
                    "actual_products": actual_products
                })
                successful_predictions += 1
                
            except Exception as e:
                logger.debug(f"Skipping user {user_id} due to error: {e}")
                continue

        if not predictions_for_eval:
            raise HTTPException(status_code=404, detail="No valid predictions could be generated for evaluation")

        logger.info(f"Generated {successful_predictions} successful predictions for evaluation")
        
        # Run evaluation
        evaluator = BasketPredictionEvaluator()
        results = evaluator.evaluate_model(predictions_for_eval)
        
        return { 
            "message": "Model evaluation completed successfully", 
            "metrics": results,
            "evaluation_stats": {
                "total_test_users": len(test_user_ids),
                "evaluated_users": max_eval_users,
                "successful_predictions": successful_predictions,
                "success_rate": f"{(successful_predictions / max_eval_users) * 100:.1f}%"
            },
            "timestamp": datetime.utcnow().isoformat(),
            "feature_engineering": "black_box"
        }
        
    except Exception as e:
        logger.error(f"Evaluation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")
    
    
@app.post("/demo/prediction-comparison/{user_id_str}", tags=["Demo"])
async def get_demo_prediction_comparison(user_id_str: str):
    """
    DEMAND 3: CONSOLIDATED ENDPOINT - Single call for prediction + ground truth + metrics
    
    This replaces the inefficient two-call pattern with a single, optimized endpoint
    that handles all demo prediction comparison logic in the ML service.
    """
    if not app.state.model:
        raise HTTPException(status_code=503, detail="ML model not available")
    
    if not app.state.demo_feature_engineer:
        raise HTTPException(status_code=503, detail="Demo feature engineer not available")
        
    try:
        logger.info(f"Generating consolidated demo prediction comparison for user {user_id_str}")
        
        # ====================================================================
        # STEP 1: Generate ML prediction from CSV data
        # ====================================================================
        try:
            user_features = app.state.demo_feature_engineer.extract_features_from_csv(user_id_str)
            if user_features.empty:
                raise HTTPException(
                    status_code=404, 
                    detail=f"No feature data available for user {user_id_str}"
                )
            
            predicted_product_ids = app.state.model.predict(user_id_str, user_features)
            logger.info(f"Generated prediction with {len(predicted_product_ids)} products")
            
        except Exception as e:
            logger.error(f"Prediction generation failed: {e}")
            raise HTTPException(
                status_code=500, 
                detail=f"Prediction failed: {str(e)}"
            )
        
        # ====================================================================
        # STEP 2: Fetch ground truth basket from CSV
        # ====================================================================
        try:
            # Find user's actual next basket from train set
            train_user_data = app.state.train_df[app.state.train_df['user_id'] == int(user_id_str)]
            
            if train_user_data.empty:
                logger.warning(f"No ground truth found for user {user_id_str}")
                ground_truth_products = []
            else:
                # Get the actual products the user bought
                ground_truth_products = train_user_data['product_id'].tolist()
                logger.info(f"Found ground truth with {len(ground_truth_products)} products")
                
        except Exception as e:
            logger.error(f"Ground truth retrieval failed: {e}")
            ground_truth_products = []
        
        # ====================================================================
        # STEP 3: Map product IDs to product names using orders_df
        # ====================================================================
        try:
            # Get predicted product names
            predicted_product_names = []
            if predicted_product_ids:
                predicted_mask = app.state.orders_df['product_id'].isin(predicted_product_ids)
                predicted_products_data = app.state.orders_df[predicted_mask]['product_name'].unique()
                predicted_product_names = predicted_products_data.tolist()
            
            # Get ground truth product names  
            ground_truth_product_names = []
            if ground_truth_products:
                truth_mask = app.state.orders_df['product_id'].isin(ground_truth_products)
                truth_products_data = app.state.orders_df[truth_mask]['product_name'].unique()
                ground_truth_product_names = truth_products_data.tolist()
                
        except Exception as e:
            logger.error(f"Product name mapping failed: {e}")
            predicted_product_names = [f"Product {pid}" for pid in predicted_product_ids]
            ground_truth_product_names = [f"Product {pid}" for pid in ground_truth_products]
        
        # ====================================================================
        # STEP 4: Calculate comparison metrics
        # ====================================================================
        predicted_set = set(predicted_product_ids)
        ground_truth_set = set(ground_truth_products)
        
        common_products = predicted_set.intersection(ground_truth_set)
        
        comparison_metrics = {
            "predicted_count": len(predicted_product_ids),
            "actual_count": len(ground_truth_products), 
            "common_items": len(common_products),
            "precision": len(common_products) / len(predicted_product_ids) if predicted_product_ids else 0,
            "recall": len(common_products) / len(ground_truth_products) if ground_truth_products else 0,
            "jaccard_similarity": len(common_products) / len(predicted_set.union(ground_truth_set)) if predicted_set.union(ground_truth_set) else 0
        }
        
        # Calculate F1 score
        precision = comparison_metrics["precision"]
        recall = comparison_metrics["recall"]
        comparison_metrics["f1_score"] = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
        
        # ====================================================================
        # STEP 5: Format response for frontend
        # ====================================================================
        predicted_basket = [
            {
                "id": str(pid),
                "name": name,
                "imageUrl": f"/api/products/{pid}/image",
                "price": 0,  # Demo price
                "category": "Demo Category"
            }
            for pid, name in zip(predicted_product_ids, predicted_product_names)
        ]
        
        true_future_basket = [
            {
                "id": str(pid), 
                "name": name,
                "imageUrl": f"/api/products/{pid}/image",
                "price": 0,  # Demo price
                "category": "Demo Category"
            }
            for pid, name in zip(ground_truth_products, ground_truth_product_names)
        ]
        
        result = {
            "user_id": user_id_str,
            "predicted_basket": predicted_basket,
            "true_future_basket": true_future_basket,
            "comparison_metrics": comparison_metrics,
            "source": "consolidated_csv_analysis",
            "timestamp": datetime.utcnow().isoformat(),
            "performance_summary": {
                "match_quality": "excellent" if comparison_metrics["f1_score"] > 0.7 else 
                               "good" if comparison_metrics["f1_score"] > 0.4 else 
                               "moderate" if comparison_metrics["f1_score"] > 0.2 else "needs_improvement",
                "prediction_confidence": len(predicted_product_ids) / 10.0 if len(predicted_product_ids) <= 10 else 1.0
            }
        }
        
        logger.info(f"✅ Consolidated demo comparison completed for user {user_id_str}")
        logger.info(f"   Metrics: P={precision:.3f}, R={recall:.3f}, F1={comparison_metrics['f1_score']:.3f}")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Demo prediction comparison failed for user {user_id_str}: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Demo comparison failed: {str(e)}"
        )

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _generate_order_history_from_csv(user_id: int) -> List[Dict]:
    """
    COMPLETE IMPLEMENTATION: Generate order history from CSV files for a specific user.
    
    Args:
        user_id: Integer user ID from Instacart dataset
        
    Returns:
        List of order dictionaries with products and metadata
    """
    try:
        if app.state.orders_df.empty or app.state.order_products_prior_df.empty:
            logger.warning("CSV data not loaded")
            return []
        
        # Get all prior orders for this user
        user_orders = app.state.orders_df[
            (app.state.orders_df['user_id'] == user_id) & 
            (app.state.orders_df['eval_set'] == 'prior')
        ].sort_values('order_number')
        
        if user_orders.empty:
            logger.debug(f"No prior orders found for user {user_id}")
            return []
        
        order_history = []
        
        for _, order in user_orders.iterrows():
            # Get products for this order
            order_products = app.state.order_products_prior_df[
                app.state.order_products_prior_df['order_id'] == order['order_id']
            ]
            
            if len(order_products) == 0:
                continue
            
            # Convert product IDs to names if products data is available
            products = []
            for _, product_row in order_products.iterrows():
                product_id = product_row['product_id']
                
                # Try to get product name
                if not app.state.products_df.empty:
                    product_info = app.state.products_df[app.state.products_df['product_id'] == product_id]
                    if not product_info.empty:
                        product_name = product_info.iloc[0]['product_name']
                        products.append({
                            'id': str(product_id),
                            'product_id': product_id,
                            'name': product_name
                        })
                    else:
                        products.append(product_id)
                else:
                    products.append(product_id)
            
            # Calculate order date (approximate)
            days_since_prior = order['days_since_prior_order'] if pd.notna(order['days_since_prior_order']) else 7
            order_number = order['order_number']
            estimated_date = datetime.now() - pd.Timedelta(days=(100 - order_number) * 7)
            
            order_data = {
                'order_id': int(order['order_id']),
                'order_number': int(order['order_number']),
                'order_dow': int(order['order_dow']) if pd.notna(order['order_dow']) else 0,
                'order_hour_of_day': int(order['order_hour_of_day']) if pd.notna(order['order_hour_of_day']) else 10,
                'days_since_prior_order': days_since_prior,
                'products': products,
                'total_amount': len(products) * 15.50,  # Estimated total
                'order_date': estimated_date.isoformat()
            }
            
            order_history.append(order_data)
        
        logger.debug(f"Generated {len(order_history)} orders for user {user_id}")
        return order_history
        
    except Exception as e:
        logger.error(f"Error generating order history for user {user_id}: {e}")
        return []

# --- ADDITIONAL UTILITY ENDPOINTS ---

@app.get("/demo-data/user-stats/{user_id_str}", tags=["Demo Data"])
async def get_user_stats(user_id_str: str):
    """Get statistics about a user's shopping behavior."""
    try:
        user_id = int(user_id_str)
        order_history = _generate_order_history_from_csv(user_id)
        
        if not order_history:
            raise HTTPException(status_code=404, detail=f"No data found for user {user_id}")
        
        # Calculate statistics
        total_orders = len(order_history)
        total_products = sum(len(order['products']) for order in order_history)
        avg_basket_size = total_products / total_orders if total_orders > 0 else 0
        
        # Get ordering patterns
        days_of_week = [order['order_dow'] for order in order_history]
        hours_of_day = [order['order_hour_of_day'] for order in order_history]
        
        most_common_dow = max(set(days_of_week), key=days_of_week.count) if days_of_week else 0
        most_common_hour = max(set(hours_of_day), key=hours_of_day.count) if hours_of_day else 10
        
        return {
            "user_id": user_id,
            "total_orders": total_orders,
            "total_products": total_products,
            "avg_basket_size": round(avg_basket_size, 2),
            "shopping_patterns": {
                "most_common_day_of_week": most_common_dow,
                "most_common_hour": most_common_hour
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except ValueError:
        raise HTTPException(status_code=400, detail="User ID must be a valid integer")
    except Exception as e:
        logger.error(f"Error generating user stats for {user_id_str}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate user stats: {str(e)}")

@app.get("/demo-data/available-users", tags=["Demo Data"])
async def get_available_users(limit: int = 20):
    """Get a list of available user IDs for demo purposes."""
    try:
        if app.state.orders_df.empty:
            raise HTTPException(status_code=503, detail="Order data not loaded")
        
        # Get users with prior orders
        users_with_orders = app.state.orders_df[
            app.state.orders_df['eval_set'] == 'prior'
        ]['user_id'].value_counts().head(limit)
        
        available_users = []
        for user_id, order_count in users_with_orders.items():
            available_users.append({
                "user_id": int(user_id),
                "order_count": int(order_count)
            })
        
        return {
            "available_users": available_users,
            "total_available": len(users_with_orders),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error fetching available users: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch available users: {str(e)}")

# ============================================================================
# Error handler for better debugging
# ============================================================================

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception on {request.url}: {exc}", exc_info=True)
    return HTTPException(status_code=500, detail="Internal server error")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)