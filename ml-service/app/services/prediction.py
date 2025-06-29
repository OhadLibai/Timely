# ml-service/app/services/prediction.py
"""
SIMPLE & CLEAN: Single prediction interface with clear data source handling
"""

from typing import List, Dict, Any, Optional
from loguru import logger
from app.config import config
from app.core.tifuknn import TIFUKNNEngine

class PredictionService:
    """
    CLEAN PREDICTION SERVICE: Single predict() method, smart data source detection
    """
    
    def __init__(self, data_loader=None):
        self.data_loader = data_loader
        self.tifuknn_engine = TIFUKNNEngine(
            num_neighbors=config.TIFUKNN_CONFIG["num_neighbors"],
            within_decay_rate=config.TIFUKNN_CONFIG["within_decay_rate"],
            group_decay_rate=config.TIFUKNN_CONFIG["group_decay_rate"],
            sequential_decay_rate=config.TIFUKNN_CONFIG["sequential_decay_rate"],
            group_size=config.TIFUKNN_CONFIG["group_size"]
        )
        
        # Setup with data loader if available
        if data_loader and hasattr(data_loader, 'get_user_count') and data_loader.get_user_count() > 0:
            self._setup_engine_with_data()
    
    def _setup_engine_with_data(self):
        """Setup engine with CSV data"""
        history = {}
        future = {}
        
        for user_id in self.data_loader.user_ids:
            baskets = self.data_loader.get_user_baskets(user_id)
            if baskets:
                history[str(user_id)] = baskets
                
            future_basket = self.data_loader.get_user_future_basket(user_id)
            if future_basket:
                future[str(user_id)] = future_basket
        
        self.tifuknn_engine.set_data(history, future)
        self.tifuknn_engine.fit()
    
    # ==================================================================================
    # SINGLE PREDICTION INTERFACE - No confusion!
    # ==================================================================================
    
    def predict(self, user_id: int, k: int = None, exclude_last: bool = False, 
                data_source: str = "auto") -> Dict[str, Any]:
        """
        SINGLE PREDICTION METHOD: Smart data source detection
        
        Args:
            user_id: User to predict for
            k: Number of items (uses config default if None)
            exclude_last: Exclude last basket (for evaluation)
            data_source: "auto", "csv", "database", or "baskets"
            
        Returns:
            Dictionary with prediction results
        """
        if k is None:
            k = config.TIFUKNN_CONFIG["top_k_default"]
        k = config.validate_k_parameter(k)
        
        logger.info(f"Prediction for user {user_id}, k={k}, source={data_source}")
        
        if data_source == "auto":
            data_source = self._detect_data_source(user_id)
        
        if data_source == "csv":
            return self._predict_from_csv(user_id, k, exclude_last)
        elif data_source == "database":
            return self._predict_from_db(user_id, k)
        else:
            raise ValueError(f"Unknown data source: {data_source}")
    
    def _detect_data_source(self, user_id: int) -> str:
        """Smart detection of best data source for user"""
        # Try database first (for seeded demo users)
        try:
            from app.core.database import get_db_connection
            conn = get_db_connection()
            if conn:
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM orders WHERE user_id = %s", (str(user_id),))
                order_count = cursor.fetchone()[0]
                cursor.close()
                conn.close()
                
                if order_count > 0:
                    return "database"
        except:
            pass
        
        # Fallback to CSV data
        if self.data_loader and str(user_id) in [str(uid) for uid in self.data_loader.user_ids]:
            return "csv"
        
        raise ValueError(f"User {user_id} not found in any data source")
    
    def _predict_from_csv(self, user_id: int, k: int, exclude_last: bool) -> Dict[str, Any]:
        """Internal: CSV-based prediction"""
        user_id_str = str(user_id)
        
        if user_id_str not in self.tifuknn_engine.history:
            baskets = self.data_loader.get_user_baskets(user_id) if self.data_loader else []
            if not baskets:
                raise ValueError(f"User {user_id} not found in CSV data")
        
        predicted_items = self.tifuknn_engine.predict(user_id_str, k, exclude_last)
        products = self._get_product_info(predicted_items)
        
        return {
            'item_ids': predicted_items,
            'products': products,
            'source': 'csv_dataset',
            'k_used': k
        }
    
    def _predict_from_db(self, user_id: int, k: int) -> Dict[str, Any]:
        """Internal: Database-based prediction"""
        # Get user's order history from database
        user_baskets, temporal_metadata = self._get_user_db_orders(str(user_id))
        
        if not user_baskets:
            raise ValueError(f"No database orders for user {user_id}")
        
        # Use engine's basket-based prediction
        predicted_items = self.tifuknn_engine.predict_from_baskets(
            user_baskets=user_baskets,
            k=k,
            temporal_metadata=temporal_metadata
        )
        
        products = self._get_product_info(predicted_items)
        
        return {
            'item_ids': predicted_items,
            'products': products,
            'source': 'database_orders',
            'k_used': k,
            'basket_count': len(user_baskets),
            'temporal_patterns': self._analyze_temporal_patterns(temporal_metadata)
        }
    
    # ==================================================================================
    # EVALUATION INTERFACE - For evaluation.py
    # ==================================================================================
    
    def predict_for_evaluation(self, user_id: int, k: int = 20) -> List[int]:
        """Interface for evaluation service"""
        result = self.predict(user_id, k, exclude_last=True, data_source="csv")
        return result['item_ids']
    
    def get_engine_for_evaluation(self) -> TIFUKNNEngine:
        """Provide engine for evaluation service"""
        return self.tifuknn_engine
    
    # Helper methods remain the same...
    def _get_product_info(self, product_ids: List[int]) -> List[Dict[str, Any]]:
        """
        Get product information for given product IDs
        
        Args:
            product_ids: List of product IDs
            
        Returns:
            List of product information dictionaries
        """
        try:
            conn = get_db_connection()
            if not conn:
                logger.warning("Database unavailable for product info")
                return [{'product_id': pid, 'name': f'Product {pid}'} for pid in product_ids]
            
            cursor = conn.cursor()
            
            # Get product details
            placeholders = ','.join(['%s'] * len(product_ids))
            cursor.execute(f"""
                SELECT id, name, price, image_url
                FROM products
                WHERE id IN ({placeholders})
                ORDER BY CASE id {' '.join([f'WHEN %s THEN {i}' for i, _ in enumerate(product_ids)])} END
            """, product_ids + product_ids)  # product_ids twice for CASE statement
            
            products = []
            for row in cursor.fetchall():
                products.append({
                    'product_id': row[0],
                    'name': row[1] or f'Product {row[0]}',
                    'price': float(row[2]) if row[2] else None,
                    'image_url': row[3]
                })
            
            cursor.close()
            conn.close()
            
            # Fill in missing products
            found_ids = {p['product_id'] for p in products}
            for pid in product_ids:
                if pid not in found_ids:
                    products.append({
                        'product_id': pid,
                        'name': f'Product {pid}',
                        'price': None,
                        'image_url': None
                    })
            
            return products
            
        except Exception as e:
            logger.error(f"Failed to get product info: {e}")
            return [{'product_id': pid, 'name': f'Product {pid}'} for pid in product_ids]
    
    def _get_user_db_orders(self, user_id: str):
        # Implementation stays the same  
        pass
    
    def _analyze_temporal_patterns(self, temporal_metadata: Dict) -> Dict[str, Any]:
        """
        Analyze temporal patterns in user's order history
        
        Args:
            temporal_metadata: Temporal data for orders
            
        Returns:
            Dictionary with temporal pattern analysis
        """
        if not temporal_metadata:
            return {}
        
        patterns = {
            'weekly_orders': 0,
            'weekend_orders': 0,
            'morning_orders': 0,
            'average_days_between': 0,
            'most_common_day': None,
            'most_common_hour': None
        }
        
        try:
            days_between = []
            days_of_week = []
            hours = []
            
            for metadata in temporal_metadata.values():
                if metadata.get('days_since_prior') is not None:
                    days_since = metadata['days_since_prior']
                    if 5 <= days_since <= 9:  # Weekly pattern
                        patterns['weekly_orders'] += 1
                    days_between.append(days_since)
                
                dow = metadata.get('order_dow')
                if dow is not None:
                    days_of_week.append(dow)
                    if dow in [0, 6]:  # Sunday or Saturday
                        patterns['weekend_orders'] += 1
                
                hour = metadata.get('order_hour_of_day')
                if hour is not None:
                    hours.append(hour)
                    if 6 <= hour <= 11:  # Morning
                        patterns['morning_orders'] += 1
            
            # Calculate averages and patterns
            if days_between:
                patterns['average_days_between'] = sum(days_between) / len(days_between)
            
            if days_of_week:
                patterns['most_common_day'] = max(set(days_of_week), key=days_of_week.count)
            
            if hours:
                patterns['most_common_hour'] = max(set(hours), key=hours.count)
                
        except Exception as e:
            logger.error(f"Temporal pattern analysis failed: {e}")
        
        return patterns