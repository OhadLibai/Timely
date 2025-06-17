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

PROCESSED_DATA_PATH = os.getenv("PROCESSED_DATA_PATH", "/app/data/processed")
INSTACART_DATA_PATH = os.getenv("RAW_DATA_PATH", "/app/data") # For raw Instacart files
MODEL_PATH_BASE = os.getenv("MODEL_PATH", "/app/models")

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
    app.state.feature_engineer = FeatureEngineer()
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
    version="1.0.2", # Incremented version
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
@app.post("/evaluate")
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
    

@app.post("/api/predict/for-user-history", tags=["Demo"])
async def predict_for_user_instacart_history_endpoint(payload: dict):
    user_id_str = payload.get("user_id")
    if not user_id_str:
        raise HTTPException(status_code=400, detail="user_id (Instacart integer ID) is required")

    if not app.state.model:
        raise HTTPException(status_code=503, detail="ML Model is not loaded.")

    # Check if we are using EnhancedLightGBMModel and have features_df
    if isinstance(app.state.model, EnhancedLightGBMModel):
        if app.state.features_df is None:
            logger.error("features_df is not loaded, cannot use EnhancedLightGBMModel.predict_basket for demo.")
            raise HTTPException(status_code=500, detail="Server configuration error: Feature data not available.")
        try:
            logger.info(f"Predicting for Instacart User ID {user_id_str} using EnhancedLightGBMModel.")
            # predict_basket expects integer user_id
            raw_predictions = app.state.model.predict_basket(app.state.features_df, int(user_id_str), k=10)
            # Ensure productId is int as per Instacart dataset, score is float
            api_predictions = [{"productId": int(pid), "quantity": 1, "score": float(score)} for pid, score in raw_predictions]
            return {"predictions": api_predictions}
        except Exception as e:
            logger.error(f"Error predicting with EnhancedLightGBMModel for user {user_id_str}: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")
    else:
        # Fallback or if using the basic LightGBMModel which might have a different prediction pathway
        # This part would require your PredictionService to be adapted to take an Instacart user ID
        # and generate features on the fly, or use a pre-calculated feature vector.
        # For simplicity, this demo endpoint focuses on EnhancedLightGBMModel with pre-loaded features_df.
        logger.warning(f"Demo prediction not fully implemented for model type: {type(app.state.model)}. Returning placeholder.")
        # Placeholder:
        sample_product_ids = [196, 27856, 16797, 38689, 26209] # Example product IDs
        predictions_placeholder = [{"productId": pid, "quantity": 1, "score": round(0.5 + (idx*0.05),2)} for idx, pid in enumerate(sample_product_ids)]
        return {"predictions": predictions_placeholder}


@app.get("/api/debug/user-future-basket/{user_id_str}", tags=["Demo"])
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


# --- Standard Endpoints ---
@app.get("/")
async def root():
    return {"service": "Timely ML Service", "status": "running", "timestamp": datetime.utcnow().isoformat()}

@app.get("/model/feature-importance")
async def get_feature_importance():
    if not app.state.model or not hasattr(app.state.model.model, 'feature_importances_'):
        raise HTTPException(status_code=503, detail="Model with feature importance not loaded.")
    
    feature_names = app.state.model.model.feature_name_
    importances = app.state.model.model.feature_importances_
    
    # Create a list of dictionaries
    importance_data = [{"feature": name, "importance": float(imp)} for name, imp in zip(feature_names, importances)]
    
    # Sort by importance
    importance_data.sort(key=lambda x: x['importance'], reverse=True)
    
    return importance_data[:20] # Return top 20 features

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