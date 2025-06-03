# ml-service/src/training/train_model.py
import pandas as pd
import numpy as np
import os
import sys
from datetime import datetime
import logging
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import psycopg2
from sqlalchemy import create_engine
import warnings
warnings.filterwarnings('ignore')

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.lightgbm_model import LightGBMModel
from preprocessing.feature_engineering import FeatureEngineer
from preprocessing.data_loader import DataLoader
from utils.logger import setup_logger
from database.connection import engine

logger = setup_logger(__name__)

class ModelTrainer:
    """Train the next basket prediction model"""
    
    def __init__(self, data_path: str = "/app/data"):
        self.data_path = data_path
        self.model = LightGBMModel()
        self.feature_engineer = FeatureEngineer()
        self.data_loader = DataLoader(data_path)
        
    def load_instacart_data(self):
        """Load Instacart dataset"""
        logger.info("Loading Instacart dataset...")
        
        # Load datasets
        try:
            # These are the standard Instacart files
            orders = pd.read_csv(os.path.join(self.data_path, "orders.csv"))
            order_products_prior = pd.read_csv(os.path.join(self.data_path, "order_products__prior.csv"))
            order_products_train = pd.read_csv(os.path.join(self.data_path, "order_products__train.csv"))
            products = pd.read_csv(os.path.join(self.data_path, "products.csv"))
            aisles = pd.read_csv(os.path.join(self.data_path, "aisles.csv"))
            departments = pd.read_csv(os.path.join(self.data_path, "departments.csv"))
            
            logger.info(f"Loaded orders: {len(orders)}")
            logger.info(f"Loaded products: {len(products)}")
            
        except FileNotFoundError as e:
            logger.error(f"Dataset file not found: {e}")
            logger.info("Please download the Instacart dataset from Kaggle and place in /app/data")
            raise
            
        return {
            'orders': orders,
            'order_products_prior': order_products_prior,
            'order_products_train': order_products_train,
            'products': products,
            'aisles': aisles,
            'departments': departments
        }
    
    def prepare_training_data(self, data: dict) -> tuple:
        """Prepare data for training"""
        logger.info("Preparing training data...")
        
        # Merge product information
        products = data['products'].merge(data['aisles'], on='aisle_id')
        products = products.merge(data['departments'], on='department_id')
        
        # Get user order history
        orders = data['orders']
        order_products = pd.concat([
            data['order_products_prior'],
            data['order_products_train']
        ])
        
        # Create user-product interactions
        user_product_orders = orders.merge(order_products, on='order_id')
        
        # Calculate features
        logger.info("Engineering features...")
        
        # User features
        user_features = self._create_user_features(user_product_orders, orders)
        
        # Product features  
        product_features = self._create_product_features(user_product_orders, products)
        
        # User-Product features
        user_product_features = self._create_user_product_features(user_product_orders)
        
        # Create training samples
        logger.info("Creating training samples...")
        X, y = self._create_training_samples(
            user_features, 
            product_features, 
            user_product_features,
            user_product_orders
        )
        
        return X, y
    
    def _create_user_features(self, user_product_orders: pd.DataFrame, orders: pd.DataFrame) -> pd.DataFrame:
        """Create user-level features"""
        
        user_features = orders.groupby('user_id').agg({
            'order_id': 'count',
            'order_dow': lambda x: x.mode()[0] if len(x.mode()) > 0 else 0,
            'order_hour_of_day': lambda x: x.mode()[0] if len(x.mode()) > 0 else 0,
            'days_since_prior_order': 'mean'
        }).reset_index()
        
        user_features.columns = ['user_id', 'user_order_count', 'user_favorite_dow', 
                                'user_favorite_hour', 'user_avg_days_between_orders']
        
        # Product diversity
        user_product_counts = user_product_orders.groupby('user_id')['product_id'].nunique().reset_index()
        user_product_counts.columns = ['user_id', 'user_distinct_products']
        
        user_features = user_features.merge(user_product_counts, on='user_id')
        
        return user_features
    
    def _create_product_features(self, user_product_orders: pd.DataFrame, products: pd.DataFrame) -> pd.DataFrame:
        """Create product-level features"""
        
        product_features = user_product_orders.groupby('product_id').agg({
            'order_id': 'count',
            'reordered': 'mean',
            'add_to_cart_order': 'mean'
        }).reset_index()
        
        product_features.columns = ['product_id', 'product_order_count', 
                                   'product_reorder_rate', 'product_avg_cart_position']
        
        # Add product metadata
        product_features = product_features.merge(
            products[['product_id', 'aisle_id', 'department_id']], 
            on='product_id'
        )
        
        return product_features
    
    def _create_user_product_features(self, user_product_orders: pd.DataFrame) -> pd.DataFrame:
        """Create user-product interaction features"""
        
        user_product_features = user_product_orders.groupby(['user_id', 'product_id']).agg({
            'order_id': 'count',
            'reordered': 'sum',
            'add_to_cart_order': 'mean'
        }).reset_index()
        
        user_product_features.columns = ['user_id', 'product_id', 'up_order_count', 
                                        'up_reorder_count', 'up_avg_cart_position']
        
        # Calculate reorder probability
        user_product_features['up_reorder_prob'] = (
            user_product_features['up_reorder_count'] / 
            user_product_features['up_order_count']
        )
        
        # Days since last order
        last_order = user_product_orders.groupby(['user_id', 'product_id'])['order_number'].max().reset_index()
        last_order.columns = ['user_id', 'product_id', 'up_last_order_number']
        
        user_product_features = user_product_features.merge(last_order, on=['user_id', 'product_id'])
        
        return user_product_features
    
    def _create_training_samples(self, user_features, product_features, 
                                user_product_features, user_product_orders):
        """Create training samples for binary classification"""
        
        # Get the last order for each user as the target
        last_orders = user_product_orders.groupby('user_id')['order_number'].max().reset_index()
        last_orders.columns = ['user_id', 'last_order_number']
        
        # Get products in last order (positive samples)
        positive_samples = user_product_orders.merge(last_orders, on='user_id')
        positive_samples = positive_samples[
            positive_samples['order_number'] == positive_samples['last_order_number']
        ][['user_id', 'product_id']].drop_duplicates()
        positive_samples['target'] = 1
        
        # Sample negative examples (products not in last order)
        all_user_products = user_product_features[['user_id', 'product_id']].drop_duplicates()
        negative_samples = all_user_products.merge(
            positive_samples[['user_id', 'product_id']], 
            on=['user_id', 'product_id'], 
            how='left', 
            indicator=True
        )
        negative_samples = negative_samples[negative_samples['_merge'] == 'left_only']
        negative_samples = negative_samples[['user_id', 'product_id']]
        negative_samples['target'] = 0
        
        # Combine samples
        samples = pd.concat([positive_samples, negative_samples])
        
        # Add features
        samples = samples.merge(user_features, on='user_id')
        samples = samples.merge(product_features, on='product_id')
        samples = samples.merge(user_product_features, on=['user_id', 'product_id'], how='left')
        
        # Fill missing values
        samples = samples.fillna(0)
        
        # Split features and target
        feature_cols = [col for col in samples.columns if col not in ['user_id', 'product_id', 'target']]
        X = samples[feature_cols]
        y = samples['target']
        
        return X, y
    
    def train(self):
        """Main training pipeline"""
        logger.info("Starting model training pipeline...")
        
        # Load data
        data = self.load_instacart_data()
        
        # Prepare training data
        X, y = self.prepare_training_data(data)
        
        logger.info(f"Training data shape: {X.shape}")
        logger.info(f"Target distribution: {y.value_counts()}")
        
        # Split data
        X_train, X_val, y_train, y_val = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Train model
        metrics = self.model.train(X_train, y_train, X_val, y_val)
        
        logger.info(f"Validation metrics: {metrics}")
        
        # Save model
        model_path = os.path.join(os.getenv("MODEL_PATH", "/app/models"), "lightgbm_model.pkl")
        self.model.save_model(model_path)
        
        # Save feature importance
        feature_importance = self.model.calculate_feature_importance()
        logger.info(f"Top 10 important features:\n{feature_importance.head(10)}")
        
        # Store model metrics in database
        self._save_metrics_to_db(metrics)
        
        return metrics
    
    def _save_metrics_to_db(self, metrics: dict):
        """Save model metrics to database"""
        try:
            # Create metrics table if not exists
            create_table_query = """
            CREATE TABLE IF NOT EXISTS model_metrics (
                id SERIAL PRIMARY KEY,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                precision_at_10 FLOAT,
                recall_at_10 FLOAT,
                hit_rate FLOAT,
                ndcg FLOAT,
                f1_score FLOAT,
                model_version VARCHAR(50)
            );
            """
            
            with engine.connect() as conn:
                conn.execute(create_table_query)
                
                # Insert metrics
                insert_query = """
                INSERT INTO model_metrics 
                (precision_at_10, recall_at_10, f1_score, ndcg, model_version)
                VALUES (%s, %s, %s, %s, %s)
                """
                
                conn.execute(insert_query, (
                    metrics.get('precision', 0),
                    metrics.get('recall', 0),
                    metrics.get('f1', 0),
                    metrics.get('ndcg', 0),
                    '1.0.0'
                ))
                
            logger.info("Metrics saved to database")
            
        except Exception as e:
            logger.error(f"Error saving metrics to database: {e}")
    
    def load_data_to_db(self, data: dict):
        """Load Instacart data into PostgreSQL database"""
        logger.info("Loading data into PostgreSQL...")
        
        try:
            # Load products with categories
            products = data['products'].merge(data['aisles'], on='aisle_id')
            products = products.merge(data['departments'], on='department_id')
            
            # Prepare products for database
            products_db = products.rename(columns={
                'product_id': 'id',
                'product_name': 'name',
                'aisle': 'aisle_name',
                'department': 'department_name'
            })
            
            # Generate SKUs
            products_db['sku'] = 'PROD-' + products_db['id'].astype(str).str.zfill(6)
            
            # Add required fields
            products_db['price'] = np.random.uniform(0.99, 29.99, size=len(products_db)).round(2)
            products_db['description'] = products_db['name'] + ' - ' + products_db['aisle_name']
            products_db['stock'] = np.random.randint(10, 1000, size=len(products_db))
            products_db['image_url'] = '/images/products/default.jpg'
            products_db['is_active'] = True
            
            # Load to database
            products_db.to_sql('products_staging', engine, if_exists='replace', index=False)
            
            logger.info(f"Loaded {len(products_db)} products to staging")
            
            # Also prepare categories
            categories = data['departments'][['department_id', 'department']].rename(
                columns={'department_id': 'id', 'department': 'name'}
            )
            categories['description'] = categories['name'] + ' department'
            categories['image_url'] = '/images/categories/default.jpg'
            
            categories.to_sql('categories_staging', engine, if_exists='replace', index=False)
            
            logger.info("Data loaded to PostgreSQL successfully")
            
        except Exception as e:
            logger.error(f"Error loading data to database: {e}")
            raise

if __name__ == "__main__":
    # Initialize trainer
    trainer = ModelTrainer()
    
    # Train model
    logger.info("=" * 50)
    logger.info("STARTING MODEL TRAINING")
    logger.info("=" * 50)
    
    metrics = trainer.train()
    
    logger.info("=" * 50)
    logger.info("MODEL TRAINING COMPLETED")
    logger.info(f"Final metrics: {metrics}")
    logger.info("=" * 50)