# ml-service/src/services/enhanced_feature_engineering.py
# UPDATED: Now uses unified feature engineering to eliminate training-serving skew

# ✅ TRAINING-SERVING SKEW ELIMINATED ✅
# ═══════════════════════════════════════════════════════════════════════
# This file now imports from the unified feature engineering module,
# ensuring IDENTICAL feature generation logic between training and inference.
# 
# No more manual synchronization required - unified logic guarantees consistency.
# Updated: [CURRENT DATE]
# ═══════════════════════════════════════════════════════════════════════

from .unified_feature_engineering import DatabaseFeatureEngineer as UnifiedDatabaseFeatureEngineer
from .unified_feature_engineering import UnifiedFeatureEngineer
from ..utils.logger import setup_logger

logger = setup_logger(__name__)

# Export the unified implementation as the main interface
class DatabaseFeatureEngineer(UnifiedDatabaseFeatureEngineer):
    """
    Enhanced FeatureEngineer that fetches data directly from database.
    BLACK BOX: Internal feature engineering logic hidden from external APIs.
    
    ✅ TRAINING-SERVING SKEW ELIMINATED: Now uses unified feature engineering
    logic that guarantees consistency between training and inference.
    """
    
    def __init__(self, processed_data_path: str):
        """
        Initialize with processed data path for static global features.
        
        Args:
            processed_data_path: Path to processed CSV files for global features
        """
        super().__init__(processed_data_path)
        logger.info("DatabaseFeatureEngineer initialized with unified feature engineering - skew eliminated")


# Legacy compatibility for any existing imports
class FeatureEngineer(UnifiedFeatureEngineer):
    """
    Legacy FeatureEngineer updated to use unified feature engineering.
    Maintains API compatibility while eliminating training-serving skew.
    """
    
    def __init__(self, processed_data_path: str):
        """Initialize with processed data for backward compatibility."""
        super().__init__(processed_data_path)
        logger.info("Legacy FeatureEngineer initialized with unified feature engineering")

    def generate_features_for_user(self, user_id: str, order_history=None):
        """
        Legacy method: generate features from provided order history or database.
        Now uses unified feature engineering logic.
        """
        if order_history:
            return self.extract_features(user_id, order_history)
        else:
            return self.generate_features_from_database(user_id)


# Export the main classes for external use
__all__ = ['DatabaseFeatureEngineer', 'FeatureEngineer']