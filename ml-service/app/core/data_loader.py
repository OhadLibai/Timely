# ml-service/app/core/data_loader.py (UPDATED)
# Solution: Keep ML memory storage but add database sync capability

import os
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
from loguru import logger
import psycopg2
from psycopg2.extras import RealDictCursor
import json
from app.config import config

class DataLoader:
    """
    CONSOLIDATED: Loads Instacart data for ML with optional database sync
    """
    
    def __init__(self):
        # ML Performance: Keep in-memory storage for fast predictions
        self.products = {}  # product_id -> product info (ML optimized)
        self.user_baskets = {}
        self.user_future_baskets = {}
        self.order_info = {}
        self.user_ids = []
        self.is_loaded = False
        
        # Database connection for sync (lazy loaded)
        self._db_connection = None
        
    def _load_products(self, data_path: str):
        """
        Load products with their metadata (KEEP THIS FOR ML PERFORMANCE)
        This provides fast in-memory access for TIFUKNN predictions
        """
        products_file = os.path.join(data_path, "products.csv")
        aisles_file = os.path.join(data_path, "aisles.csv")
        departments_file = os.path.join(data_path, "departments.csv")
        
        logger.info("Loading products for ML service...")
        
        # Load and merge data (keep existing logic)
        if os.path.exists(products_file):
            products_df = pd.read_csv(products_file)
            
            # Load supporting data
            aisles_df = None
            departments_df = None
            
            if os.path.exists(aisles_file):
                aisles_df = pd.read_csv(aisles_file)
            if os.path.exists(departments_file):
                departments_df = pd.read_csv(departments_file)
            
            # Merge data
            if aisles_df is not None:
                products_df = products_df.merge(aisles_df, on='aisle_id', how='left')
            if departments_df is not None:
                products_df = products_df.merge(departments_df, on='department_id', how='left')
            
            # KEEP THIS: Store in memory for ML performance
            for _, row in products_df.iterrows():
                self.products[row['product_id']] = {
                    'product_name': row['product_name'],
                    'aisle': row.get('aisle', 'Unknown'),
                    'department': row.get('department', 'Unknown'),
                    'aisle_id': row.get('aisle_id'),
                    'department_id': row.get('department_id')
                }
            
            logger.info(f"✅ Loaded {len(self.products)} products in memory for ML")
        else:
            logger.warning(f"Products file not found: {products_file}")

    def get_product_info(self, product_id: int) -> Optional[Dict]:
        """
        Get product information (ML optimized - from memory)
        """
        return self.products.get(product_id)
    
    def get_product_info_with_database_sync(self, product_id: int) -> Optional[Dict]:
        """
        Get product info with database data for web app consistency
        Combines ML data with database data for complete information
        """
        # Get ML data first (fast)
        ml_product = self.get_product_info(product_id)
        if not ml_product:
            return None
            
        # Get database data for web app fields (price, images, etc.)
        db_product = self._get_product_from_database(product_id)
        
        # Merge ML and database data
        combined = ml_product.copy()
        if db_product:
            combined.update({
                'id': db_product.get('id'),  # UUID for web app
                'sku': db_product.get('sku'),
                'price': float(db_product.get('price', 0)),
                'image_url': db_product.get('image_url'),
                'category_id': db_product.get('category_id'),
                'stock': db_product.get('stock', 0),
                'is_active': db_product.get('is_active', True)
            })
        
        return combined
    
    def _get_product_from_database(self, instacart_product_id: int) -> Optional[Dict]:
        """
        Get product from database by instacart_product_id
        """
        if not self._db_connection:
            self._connect_to_database()
            
        if not self._db_connection:
            return None
            
        try:
            with self._db_connection.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("""
                    SELECT id, sku, name, price, image_url, category_id, stock, is_active
                    FROM products 
                    WHERE instacart_product_id = %s
                """, (instacart_product_id,))
                
                result = cursor.fetchone()
                return dict(result) if result else None
                
        except Exception as e:
            logger.error(f"Database query failed for product {instacart_product_id}: {e}")
            return None
    
    def _connect_to_database(self):
        """
        Lazy database connection for sync operations
        """
        try:
            database_url = config.DATABASE_URL
            if database_url:
                self._db_connection = psycopg2.connect(database_url)
                logger.info("✅ Connected to database for product sync")
            else:
                logger.warning("⚠️  DATABASE_URL not set, sync operations disabled")
        except Exception as e:
            logger.error(f"❌ Failed to connect to database: {e}")
            self._db_connection = None
    
    def sync_products_to_database(self):
        """
        ADMIN FUNCTION: Sync ML product data to database
        Call this when you want to ensure database has latest product metadata
        """
        if not self._db_connection:
            self._connect_to_database()
            
        if not self._db_connection:
            logger.error("Cannot sync: No database connection")
            return False
            
        logger.info("🔄 Syncing ML products to database...")
        
        try:
            with self._db_connection.cursor() as cursor:
                synced_count = 0
                
                for product_id, product_data in self.products.items():
                    # Update database product metadata from ML data
                    cursor.execute("""
                        UPDATE products 
                        SET 
                            name = %s,
                            instacart_aisle_name = %s,
                            instacart_department_name = %s,
                            metadata = metadata || %s,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE instacart_product_id = %s
                    """, (
                        product_data['product_name'],
                        product_data['aisle'],
                        product_data['department'],
                        json.dumps({
                            'ml_metadata': product_data,
                            'last_ml_sync': str(pd.Timestamp.now())
                        }),
                        product_id
                    ))
                    
                    if cursor.rowcount > 0:
                        synced_count += 1
                
                self._db_connection.commit()
                logger.info(f"✅ Synced {synced_count} products to database")
                return True
                
        except Exception as e:
            logger.error(f"❌ Product sync failed: {e}")
            self._db_connection.rollback()
            return False

    # Keep all existing methods unchanged
    def load_instacart_data(self, data_path: str, preprocess: bool = True):
        """Keep existing implementation"""
        # ... existing code ...
        pass
    
    def get_user_baskets(self, user_id: int) -> List[List[int]]:
        """Keep existing implementation"""
        return self.user_baskets.get(user_id, [])
    
    # ... all other existing methods remain the same ...


