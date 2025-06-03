# ml-service/src/training/training-script.py
import pandas as pd
import numpy as np
import os
import sys
import json
from datetime import datetime
import logging
# from sklearn.model_selection import train_test_split # May not be needed if EnhancedLightGBMModel handles splits via keyset
# from sklearn.preprocessing import LabelEncoder # May not be needed if features are already engineered

# Add parent directory to path - adjust as per your actual structure if main.py is in src.api
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


from ml_service.src.models.lightgbm_enhanced import EnhancedLightGBMModel # Adjusted import
from ml_service.src.preprocessing.data_loader import DataLoader # Assuming this loads features.csv, history, future
# from ml_service.src.preprocessing.feature_engineering import FeatureEngineer # Feature engineering is now largely in data_preprocessing.py
from ml_service.src.utils.logger import setup_logger
from ml_service.src.database.connection import engine # Adjusted import

logger = setup_logger(__name__)

class ModelTrainer:
    def __init__(self, processed_data_path: str = "/app/data/processed", model_output_path: str = "/app/models"):
        self.processed_data_path = processed_data_path
        self.model_output_path = model_output_path
        self.model = EnhancedLightGBMModel() # Use the enhanced model
        self.data_loader = DataLoader(data_path="/app/data") # Original Instacart data path for raw files if needed by DataLoader for products/aisles etc.
        # FeatureEngineer might still be used for on-the-fly features if any, or its logic is now in data_preprocessing.py

    def load_processed_data(self):
        logger.info("Loading preprocessed Instacart data...")
        try:
            features_df = pd.read_csv(os.path.join(self.processed_data_path, "features.csv"))
            instacart_future = pd.read_csv(os.path.join(self.processed_data_path, "instacart_future.csv"))
            
            with open(os.path.join(self.processed_data_path, "instacart_keyset_0.json"), 'r') as f:
                keyset = json.load(f)
            
            logger.info(f"Loaded features_df: {features_df.shape}")
            logger.info(f"Loaded instacart_future: {instacart_future.shape}")
            logger.info(f"Loaded keyset with {len(keyset['train'])} train users.")
            
            # The instacart_future needs 'products' column to be list of ints/strings
            instacart_future['products'] = instacart_future['products'].apply(lambda x: json.loads(x) if isinstance(x, str) else x)


        except FileNotFoundError as e:
            logger.error(f"Processed data file not found: {e}")
            logger.error(f"Please ensure preprocessing script has run and files are in {self.processed_data_path}")
            raise
            
        return features_df, instacart_future, keyset

    def train(self):
        logger.info("Starting model training pipeline using EnhancedLightGBMModel...")
        
        features_df, instacart_future, keyset = self.load_processed_data()
        
        # The EnhancedLightGBMModel's train method takes features_df, instacart_future, and keyset
        # and internally calls its own prepare_training_data for train/validation splits.
        metrics = self.model.train(features_df, instacart_future, keyset)
        
        logger.info(f"Validation metrics from enhanced model: {metrics}")
        
        model_filename = "enhanced_lightgbm_model.pkl"
        model_path = os.path.join(self.model_output_path, model_filename)
        self.model.save_model(model_path)
        logger.info(f"Enhanced model saved to {model_path}")
        
        feature_importance = self.model.get_feature_importance()
        logger.info(f"Top 10 important features (enhanced model):\n{feature_importance.head(10)}")
        
        # Adapt _save_metrics_to_db to handle the metrics format from EnhancedLightGBMModel
        # It likely returns a dict with precision@k, recall@k, etc.
        # You might want to save the test set metrics specifically after a final evaluation.
        test_metrics = self.model.evaluate(features_df, instacart_future, keyset, 'test')
        logger.info(f"Test metrics: {test_metrics}")
        self._save_metrics_to_db(test_metrics, model_version="enhanced_1.0.0") # Pass the specific metrics
        
        return test_metrics # Return test metrics

    def _save_metrics_to_db(self, metrics: dict, model_version: str = "1.0.0"):
        logger.info(f"Saving metrics to DB: {metrics}")
        try:
            # Example: Extracting metrics for k=10, adjust based on actual keys in metrics dict
            precision_at_10 = metrics.get('precision@10', 0.0)
            recall_at_10 = metrics.get('recall@10', 0.0)
            f1_at_10 = metrics.get('f1@10', 0.0)
            ndcg_at_10 = metrics.get('ndcg@10', 0.0)
            # Hit rate might also be per K
            hit_rate_at_10 = metrics.get('hit_rate@10', 0.0)


            # Ensure model_metrics table schema matches what you want to save.
            # The init.sql has precision_at_10, recall_at_10, f1_score, ndcg.
            # You might need to adjust table or pick one K value.
            create_table_query = """
            CREATE TABLE IF NOT EXISTS model_metrics (
                id SERIAL PRIMARY KEY,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                precision_at_10 FLOAT,
                recall_at_10 FLOAT,
                f1_at_10 FLOAT, 
                ndcg_at_10 FLOAT,
                hit_rate_at_10 FLOAT,
                model_version VARCHAR(50),
                metrics_json JSONB 
            );
            """ 
            # Added f1_at_10, hit_rate_at_10, metrics_json for flexibility

            with engine.connect() as conn:
                conn.execute(create_table_query)
                conn.commit() # Explicitly commit DDL if necessary for your DB/driver settings

                insert_query = """
                INSERT INTO model_metrics 
                (precision_at_10, recall_at_10, f1_at_10, ndcg_at_10, hit_rate_at_10, model_version, metrics_json)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """
                
                conn.execute(insert_query, (
                    precision_at_10,
                    recall_at_10,
                    f1_at_10,
                    ndcg_at_10,
                    hit_rate_at_10,
                    model_version,
                    json.dumps(metrics) # Store all metrics as JSON
                ))
                conn.commit() # Commit data insertion
                
            logger.info("Metrics saved to database")
            
        except Exception as e:
            logger.error(f"Error saving metrics to database: {e}")
            
    # load_data_to_db method (from original training-script.py) for populating product/category staging tables
    # This is important for getting product data into the system from Instacart files.
    # ... (keep the load_data_to_db method as it was, ensuring it uses self.data_loader correctly for raw CSVs)
    def load_raw_instacart_data_for_db(self): # Renamed to avoid confusion
        """Load Instacart dataset for populating DB (products, aisles, departments)"""
        logger.info("Loading Instacart dataset for DB population...")
        try:
            # These are the standard Instacart files needed for product/category info
            # self.data_loader is initialized with the raw data_path
            products_df = self.data_loader.load_csv("products.csv")
            aisles_df = self.data_loader.load_csv("aisles.csv")
            departments_df = self.data_loader.load_csv("departments.csv")
            
            logger.info(f"Loaded products for DB: {len(products_df)}")
            return {
                'products': products_df,
                'aisles': aisles_df,
                'departments': departments_df
            }
        except FileNotFoundError as e:
            logger.error(f"Dataset file not found for DB population: {e}")
            raise

    def load_data_to_db(self): # This method now calls the one above
        """Load Instacart data into PostgreSQL database"""
        data = self.load_raw_instacart_data_for_db()
        logger.info("Loading data into PostgreSQL staging tables...")
        
        try:
            # Merge product information
            products = data['products'].merge(data['aisles'], on='aisle_id')
            products = products.merge(data['departments'], on='department_id')
            
            # Prepare products_db (same logic as original script)
            products_db = products.rename(columns={
                'product_id': 'id', # Ensure this matches your main product table's PK if it's not UUID
                'product_name': 'name',
                'aisle': 'aisle_name', # These are extra info, not direct columns in your final 'products' table
                'department': 'department_name'
            })
            products_db['id'] = products_db['id'].astype(int) # Assuming product_id from CSV is int
            
            products_db['sku'] = 'PROD-' + products_db['id'].astype(str).str.zfill(6)
            products_db['price'] = np.random.uniform(0.99, 29.99, size=len(products_db)).round(2) # Placeholder price
            products_db['description'] = products_db['name'] + ' - ' + products_db['aisle_name']
            products_db['stock'] = np.random.randint(10, 1000, size=len(products_db))
            products_db['image_url'] = '/images/products/' + products_db['department_name'].str.lower().str.replace(' ', '-').str.replace('&', 'and') + '.jpg' # Generic image
            products_db['is_active'] = True
            
            # We need category_id (UUID) for products table. Map department_name to category UUIDs
            # First, ensure categories are in DB or create them from departments.
            
            departments_for_cat = data['departments'].rename(
                columns={'department_id': 'dept_id_int', 'department': 'name'}
            )
            departments_for_cat['description'] = departments_for_cat['name'] + ' department'
            departments_for_cat['image_url'] = '/images/categories/' + departments_for_cat['name'].str.lower().str.replace(' ', '-').str.replace('&', 'and') + '.jpg'
            
            category_map = {}
            with engine.connect() as conn:
                for _, row in departments_for_cat.iterrows():
                    # Upsert category
                    res = conn.execute(f"SELECT id FROM categories WHERE name = '{row['name']}'").fetchone()
                    if res:
                        cat_id = res[0]
                    else:
                        res = conn.execute(f"INSERT INTO categories (name, description, image_url) VALUES ('{row['name']}', '{row['description']}', '{row['image_url']}') RETURNING id").fetchone()
                        cat_id = res[0]
                    category_map[row['name']] = cat_id
                conn.commit()

            products_db['category_id'] = products_db['department_name'].map(category_map)
            
            # Select only columns that exist in your 'products' table (staging or final)
            # Your 'products' table uses UUID for id. Instacart product_id is int.
            # This staging step should align with a subsequent step to populate the final UUID-based table.
            # For now, let's assume products_staging can take an integer ID for simplicity of this step.
            # OR, we generate UUIDs here if products_staging expects them.
            # Given `database-init.sql` product.id is UUID, this needs careful handling.
            # Let's keep it simple and assume products_staging can handle these columns:
            cols_to_keep = ['sku', 'name', 'description', 'price', 'stock', 'image_url', 'is_active', 'category_id']
            products_db_final = products_db[cols_to_keep]

            products_db_final.to_sql('products_staging', engine, if_exists='replace', index=False)
            logger.info(f"Loaded {len(products_db_final)} products to products_staging")

            # Categories are already handled above by upserting into the main 'categories' table.
            # No need for categories_staging if we directly populate `categories`.
            
            logger.info("Product and category data loaded to PostgreSQL successfully")
            
        except Exception as e:
            logger.error(f"Error loading data to database: {e}")
            raise

