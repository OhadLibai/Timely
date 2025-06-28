
# ml-service/app/config.py
"""
Configuration settings for ML service
"""

import os
from typing import Optional
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
root_dir = Path(__file__).parent.parent.parent
load_dotenv(root_dir / '.env')

class Config:
    """Configuration class for ML service"""
    
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # Database Configuration
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/timely")
    
    # Data and Dataset Configurations  
    DATASET_PATH: str = os.getenv("DATASET_PATH", "/app/dataset")
    DATA_PATH: str = os.getenv("DATA_PATH", "/app/data")
    
    # ML Model Configuration
    TIFUKNN_CONFIG = {
        "num_neighbors": int(os.getenv("TIFUKNN_NEIGHBORS", "900")),
        "within_decay_rate": float(os.getenv("TIFUKNN_WITHIN_DECAY", "0.9")),
        "group_decay_rate": float(os.getenv("TIFUKNN_GROUP_DECAY", "0.7")),
        "sequential_decay_rate": float(os.getenv("TIFUKNN_SEQUENTIAL_DECAY", "0.9")),
        "group_size": int(os.getenv("TIFUKNN_GROUP_SIZE", "3")),
        "top_k": int(os.getenv("TIFUKNN_TOP_K", "20")),
        # Enhanced options
        "frequency_group_method": os.getenv("TIFUKNN_FREQ_METHOD", "equal_division"),  # kmeans, quantile
        "enable_stratified_eval": os.getenv("TIFUKNN_STRATIFIED_EVAL", "true").lower() == "true"
    }
    
    # Evaluation Configuration
    EVALUATION_RANDOM_SEED: int = int(os.getenv("EVALUATION_RANDOM_SEED", "42"))
    EVALUATION_SAMPLE_SIZE: Optional[int] = None
    if os.getenv("EVALUATION_SAMPLE_SIZE"):
        EVALUATION_SAMPLE_SIZE = int(os.getenv("EVALUATION_SAMPLE_SIZE"))


# Global config instance
config = Config()