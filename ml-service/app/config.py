
# ml-service/app/config.py
"""
ENHANCED CONFIGURATION: Configurable K parameter and complete TIFU-KNN settings
"""

import os
from typing import Optional, Dict, Any
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
root_dir = Path(__file__).parent.parent.parent
load_dotenv(root_dir / '.env')

class Config:
    """Enhanced configuration class for ML service with configurable K parameters"""
    
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # Database Configuration
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/timely")
    
    # Data and Dataset Configurations  
    DATASET_PATH: str = os.getenv("DATASET_PATH", "/app/dataset")
    DATA_PATH: str = os.getenv("DATA_PATH", "/app/data")
    
    # ENHANCED ML Model Configuration with Configurable K
    TIFUKNN_CONFIG = {
        # Core algorithm parameters (matching reference implementation)
        "num_neighbors": int(os.getenv("TIFUKNN_NEIGHBORS", "900")),
        "within_decay_rate": float(os.getenv("TIFUKNN_WITHIN_DECAY", "0.9")),  # α
        "group_decay_rate": float(os.getenv("TIFUKNN_GROUP_DECAY", "0.7")),    # β
        "sequential_decay_rate": float(os.getenv("TIFUKNN_SEQUENTIAL_DECAY", "0.9")),  # γ
        "group_size": int(os.getenv("TIFUKNN_GROUP_SIZE", "3")),
        
        # CONFIGURABLE K PARAMETERS - Admin can tune these
        "top_k_default": int(os.getenv("TIFUKNN_TOP_K_DEFAULT", "20")),
        "top_k_min": int(os.getenv("TIFUKNN_TOP_K_MIN", "5")),
        "top_k_max": int(os.getenv("TIFUKNN_TOP_K_MAX", "50")),
        
        # K values for different evaluation contexts
        "evaluation_k_values": [
            int(k) for k in os.getenv("TIFUKNN_EVAL_K_VALUES", "5,10,20,50").split(",")
        ],
        
        # Context-specific K defaults
        "k_precision_focused": int(os.getenv("TIFUKNN_K_PRECISION", "10")),  # Higher precision
        "k_recall_focused": int(os.getenv("TIFUKNN_K_RECALL", "50")),        # Higher recall
        "k_balanced": int(os.getenv("TIFUKNN_K_BALANCED", "20")),            # Standard NBR
        "k_quick_eval": int(os.getenv("TIFUKNN_K_QUICK", "5")),              # Fast evaluation
        
        # Enhanced algorithm options
        "frequency_group_method": os.getenv("TIFUKNN_FREQ_METHOD", "equal_division"),  # kmeans, quantile
        "enable_stratified_eval": os.getenv("TIFUKNN_STRATIFIED_EVAL", "true").lower() == "true",
        "enable_temporal_patterns": os.getenv("TIFUKNN_TEMPORAL_PATTERNS", "true").lower() == "true",
        
        # Performance tuning
        "max_users_for_fitting": int(os.getenv("TIFUKNN_MAX_USERS", "0")) or None,  # 0 = all users
        "cache_user_profiles": os.getenv("TIFUKNN_CACHE_PROFILES", "true").lower() == "true"
    }
    
    # Evaluation Configuration with Different K Contexts
    EVALUATION_CONFIG = {
        "random_seed": int(os.getenv("EVALUATION_RANDOM_SEED", "42")),
        "default_sample_size": int(os.getenv("EVALUATION_SAMPLE_SIZE", "1000")) if os.getenv("EVALUATION_SAMPLE_SIZE") else None,
        
        # Context-specific evaluation settings
        "contexts": {
            "overall_performance": {
                "k": int(os.getenv("EVAL_K_OVERALL", "20")),
                "description": "Standard NBR evaluation"
            },
            "precision_focused": {
                "k": int(os.getenv("EVAL_K_PRECISION", "10")),
                "description": "High precision, conservative recommendations"
            },
            "recall_focused": {
                "k": int(os.getenv("EVAL_K_RECALL", "50")),
                "description": "High recall, comprehensive recommendations"
            },
            "quick_assessment": {
                "k": int(os.getenv("EVAL_K_QUICK", "5")),
                "description": "Fast evaluation for development"
            }
        },
        
        # Metrics to calculate
        "metrics": [
            "recall", "precision", "f1", "hit_rate", 
            "repeat_recall", "explore_recall", "ndcg", "mrr"
        ]
    }
    
    # Model File Paths (for pre-fitted models)
    MODEL_CONFIG = {
        "models_dir": os.getenv("MODELS_DIR", "/app/data/models"),
        "fitted_model_file": os.getenv("FITTED_MODEL_FILE", "tifuknn_fitted_model.pkl"),
        "use_pre_fitted": os.getenv("USE_PRE_FITTED_MODEL", "false").lower() == "true",
        "auto_fit_on_startup": os.getenv("AUTO_FIT_ON_STARTUP", "true").lower() == "true"
    }
    
    # API Configuration
    API_CONFIG = {
        "max_prediction_k": int(os.getenv("API_MAX_K", "100")),
        "default_prediction_k": int(os.getenv("API_DEFAULT_K", "20")),
        "enable_csv_predictions": os.getenv("API_ENABLE_CSV_PRED", "true").lower() == "true",
        "enable_db_predictions": os.getenv("API_ENABLE_DB_PRED", "true").lower() == "true"
    }

    @classmethod
    def get_k_for_context(cls, context: str) -> int:
        """
        Get K parameter for specific context
        
        Args:
            context: Evaluation context ('precision', 'recall', 'balanced', 'quick')
            
        Returns:
            Appropriate K value for the context
        """
        context_mapping = {
            'precision': cls.TIFUKNN_CONFIG["k_precision_focused"],
            'recall': cls.TIFUKNN_CONFIG["k_recall_focused"], 
            'balanced': cls.TIFUKNN_CONFIG["k_balanced"],
            'quick': cls.TIFUKNN_CONFIG["k_quick_eval"],
            'default': cls.TIFUKNN_CONFIG["top_k_default"]
        }
        
        return context_mapping.get(context, cls.TIFUKNN_CONFIG["top_k_default"])
    
    @classmethod
    def validate_k_parameter(cls, k: int) -> int:
        """
        Validate and clamp K parameter within allowed range
        
        Args:
            k: Requested K value
            
        Returns:
            Valid K value within min/max bounds
        """
        min_k = cls.TIFUKNN_CONFIG["top_k_min"]
        max_k = cls.TIFUKNN_CONFIG["top_k_max"]
        
        return max(min_k, min(k, max_k))
    
    @classmethod
    def get_evaluation_k_values(cls) -> list[int]:
        """
        Get all K values to use for comprehensive evaluation
        
        Returns:
            List of K values for multi-K evaluation
        """
        return cls.TIFUKNN_CONFIG["evaluation_k_values"]
    
    @classmethod
    def get_model_parameters_summary(cls) -> Dict[str, Any]:
        """
        Get summary of all model parameters for logging/debugging
        
        Returns:
            Dictionary with key model parameters
        """
        return {
            "algorithm": "TIFU-KNN",
            "neighbors": cls.TIFUKNN_CONFIG["num_neighbors"],
            "within_decay": cls.TIFUKNN_CONFIG["within_decay_rate"],
            "group_decay": cls.TIFUKNN_CONFIG["group_decay_rate"],
            "sequential_decay": cls.TIFUKNN_CONFIG["sequential_decay_rate"],
            "group_size": cls.TIFUKNN_CONFIG["group_size"],
            "k_default": cls.TIFUKNN_CONFIG["top_k_default"],
            "k_range": f"{cls.TIFUKNN_CONFIG['top_k_min']}-{cls.TIFUKNN_CONFIG['top_k_max']}",
            "evaluation_k_values": cls.TIFUKNN_CONFIG["evaluation_k_values"]
        }

# Global config instance
config = Config()