# ============================================================================
# USAGE EXAMPLES FOR YOUR 4 DEMANDS
# ============================================================================

"""
DEMAND #1 (Admin creates user):
- Admin creates user with Instacart ID
- User's order history populated from CSV using existing ML methods
- When displaying order history, use get_product_info_with_database_sync() 
  to show product with proper pricing, images, etc.

DEMAND #2 (Model Performance):
- Uses existing ML methods with in-memory data (no database needed)
- Fast and efficient for evaluation

DEMAND #3 (Individual User Prediction):
- Uses ML methods for prediction
- Uses database sync for display consistency  

DEMAND #4 (Good UX):
- Frontend gets consistent product data via database sync
- ML predictions remain fast via in-memory storage
"""


# ============================================================================
# SUMMARY OF CONSOLIDATED APPROACH
# ============================================================================

"""
✅ SINGLE SOURCE OF TRUTH: Instacart CSV files

✅ ML SERVICE (Fast):
  - Loads CSV data into memory for predictions
  - Uses existing self.products storage
  - Optimized for TIFUKNN performance

✅ DATABASE (Consistent): 
  - Populated from same CSV files via init-database.ts
  - Provides UUID mappings, pricing, images for web app
  - Consistent with ML data via sync methods

✅ INTEGRATION:
  - get_product_info() - ML optimized (existing)
  - get_product_info_with_database_sync() - Web app optimized (new)
  - sync_products_to_database() - Admin function (new)

✅ NO CONFLICTS:
  - One data source (CSV)
  - Two optimized access patterns (memory + database)
  - Clear separation of concerns
  - Sync capability when needed
"""