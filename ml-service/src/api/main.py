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
from ..models.lightgbm_enhanced import EnhancedLightGBMModel # Use Enhanced for demo if it has predict_basket
from ..models.lightgbm_model import LightGBMModel # Fallback or if you use this one primarily
from ..preprocessing.feature_engineering import FeatureEngineer
from ..database.connection import get_db, engine # get_db might not be used if using SQLAlchemy engine directly
from ..database.models import Base # For table creation
from ..services.prediction_service import PredictionService # Your main prediction service
from ..services.metrics_service import MetricsService
from ..api.routes import predictions, metrics, training # Assuming these are your existing routers
from ..utils.redis_client import redis_client
from ..utils.logger import setup_logger


# Setup logger
logger = setup_logger(__name__)

# Global model instance and other shared resources
# These will be initialized in the lifespan manager
# app_state = {} # Using app.state instead

PROCESSED_DATA_PATH = os.getenv("PROCESSED_DATA_PATH", "/app/data/processed")
INSTACART_DATA_PATH = os.getenv("RAW_DATA_PATH", "/app/data") # For raw Instacart files

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    logger.info("Starting ML Service...")
    
    try:
        Base.metadata.create_all(bind=engine) # Create DB tables if not exist
        logger.info("Database tables created/verified (if models are defined in database.models)")
        
        await redis_client.connect()
        logger.info("Connected to Redis")
        
        model_path_base = os.getenv("MODEL_PATH", "/app/models")
        model_filename = "enhanced_lightgbm_model.pkl" # Prefer enhanced model
        model_full_path = os.path.join(model_path_base, model_filename)

        # Initialize feature engineer
        app.state.feature_engineer = FeatureEngineer() # If still used by PredictionService

        # Load ML model
        # Prioritize EnhancedLightGBMModel if available and used for predictions
        current_model = EnhancedLightGBMModel() 
        try:
            current_model.load_model(model_full_path)
            logger.info(f"Successfully loaded: {model_filename}")
        except FileNotFoundError:
            logger.warning(f"{model_filename} not found at {model_full_path}. Trying lightgbm_model.pkl...")
            current_model = LightGBMModel() # Fallback to basic model
            model_filename = "lightgbm_model.pkl"
            model_full_path = os.path.join(model_path_base, model_filename)
            try:
                current_model.load_model(model_full_path)
                logger.info(f"Successfully loaded: {model_filename}")
            except FileNotFoundError:
                logger.error(f"No model file found at {model_path_base}. Predictions will fail.")
                logger.warning("Please train the model first using the training script.")
                current_model = None # No model loaded
        except Exception as e:
            logger.error(f"Error loading model from {model_full_path}: {e}", exc_info=True)
            current_model = None
            
        app.state.model = current_model
        
        # Initialize PredictionService
        if app.state.model and app.state.feature_engineer:
            app.state.prediction_service = PredictionService(app.state.model, app.state.feature_engineer)
            logger.info("PredictionService initialized.")
        else:
            app.state.prediction_service = None
            logger.warning("PredictionService could not be initialized due to missing model or feature engineer.")

        # Load features_df for demo/prediction purposes if EnhancedLightGBMModel expects it
        if isinstance(app.state.model, EnhancedLightGBMModel):
            try:
                features_csv_path = os.path.join(PROCESSED_DATA_PATH, "features.csv")
                app.state.features_df = pd.read_csv(features_csv_path)
                logger.info(f"Global features_df loaded from {features_csv_path} for EnhancedLightGBMModel. Shape: {app.state.features_df.shape}")
            except FileNotFoundError:
                logger.error(f"features.csv not found at {features_csv_path}. Some model predictions might fail or be inaccurate.")
                app.state.features_df = None
            except Exception as e:
                logger.error(f"Error loading global features_df: {e}", exc_info=True)
                app.state.features_df = None
        else:
            app.state.features_df = None # Not needed for the basic LightGBMModel in this way

    except Exception as e:
        logger.error(f"Critical error during ML Service startup: {e}", exc_info=True)
        # Optionally, re-raise to prevent service from starting in a bad state
        # raise
    
    yield # Service runs here
    
    logger.info("Shutting down ML Service...")
    if hasattr(redis_client, 'close'): # Ensure redis_client has close method
         await redis_client.close()
         logger.info("Disconnected from Redis")
    else: # Fallback for older redis versions or different client interface
        await redis_client.disconnect()
        logger.info("Disconnected from Redis (using disconnect).")


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

@app.get("/health")
async def health_check():
    # ... (keep existing health_check logic)
    try:
        await redis_client.ping()
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
                "redis": "connected",
                "model": model_status,
                "database": "connected (assumed, check via engine ping if needed)"
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=503, detail="Service unavailable")


# ... (other existing endpoints like /api/model/info, error handlers) ...
# Ensure predict_next_basket in the main PredictionService uses the loaded app.state.model
# and app.state.features_df if necessary.

if __name__ == "__main__":
    import uvicorn
    # For Uvicorn, env vars are typically set before Uvicorn starts, or via --env-file if supported
    # Or rely on them being set in the Docker environment
    logger.info(f"PROCESSED_DATA_PATH for Uvicorn: {PROCESSED_DATA_PATH}")
    logger.info(f"RAW_DATA_PATH for Uvicorn: {INSTACART_DATA_PATH}")
    uvicorn.run(app, host="0.0.0.0", port=8000)