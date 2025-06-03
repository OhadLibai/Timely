# ml-service/src/api/main.py
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from datetime import datetime
import os
import asyncio

from ..models.lightgbm_model import LightGBMModel
from ..preprocessing.feature_engineering import FeatureEngineer
from ..database.connection import get_db, engine
from ..database.models import Base
from ..services.prediction_service import PredictionService
from ..services.metrics_service import MetricsService
from ..api.routes import predictions, metrics, training
from ..utils.redis_client import redis_client
from ..utils.logger import setup_logger

# Setup logger
logger = setup_logger(__name__)

# Global model instance
model_instance = None
feature_engineer = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    logger.info("Starting ML Service...")
    
    try:
        # Create database tables
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created/verified")
        
        # Connect to Redis
        await redis_client.connect()
        logger.info("Connected to Redis")
        
        # Load model
        global model_instance, feature_engineer
        model_path = os.getenv("MODEL_PATH", "/app/models")
        
        # Initialize feature engineer
        feature_engineer = FeatureEngineer()
        
        # Load or train model
        model_instance = LightGBMModel()
        try:
            model_instance.load_model(os.path.join(model_path, "lightgbm_model.pkl"))
            logger.info("Model loaded successfully")
        except FileNotFoundError:
            logger.warning("No saved model found. Please train the model first.")
            # Model will be trained via the training endpoint
        
        # Store model in app state
        app.state.model = model_instance
        app.state.feature_engineer = feature_engineer
        
    except Exception as e:
        logger.error(f"Error during startup: {str(e)}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down ML Service...")
    await redis_client.close()
    logger.info("Disconnected from Redis")

# Create FastAPI app
app = FastAPI(
    title="Timely ML Service",
    description="Machine Learning service for next basket prediction",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(predictions.router, prefix="/api/predictions", tags=["predictions"])
app.include_router(metrics.router, prefix="/api/metrics", tags=["metrics"])
app.include_router(training.router, prefix="/api/training", tags=["training"])

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Timely ML Service",
        "status": "running",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check Redis connection
        await redis_client.ping()
        
        # Check model status
        model_loaded = app.state.model is not None and app.state.model.model is not None
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "services": {
                "redis": "connected",
                "model": "loaded" if model_loaded else "not loaded",
                "database": "connected"
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=503, detail="Service unavailable")

@app.get("/api/model/info")
async def model_info():
    """Get model information"""
    if not app.state.model or not app.state.model.model:
        return {
            "status": "no model loaded",
            "message": "Please train a model first"
        }
    
    return {
        "model_type": "LightGBM",
        "n_features": app.state.model.model.n_features_,
        "n_estimators": app.state.model.model.n_estimators,
        "feature_importance": dict(zip(
            app.state.model.feature_names,
            app.state.model.model.feature_importances_.tolist()
        )) if hasattr(app.state.model, 'feature_names') else None,
        "last_training": app.state.model.last_training_time if hasattr(app.state.model, 'last_training_time') else None
    }

@app.post("/api/predict/next-basket")
async def predict_next_basket(
    user_id: str,
    n_recommendations: int = 20,
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Predict next basket for a user"""
    try:
        if not app.state.model or not app.state.model.model:
            raise HTTPException(status_code=503, detail="Model not available")
        
        # Get prediction service
        prediction_service = PredictionService(app.state.model, app.state.feature_engineer)
        
        # Generate predictions
        predictions = await prediction_service.predict_next_basket(
            user_id=user_id,
            n_recommendations=n_recommendations
        )
        
        # Log prediction in background
        background_tasks.add_task(
            prediction_service.log_prediction,
            user_id=user_id,
            predictions=predictions
        )
        
        return {
            "user_id": user_id,
            "predictions": predictions,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Prediction error for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/metrics/model-performance")
async def get_model_performance():
    """Get model performance metrics"""
    try:
        metrics_service = MetricsService()
        metrics = await metrics_service.get_model_metrics()
        
        return {
            "metrics": metrics,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error fetching metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/metrics/online")
async def get_online_metrics():
    """Get online performance metrics"""
    try:
        metrics_service = MetricsService()
        metrics = await metrics_service.get_online_metrics()
        
        return {
            "metrics": metrics,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error fetching online metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return {
        "error": "Not found",
        "message": "The requested resource was not found",
        "path": request.url.path
    }

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    logger.error(f"Internal server error: {exc}")
    return {
        "error": "Internal server error",
        "message": "An unexpected error occurred"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)