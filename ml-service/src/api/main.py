# ml-service/src/api/main.py
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from datetime import datetime
import os
import asyncio
import pandas as pd # For loading features_df
import json # For parsing product lists

from pydantic import BaseModel
from typing import List

# Assuming these are the correct paths from your project structure
from ..models.stacked_basket_model import StackedBasketModel
from ..evaluation.evaluator import BasketPredictionEvaluator
from ..services.feature_engineering import FeatureEngineer
from ..services.prediction_service import PredictionService # Main prediction service
from ..database.connection import get_db, engine # get_db might not be used if using SQLAlchemy engine directly
from ..database.models import Base # For table creation
from ..api.routes import predictions, metrics, training # Assuming these are your existing routers
from ..utils.logger import setup_logger

# Setup logger
logger = setup_logger(__name__)

PROCESSED_DATA_PATH = os.getenv("PROCESSED_DATA_PATH", "/app/training-data/processed")
INSTACART_DATA_PATH = os.getenv("RAW_DATA_PATH", "/app/training-data") # For raw Instacart files
MODEL_PATH_BASE = os.getenv("MODEL_PATH", "/app/models")
ORDERS_DF = pd.read_csv('./training-data/orders.csv')
ORDER_PRODUCTS_PRIOR_DF = pd.read_csv('./training-data/order_products__prior.csv')

