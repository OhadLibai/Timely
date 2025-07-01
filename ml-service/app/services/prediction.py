# ml-service/app/services/prediction.py
"""
FIXED: Complete prediction service with all required methods
"""

from typing import List, Dict, Any, Optional
from loguru import logger
from app.config import config
from app.core.tifuknn import TIFUKNNEngine
from app.core.database import get_db_connection

class PredictionService:
    """CLEAN: Single prediction interface"""
    
    def __init__(self, data_loader=None):
        self.data_loader = data_loader
        self.tifuknn_engine = TIFUKNNEngine(
            num_neighbors=config.TIFUKNN_CONFIG["num_neighbors"],
            within_decay_rate=config.TIFUKNN_CONFIG["within_decay_rate"],
            group_decay_rate=config.TIFUKNN_CONFIG["group_decay_rate"],
            sequential_decay_rate=config.TIFUKNN_CONFIG["sequential_decay_rate"],
            group_size=config.TIFUKNN_CONFIG["group_size"]
        )
        
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
    # SINGLE PREDICTION INTERFACE
    # ==================================================================================
    
    def predict(self, user_id: int, k: int = None, exclude_last: bool = False, 
                data_source: str = "auto") -> Dict[str, Any]:
        """SINGLE PREDICTION METHOD with smart data source detection"""
        
        if k is None:
            k = config.TIFUKNN_CONFIG["top_k_default"]
        k = config.validate_k_parameter(k)
        
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
        user_baskets, temporal_metadata = self._get_user_db_orders(str(user_id))
        
        if not user_baskets:
            raise ValueError(f"No database orders for user {user_id}")
        
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
    # FIXED: All the missing methods that were referenced but not implemented
    # ==================================================================================
    
    def _get_user_db_orders(self, user_id: str) -> tuple[List[List[int]], Dict]:
        """
        FIXED: Get user's order history from database
        
        Returns:
            Tuple of (user_baskets, temporal_metadata)
        """
        try:
            conn = get_db_connection()
            if not conn:
                raise ValueError("Database connection unavailable")
            
            cursor = conn.cursor()
            
            # Get orders with temporal features
            cursor.execute("""
                SELECT o.id, o.created_at, o.days_since_prior_order, 
                       o.order_dow, o.order_hour_of_day,
                       array_agg(oi.product_id ORDER BY oi.add_to_cart_order) as products
                FROM orders o
                JOIN order_items oi ON o.id = oi.order_id
                WHERE o.user_id = %s
                GROUP BY o.id, o.created_at, o.days_since_prior_order, o.order_dow, o.order_hour_of_day
                ORDER BY o.created_at
            """, (user_id,))
            
            orders = cursor.fetchall()
            cursor.close()
            conn.close()
            
            if not orders:
                return [], {}
            
            # Build basket history and temporal metadata
            user_baskets = []
            temporal_metadata = {}
            
            for order in orders:
                order_id, created_at, days_since_prior, order_dow, order_hour, products = order
                
                # Clean and convert products
                basket = [int(p) for p in products if p is not None]
                if basket:
                    user_baskets.append(basket)
                    
                    # Build temporal metadata
                    temporal_metadata[str(order_id)] = {
                        'days_since_prior': days_since_prior,
                        'order_dow': order_dow,
                        'order_hour_of_day': order_hour,
                        'created_at': created_at.isoformat() if created_at else None
                    }
            
            return user_baskets, temporal_metadata
            
        except Exception as e:
            logger.error(f"Failed to get user database orders: {e}")
            return [], {}
    
    def _analyze_temporal_patterns(self, temporal_metadata: Dict) -> Dict[str, Any]:
        """
        FIXED: Analyze temporal patterns in user's order history
        
        This analyzes ordering patterns like:
        - Weekly shopping (orders every 5-9 days)
        - Weekend shopping preference 
        - Morning vs evening shopping
        - Monthly patterns
        
        Args:
            temporal_metadata: Dict with order temporal data
            
        Returns:
            Dictionary with detected patterns
        """
        if not temporal_metadata:
            return {}
        
        patterns = {
            'weekly_orders': 0,
            'weekend_orders': 0,
            'morning_orders': 0,
            'evening_orders': 0,
            'average_days_between': 0,
            'most_common_day': None,
            'most_common_hour': None,
            'dominant_pattern': 'irregular'
        }
        
        try:
            days_between = []
            days_of_week = []
            hours = []
            
            for metadata in temporal_metadata.values():
                # Days since prior order analysis
                if metadata.get('days_since_prior') is not None:
                    days_since = metadata['days_since_prior']
                    if 5 <= days_since <= 9:  # Weekly pattern
                        patterns['weekly_orders'] += 1
                    days_between.append(days_since)
                
                # Day of week analysis
                dow = metadata.get('order_dow')
                if dow is not None:
                    days_of_week.append(dow)
                    if dow in [0, 6]:  # Sunday=0, Saturday=6
                        patterns['weekend_orders'] += 1
                
                # Hour of day analysis
                hour = metadata.get('order_hour_of_day')
                if hour is not None:
                    hours.append(hour)
                    if 6 <= hour <= 11:  # Morning (6-11 AM)
                        patterns['morning_orders'] += 1
                    elif 17 <= hour <= 21:  # Evening (5-9 PM)
                        patterns['evening_orders'] += 1
            
            # Calculate statistics
            if days_between:
                patterns['average_days_between'] = sum(days_between) / len(days_between)
            
            if days_of_week:
                patterns['most_common_day'] = max(set(days_of_week), key=days_of_week.count)
            
            if hours:
                patterns['most_common_hour'] = max(set(hours), key=hours.count)
            
            # Determine dominant pattern
            total_orders = len(temporal_metadata)
            if patterns['weekly_orders'] / total_orders >= 0.6:
                patterns['dominant_pattern'] = 'weekly'
            elif patterns['weekend_orders'] / total_orders >= 0.7:
                patterns['dominant_pattern'] = 'weekend_shopper'
            elif patterns['morning_orders'] / total_orders >= 0.6:
                patterns['dominant_pattern'] = 'morning_shopper'
            
        except Exception as e:
            logger.error(f"Temporal pattern analysis failed: {e}")
        
        return patterns
    
    def _get_product_info(self, product_ids: List[int]) -> List[Dict[str, Any]]:
        """
        FIXED: Get product information for given product IDs
        
        This method gets product details either from:
        1. Data loader (fast, in-memory) - for ML predictions
        2. Database (consistent, with pricing) - for web app display
        """
        try:
            # First try data loader (faster for ML service)
            if self.data_loader and hasattr(self.data_loader, 'products'):
                products = []
                for pid in product_ids:
                    if pid in self.data_loader.products:
                        product_data = self.data_loader.products[pid]
                        products.append({
                            'product_id': pid,
                            'name': product_data.get('product_name', f'Product {pid}'),
                            'price': product_data.get('price'),  # May be None from CSV
                            'image_url': product_data.get('image_url')
                        })
                    else:
                        products.append({
                            'product_id': pid,
                            'name': f'Product {pid}',
                            'price': None,
                            'image_url': None
                        })
                return products
            
            # Fallback to database lookup
            return self._get_product_info_from_database(product_ids)
            
        except Exception as e:
            logger.error(f"Failed to get product info: {e}")
            # Final fallback
            return [{'product_id': pid, 'name': f'Product {pid}', 'price': None, 'image_url': None} 
                   for pid in product_ids]
    
    def _get_product_info_from_database(self, product_ids: List[int]) -> List[Dict[str, Any]]:
        """Get product information from database"""
        try:
            conn = get_db_connection()
            if not conn:
                return [{'product_id': pid, 'name': f'Product {pid}'} for pid in product_ids]
            
            cursor = conn.cursor()
            
            placeholders = ','.join(['%s'] * len(product_ids))
            cursor.execute(f"""
                SELECT id, name, price, image_url
                FROM products
                WHERE id IN ({placeholders})
            """, product_ids)
            
            products = []
            db_products = {row[0]: row for row in cursor.fetchall()}
            
            for pid in product_ids:
                if pid in db_products:
                    row = db_products[pid]
                    products.append({
                        'product_id': pid,
                        'name': row[1] or f'Product {pid}',
                        'price': float(row[2]) if row[2] else None,
                        'image_url': row[3]
                    })
                else:
                    products.append({
                        'product_id': pid,
                        'name': f'Product {pid}',
                        'price': None,
                        'image_url': None
                    })
            
            cursor.close()
            conn.close()
            return products
            
        except Exception as e:
            logger.error(f"Database product lookup failed: {e}")
            return [{'product_id': pid, 'name': f'Product {pid}'} for pid in product_ids]
    
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