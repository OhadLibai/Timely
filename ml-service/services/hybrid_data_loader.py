# ml-service/services/hybrid_data_loader.py
"""
Hybrid data loader that uses database for seeded users, CSV for evaluation
"""
from typing import Dict, List, Optional
from loguru import logger
from .database_bridge import DatabaseBridge

class HybridDataLoader:
    def __init__(self, csv_data_loader, database_bridge):
        self.csv_loader = csv_data_loader
        self.db_bridge = database_bridge
        self.user_cache = {}
        
    def get_user_baskets(self, user_id: int, source: str = "auto") -> List[List[int]]:
        """
        Get user baskets from database if seeded, otherwise from CSV
        
        Args:
            user_id: Instacart user ID or internal UUID
            source: "db", "csv", or "auto"
        """
        if source == "auto":
            # Check if this is a seeded user in database
            db_baskets = self._try_get_from_db(user_id)
            if db_baskets is not None:
                logger.info(f"Using database data for user {user_id}")
                return db_baskets
                
        if source == "db":
            return self._try_get_from_db(user_id) or []
            
        # Fall back to CSV
        return self.csv_loader.get_user_baskets(user_id)
        
    def _try_get_from_db(self, user_id) -> Optional[List[List[int]]]:
        """Try to get user data from database"""
        try:
            if isinstance(user_id, str):  # Internal UUID
                return self.db_bridge.get_user_order_history_from_db(user_id)
            else:  # Instacart ID - need to find internal user
                # This would require reverse lookup - for now return None
                return None
        except Exception as e:
            logger.error(f"Error getting DB data for {user_id}: {e}")
            return None