# Pydantic model for the request body of our new endpoint
class PredictionRequestFromDbHistory(BaseModel):
    user_id: str # application's user UUID
    order_history: List[List[int]] # A list of past orders, where each order is a list of product IDs


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handles startup logic for the application, loading the stacked model.
    """
    logger.info("Application startup...")

    # --- 1. Initialize and Load the Stacked Model ---
    app.state.model = StackedBasketModel()
    try:
        # The load_models method will load both stage1_lgbm.pkl and stage2_gbc.pkl
        app.state.model.load_models(MODEL_PATH_BASE)
        logger.info("✅ Successfully loaded two-stage stacked model.")
    except FileNotFoundError as e:
        logger.error(f"🚨 CRITICAL: A model file was not found in {MODEL_PATH_BASE}. Prediction service will be unavailable. Error: {e}", exc_info=True)
        app.state.model = None
    except Exception as e:
        logger.error(f"🚨 CRITICAL: An error occurred loading the models: {e}", exc_info=True)
        app.state.model = None

    # --- 2. Load features.csv into memory ---
    # This is still required as input for the Stage 1 model.
    app.state.features_df = None
    if app.state.model:
        try:
            features_csv_path = os.path.join(PROCESSED_DATA_PATH, "features.csv")
            app.state.features_df = pd.read_csv(features_csv_path)
            logger.info(f"✅ Global features_df loaded. Shape: {app.state.features_df.shape}")
        except FileNotFoundError:
            logger.warning(f"⚠️ features.csv not found. Prediction and evaluation will fail.")
        except Exception as e:
            logger.error(f"Error loading global features_df: {e}", exc_info=True)


    # --- 3. Load Feature Engineering Components ---
    # This is for real-time prediction, not batch evaluation.
    app.state.feature_engineer = FeatureEngineer(PROCESSED_DATA_PATH)
    logger.info("FeatureEngineer initialized.")

    # --- 4. Initialize Prediction Service ---
    # This service encapsulates prediction logic, called by other endpoints.    
    if app.state.model and app.state.feature_engineer:
        app.state.prediction_service = PredictionService(app.state.model, app.state.feature_engineer, app.state.features_df)
        logger.info("✅ PredictionService initialized with stacked model.")
    else:
        app.state.prediction_service = None
        logger.warning("⚠️ PredictionService could not be initialized.")

    yield # The application runs here

    # --- Shutdown Logic ---
    logger.info("Application shutdown.")


app = FastAPI(
    title="Timely ML Service",
    description="Machine Learning service for next basket prediction and related tasks.",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include existing routers
app.include_router(predictions.router, prefix="/api/predictions", tags=["predictions"])
app.include_router(metrics.router, prefix="/api/metrics", tags=["metrics"])
app.include_router(training.router, prefix="/api/training", tags=["training"])


# --- Demo Endpoints ---
@app.post("/evaluate", tags=["Evaluation"])
async def evaluate_model_endpoint():
    """
    Triggers an evaluation of the loaded model against the test set and
    returns the full metrics dictionary in the response.
    """
    if not app.state.model:
        raise HTTPException(status_code=503, detail="Model is not loaded.")

    try:
        logger.info("Starting on-demand model evaluation...")
        features_df = pd.read_csv(os.path.join(PROCESSED_DATA_PATH, 'features.csv'))
        instacart_future_df = pd.read_csv(os.path.join(PROCESSED_DATA_PATH, 'instacart_future.csv'))
        with open(os.path.join(PROCESSED_DATA_PATH, 'instacart_keyset_0.json'), 'r') as f:
            keyset = json.load(f)

        test_user_ids = keyset.get('test', [])
        if not test_user_ids:
            raise HTTPException(status_code=404, detail="No test users found in keyset.")

        predictions_for_eval = []
        test_features = features_df[features_df['user_id'].isin(test_user_ids)]
        
        for user_id in test_user_ids:
            actual_products_series = instacart_future_df[instacart_future_df['user_id'] == user_id]['products']
            actual_products = json.loads(actual_products_series.iloc[0]) if not actual_products_series.empty else []
            prediction_df = app.state.model.predict_basket(test_features, user_id, top_k=50)
            predicted_products = prediction_df['product_id'].tolist()
            
            predictions_for_eval.append({
                "user_id": user_id,
                "predicted_products": predicted_products,
                "actual_products": actual_products,
            })

        evaluator = BasketPredictionEvaluator()
        results = evaluator.evaluate_model(predictions_for_eval)
        logger.info("Evaluation complete.")
        return {"message": "Evaluation complete. See results below.", "metrics": results}

    except FileNotFoundError as e:
        logger.error(f"Evaluation data file not found: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Evaluation data file not found: {e.filename}")
    except Exception as e:
        logger.error(f"An error occurred during evaluation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An error occurred during evaluation: {str(e)}")
    

@app.get("/demo-data/user-future-basket/{user_id_str}", tags=["Demo Data"])
async def get_user_future_basket_debug_endpoint(user_id_str: str):
    try:
        user_id = int(user_id_str)
        future_df_path = os.path.join(PROCESSED_DATA_PATH, "instacart_future.csv")
        if not os.path.exists(future_df_path):
            logger.error(f"instacart_future.csv not found at {future_df_path}")
            raise HTTPException(status_code=500, detail="Server data error: instacart_future.csv not found.")

        future_df = pd.read_csv(future_df_path)
        user_future_series = future_df[future_df['user_id'] == user_id]

        if user_future_series.empty:
            raise HTTPException(status_code=404, detail=f"Future basket not found for Instacart user_id {user_id}")
        
        products_str = user_future_series.iloc[0]['products']
        # Ensure product_ids are integers as they are from Instacart dataset
        product_ids = [int(p) for p in json.loads(products_str)]
        
        return {"user_id": user_id, "products": product_ids}
    except FileNotFoundError: # Should be caught by os.path.exists now
        raise HTTPException(status_code=500, detail="Server data error: instacart_future.csv not found.")
    except Exception as e:
        logger.error(f"Error fetching future basket for user {user_id_str}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    

@app.get("/demo-data/instacart-user-order-history/{user_id}", tags=["Demo Data"])
def get_instacart_user_order_history(user_id: int):
    """
    Retrieves the entire order history for a given Instacart user ID
    from the original CSV files.
    """
    user_orders = ORDERS_DF[ORDERS_DF['user_id'] == user_id]
    if user_orders.empty:
        raise HTTPException(status_code=404, detail="Instacart user not found")

    # Get all order IDs for the user
    user_order_ids = user_orders['order_id'].tolist()

    # Get all product SKUs for those orders
    order_details = ORDER_PRODUCTS_PRIOR_DF[ORDER_PRODUCTS_PRIOR_DF['order_id'].isin(user_order_ids)]

    # Group products by order
    grouped_orders = order_details.groupby('order_id')['product_id'].apply(list).reset_index()

    # Join with order info (like order number)
    final_history = pd.merge(grouped_orders, user_orders, on='order_id')
    
    # Return as JSON
    return final_history.to_dict(orient='records')


# --- Standard Endpoints ---
@app.get("/")
async def root():
    return {"service": "Timely ML Service", "status": "running", "timestamp": datetime.utcnow().isoformat()}

@app.get("/model/feature-importance")
async def get_feature_importance():
    """
    Retrieves saved feature importance data from the JSON file created during training.
    """
    try:
        # Construct the path relative to the model storage location
        importance_path = os.path.join(MODEL_PATH_BASE, "feature_importances.json")
        with open(importance_path, 'r') as f:
            importance_data = json.load(f)
        
        # The data is already sorted and formatted correctly by our training script
        return importance_data[:20] # Return top 20 features

    except FileNotFoundError:
        logger.error(f"feature_importances.json not found at {importance_path}", exc_info=True)
        raise HTTPException(status_code=404, detail="Feature importance data not found. The model may need to be (re)trained.")
    except Exception as e:
        logger.error(f"Error reading feature importance file: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Could not load feature importance data.")


@app.post("/predict/from-db-history", tags=["Prediction"])
async def predict_from_db_history(request: PredictionRequestFromDbHistory):
    """
    Predicts a basket based on order history provided from the app's database.
    """
    if not app.state.prediction_service:
        raise HTTPException(status_code=503, detail="Prediction service is not available.")
    
    try:
        # THIS IS NO LONGER A MOCK
        # 1. Generate features from the user's history
        user_features_df = app.state.feature_engineer.generate_features_for_user(request.order_history)
        
        # If no features could be generated, return an empty basket
        if user_features_df.empty:
            return {"predicted_skus": []}

        # 2. Get a prediction from the stacked model using these features
        # The model's predict method will need to be adapted to accept a feature dataframe
        predicted_skus = app.state.prediction_service.predict(user_features_df, request.user_id)
        
        return {"predicted_skus": predicted_skus}

    except Exception as e:
        logger.error(f"Error in /predict/from-db-history: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate prediction from DB history.")
    

@app.get("/health")
async def health_check():
    try:
        model_status = "Not Loaded"
        if app.state.model:
            if hasattr(app.state.model, 'model') and app.state.model.model: # For LightGBMModel
                 model_status = "Loaded (Basic)"
            elif hasattr(app.state.model, 'model') and hasattr(app.state.model.model, 'model') and app.state.model.model.model: # For EnhancedLightGBMModel (model within model)
                 model_status = "Loaded (Enhanced)"
            elif app.state.model: # Catch all if model object exists but internal 'model' attribute check fails
                 model_status = "Loaded (Unknown Structure)"

        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "services": {
                "model": model_status,
                "database": "connected (assumed, check via engine ping if needed)"
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=503, detail="Service unavailable")
  


    

if __name__ == "__main__":
    import uvicorn
    # For Uvicorn, env vars are typically set before Uvicorn starts, or via --env-file if supported
    # Or rely on them being set in the Docker environment
    logger.info(f"PROCESSED_DATA_PATH for Uvicorn: {PROCESSED_DATA_PATH}")
    logger.info(f"RAW_DATA_PATH for Uvicorn: {INSTACART_DATA_PATH}")
    uvicorn.run(app, host="0.0.0.0", port=8000)