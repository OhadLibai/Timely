# app/main.py

import os
from pathlib import Path
from dotenv import load_dotenv

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

# Fixed imports - proper Python syntax
from app.api.health_api import router as health_router
from app.api.prediction_api import router as prediction_router
from app.api.evaluation_api import router as evaluation_router

from app.core.data_loader import DataLoader
from app.core.tifuknn import TIFUKNNComplete  # Fixed class name
from app.services.prediction import PredictionService
from app.services.evaluation import EvaluationService
from app.config import config  # Added missing import

# Load root .env file
root_dir = Path(__file__).parent.parent.parent
load_dotenv(root_dir / '.env')

# Create app
app = FastAPI(
    title="Timely ML Service",
    version="1.0.0",
    description="Machine Learning service for next basket prediction using TIFU-KNN"
)

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# Initialize services on startup
@app.on_event("startup")
async def startup_event():
    logger.info("Initializing ML Service...")
    
    try:
        # Load data
        dataset_path = config.DATASET_PATH
        data_path = config.DATA_PATH
        
        # Initialize data loader
        data_loader = DataLoader()
        
        # Load Instacart data (fixed method name)
        if os.path.exists(dataset_path):
            data_loader.load_instacart_data(dataset_path, preprocess=True)
            logger.info(f"Data loaded: {data_loader.get_user_count()} users")
        else:
            logger.warning(f"Dataset path not found: {dataset_path}")
        
        # Initialize TIFU-KNN algorithm (fixed class name)
        tifuknn = TIFUKNNComplete()
        
        # Initialize services (fixed - removed invalid HealthService)
        app.state.prediction_service = PredictionService(data_loader, tifuknn)
        app.state.evaluation_service = EvaluationService(data_loader, tifuknn)
        app.state.data_loader = data_loader  # Store for health checks
        
        logger.info("ML Service ready!")
        
    except Exception as e:
        logger.error(f"Failed to initialize ML Service: {e}")
        raise

# Include routers (fixed - separate router variables)
app.include_router(health_router, prefix="/health", tags=["health"])
app.include_router(prediction_router, prefix="/api/v1/predictions", tags=["predictions"])
app.include_router(evaluation_router, prefix="/api/v1/evaluation", tags=["evaluation"])

# Root endpoint
@app.get("/")
async def root():
    return {
        "service": "Timely ML Service",
        "status": "running",
        "version": "1.0.0",
        "docs": "/docs"
    }