if __name__ == "__main__":
    # Create processed_data_path if it doesn't exist
    processed_data_dir = "/app/data/processed"
    os.makedirs(processed_data_dir, exist_ok=True)
    
    # --- Run Preprocessing First ---
    # This assumes data_preprocessing.py is executable and correctly placed.
    # In a real pipeline, you'd call this as a separate step or ensure it's run.
    # from ml_service.src.preprocessing.data_preprocessing import InstacartDataPreprocessor
    # logger.info("=" * 50)
    # logger.info("STARTING DATA PREPROCESSING")
    # logger.info("=" * 50)
    # preprocessor = InstacartDataPreprocessor(data_path="/app/data") # Path to raw Instacart CSVs
    # preprocessor.load_raw_data()
    # preprocessor.save_processed_data(output_path=processed_data_dir)
    # logger.info("=" * 50)
    # logger.info("DATA PREPROCESSING COMPLETED")
    # logger.info("=" * 50)
    
    # --- Then Initialize Trainer and Train Model ---
    trainer = ModelTrainer(processed_data_path=processed_data_dir)
    
    # Load product data to DB (from raw Instacart CSVs to staging tables)
    logger.info("=" * 50)
    logger.info("LOADING PRODUCT/CATEGORY DATA TO DB STAGING")
    logger.info("=" * 50)
    trainer.load_data_to_db() # This populates staging tables
    logger.info("=" * 50)
    logger.info("PRODUCT/CATEGORY DATA LOADING TO DB STAGING COMPLETED")
    logger.info("=" * 50)
    
    # Train model (using preprocessed data)
    logger.info("=" * 50)
    logger.info("STARTING MODEL TRAINING")
    logger.info("=" * 50)
    metrics = trainer.train()
    logger.info("=" * 50)
    logger.info("MODEL TRAINING COMPLETED")
    logger.info(f"Final test metrics: {metrics}")
    logger.info("=" * 50)