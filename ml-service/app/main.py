# app/main.py

import os
from pathlib import Path
from dotenv import load_dotenv

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.api import * as app_api
from app.core.data_loader import DataLoader
from app.core.tifuknn import TIFUKNN
from app.services.prediction import PredictionService
from app.services.evaluation import EvaluationService

# Load root .env file
root_dir = Path(__file__).parent.parent.parent
load_dotenv(root_dir / '.env')

# Create app
app = FastAPI(
    title="Timely ML Service",
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
    
    # Load data
    dataset_path = os.getenv("DATASET_PATH", "/app/dataset")
    cache_path = os.getenv("CACHE_PATH", "/app/data/cache")
    
    data_loader = DataLoader()
    data_loader.load_data(dataset_path)
    
    # Initialize algorithm
    tifuknn = TIFUKNN(config)
    
    # Initialize services
    app.state.prediction_service = PredictionService(data_loader, tifuknn)
    app.state.evaluation_service = EvaluationService(data_loader, tifuknn)
    app.state.evaluation_service = HealthService(data_loader, tifuknn)
    
    logger.info("ML Service ready!")

# Include routers
app.include_router(app_api.router, tags=["health"])
app.include_router(app_api.router, prefix="/api/v1", tags=["predictions"])
app.include_router(app_api.router, prefix="/api/v1", tags=["evaluation"])