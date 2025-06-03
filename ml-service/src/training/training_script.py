# ml-service/src/training/training-script.py
import pandas as pd
import numpy as np
import os
import sys
import json
from datetime import datetime
import logging
from sqlalchemy import text # For executing raw SQL with parameters

# Ensure correct relative imports for your project structure
# Assuming this script is run as a module from the root of ml-service, or paths are adjusted
# If run with `python -m src.training.train_model` from `ml-service/` directory:
from src.models.lightgbm_enhanced import EnhancedLightGBMModel
from src.preprocessing.data_loader import DataLoader
from src.utils.logger import setup_logger
from src.database.connection import engine # Ensure this provides a SQLAlchemy engine

logger = setup_logger(__name__)

# --- Placeholder Image Generation ---
def get_placeholder_image_url(seed_text: str, width: int = 300, height: int = 300) -> str:
    """Generates a placeholder image URL from picsum.photos based on a seed."""
    if not seed_text:
        seed_text = "default"
    # Simple hash to get a somewhat consistent image for the same text
    seed = sum(ord(c) for c in str(seed_text)) % 1000 # Keep seed within reasonable bounds
    return f"https://picsum.photos/seed/{seed}/{width}/{height}"

class ModelTrainer:
    def __init__(self, 
                 raw_data_path: str = "/app/data", # For original Instacart CSVs
                 processed_data_path: str = "/app/data/processed", # For features, history, future, keyset
                 model_output_path: str = "/app/models"):
        self.raw_data_path = raw_data_path
        self.processed_data_path = processed_data_path
        self.model_output_path = model_output_path
        self.model = EnhancedLightGBMModel()
        self.data_loader = DataLoader(data_path=self.raw_data_path) # For loading raw CSVs

    def load_processed_data_for_training(self):
        logger.info(f"Loading preprocessed data for training from: {self.processed_data_path}")
        try:
            features_df = pd.read_csv(os.path.join(self.processed_data_path, "features.csv"))
            instacart_future_df = pd.read_csv(os.path.join(self.processed_data_path, "instacart_future.csv"))
            
            with open(os.path.join(self.processed_data_path, "instacart_keyset_0.json"), 'r') as f:
                keyset = json.load(f)
            
            logger.info(f"Loaded features_df: {features_df.shape}")
            logger.info(f"Loaded instacart_future_df: {instacart_future_df.shape}")
            logger.info(f"Loaded keyset with {len(keyset['train'])} train users.")
            
            # Ensure 'products' column in instacart_future_df is a list of items
            # It's often stored as a string representation of a list in CSV
            def parse_product_list(products_str):
                if isinstance(products_str, list):
                    return products_str
                try:
                    # Safely evaluate string representation of list
                    return json.loads(products_str)
                except (json.JSONDecodeError, TypeError):
                    logger.warning(f"Could not parse product list: {products_str}. Returning empty list.")
                    return []

            instacart_future_df['products'] = instacart_future_df['products'].apply(parse_product_list)

        except FileNotFoundError as e:
            logger.error(f"Processed data file not found: {e}. Path: {self.processed_data_path}")
            logger.error("Please ensure data_preprocessing.py script has run successfully.")
            raise
            
        return features_df, instacart_future_df, keyset

    def train_and_evaluate(self):
        logger.info("Starting model training & evaluation pipeline using EnhancedLightGBMModel...")
        
        features_df, instacart_future_df, keyset = self.load_processed_data_for_training()
        
        # Train the model (this internally uses 'train' for fitting, 'valid' for tuning)
        training_metrics = self.model.train(features_df, instacart_future_df, keyset)
        logger.info(f"Validation metrics from model training: {training_metrics}")
        
        # Evaluate on the 'test' set
        logger.info("Evaluating model on the test set...")
        test_set_metrics = self.model.evaluate(features_df, instacart_future_df, keyset, 'test')
        logger.info(f"Test set evaluation metrics: {test_set_metrics}")
        
        # Save the trained model
        model_filename = "enhanced_lightgbm_model.pkl"
        model_path = os.path.join(self.model_output_path, model_filename)
        self.model.save_model(model_path)
        logger.info(f"Enhanced model saved to {model_path}")
        
        # Log feature importance
        feature_importance_df = self.model.get_feature_importance()
        logger.info(f"Top 10 important features:\n{feature_importance_df.head(10)}")
        
        # Save test metrics to the database
        self._save_metrics_to_db(test_set_metrics, model_version="enhanced_1.0.1") # Update version as needed
        
        return test_set_metrics

    def _save_metrics_to_db(self, metrics: dict, model_version: str = "1.0.0"):
        logger.info(f"Saving metrics to DB: {metrics}")
        try:
            # Extract key metrics for direct columns, store all in JSONB
            precision_at_10 = metrics.get('precision@10', 0.0)
            recall_at_10 = metrics.get('recall@10', 0.0)
            f1_at_10 = metrics.get('f1@10', 0.0)
            ndcg_at_10 = metrics.get('ndcg@10', 0.0)
            hit_rate_at_10 = metrics.get('hit_rate@10', 0.0)

            # Ensure model_metrics table exists (idempotent)
            # Using SERIAL for id in model_metrics for simplicity in this script
            create_table_sql = text("""
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
            """)

            insert_sql = text("""
            INSERT INTO model_metrics 
            (precision_at_10, recall_at_10, f1_at_10, ndcg_at_10, hit_rate_at_10, model_version, metrics_json)
            VALUES (:p10, :r10, :f110, :n10, :h10, :version, :json_data)
            """)

            with engine.connect() as conn:
                conn.execute(create_table_sql)
                conn.execute(insert_sql, {
                    "p10": precision_at_10, "r10": recall_at_10, "f110": f1_at_10,
                    "n10": ndcg_at_10, "h10": hit_rate_at_10, "version": model_version,
                    "json_data": json.dumps(metrics)
                })
                conn.commit()
            logger.info("Metrics saved to database.")
        except Exception as e:
            logger.error(f"Error saving metrics to database: {e}", exc_info=True)

    def load_raw_instacart_data_for_db_population(self):
        logger.info(f"Loading raw Instacart CSVs for DB population from: {self.raw_data_path}")
        try:
            products_df = self.data_loader.load_csv("products.csv")
            aisles_df = self.data_loader.load_csv("aisles.csv")
            departments_df = self.data_loader.load_csv("departments.csv")
            
            logger.info(f"Loaded raw products: {len(products_df)}, aisles: {len(aisles_df)}, departments: {len(departments_df)}")
            return {'products': products_df, 'aisles': aisles_df, 'departments': departments_df}
        except FileNotFoundError as e:
            logger.error(f"Raw Instacart CSV file not found: {e}. Path: {self.raw_data_path}")
            raise

    def populate_db_staging_tables(self):
        raw_data = self.load_raw_instacart_data_for_db_population()
        logger.info("Populating database staging tables (categories and products_staging)...")
        
        try:
            # 1. Populate/Upsert Categories into the main 'categories' table
            departments_df = raw_data['departments'].rename(
                columns={'department_id': 'dept_int_id', 'department': 'name'}
            )
            category_map_by_name = {} # Stores department_name -> category_uuid
            category_map_by_int_id = {} # Stores department_int_id -> category_uuid

            with engine.connect() as conn:
                # Ensure categories table exists (idempotent DDL, defined in init.sql)
                for _, row in departments_df.iterrows():
                    dept_name = row['name']
                    dept_int_id = row['dept_int_id']
                    description = f"{dept_name} department"
                    image_url = get_placeholder_image_url(dept_name, width=400, height=200)

                    # Check if category exists by name
                    find_sql = text("SELECT id FROM categories WHERE name = :name")
                    existing_cat = conn.execute(find_sql, {"name": dept_name}).fetchone()

                    if existing_cat:
                        cat_uuid = existing_cat[0]
                        # Optionally update description/image if they changed or are null
                        update_sql = text("""
                            UPDATE categories SET description = COALESCE(description, :desc), image_url = COALESCE(image_url, :img), updated_at = CURRENT_TIMESTAMP
                            WHERE id = :id
                        """)
                        conn.execute(update_sql, {"desc": description, "img": image_url, "id": cat_uuid})
                    else:
                        insert_sql = text("""
                            INSERT INTO categories (name, description, image_url) 
                            VALUES (:name, :desc, :img) RETURNING id
                        """)
                        result = conn.execute(insert_sql, {"name": dept_name, "desc": description, "img": image_url}).fetchone()
                        cat_uuid = result[0]
                    
                    category_map_by_name[dept_name] = cat_uuid
                    category_map_by_int_id[str(dept_int_id)] = cat_uuid # Store int_id as string key
                conn.commit()
            logger.info(f"Upserted {len(category_map_by_name)} categories into 'categories' table.")

            # 2. Prepare and Load Products into 'products_staging'
            products_df = raw_data['products'].merge(raw_data['aisles'], on='aisle_id', how='left')
            products_df = products_df.merge(raw_data['departments'], on='department_id', how='left')
            
            products_for_staging = []
            for _, row in products_df.iterrows():
                cat_uuid = category_map_by_int_id.get(str(row['department_id']))
                if not cat_uuid:
                    logger.warning(f"Product ID {row['product_id']} (Name: {row['product_name']}) has unknown department_id {row['department_id']}. Skipping.")
                    continue

                products_for_staging.append({
                    'id_instacart': int(row['product_id']), # Keep original Instacart ID
                    'sku': f"PROD-{str(row['product_id']).zfill(7)}", # SKU based on Instacart ID
                    'name': row['product_name'],
                    'description': f"{row['product_name']} from aisle {row.get('aisle', 'N/A')}",
                    'price': round(np.random.uniform(0.99, 29.99), 2), # Placeholder price
                    'compare_at_price': round(np.random.uniform(1.0, 1.0) * 1.2, 2) if np.random.rand() > 0.7 else None,
                    'unit': 'unit', # Placeholder unit
                    'unit_value': 1.0, # Placeholder
                    'brand': 'TimelyBrand', # Placeholder brand
                    'tags_string': f"{row.get('aisle', '')},{row.get('department', '')}", # Comma-separated tags
                    'image_url': get_placeholder_image_url(row['product_name']),
                    'category_id': cat_uuid, # UUID of the category
                    'stock': np.random.randint(10, 500),
                    'is_active': True,
                    'nutritional_info_json': json.dumps({'calories': np.random.randint(50,300)}), # Basic placeholder
                    'metadata_json': json.dumps({'instacart_aisle_id': row['aisle_id'], 'instacart_department_id': row['department_id']})
                })
            
            products_staging_df = pd.DataFrame(products_for_staging)

            if not products_staging_df.empty:
                # Create products_staging table (idempotent)
                # This staging table is simpler, using Instacart ID as a reference.
                # The sync_products.ts script will handle mapping to final product table with UUIDs.
                create_staging_sql = text("""
                CREATE TABLE IF NOT EXISTS products_staging (
                    id_instacart INTEGER PRIMARY KEY,
                    sku VARCHAR(100) UNIQUE NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    price DECIMAL(10,2),
                    compare_at_price DECIMAL(10,2),
                    unit VARCHAR(50),
                    unit_value DECIMAL(10,3),
                    brand VARCHAR(100),
                    tags_string TEXT,
                    image_url VARCHAR(500),
                    category_id UUID NOT NULL REFERENCES categories(id),
                    stock INTEGER,
                    is_active BOOLEAN,
                    nutritional_info_json JSONB,
                    metadata_json JSONB
                );
                """)
                with engine.connect() as conn:
                    conn.execute(create_staging_sql)
                    conn.commit()

                products_staging_df.to_sql('products_staging', engine, if_exists='replace', index=False)
                logger.info(f"Loaded {len(products_staging_df)} products into 'products_staging' table.")
            else:
                logger.info("No products available to load into 'products_staging'.")

        except Exception as e:
            logger.error(f"Error populating DB staging tables: {e}", exc_info=True)
            raise

if __name__ == "__main__":
    # Ensure processed data path exists for output of data_preprocessing
    # This is set via PROCESSED_DATA_PATH env var, default /app/data/processed
    processed_data_output_dir = os.getenv("PROCESSED_DATA_PATH", "/app/data/processed")
    os.makedirs(processed_data_output_dir, exist_ok=True)
    
    # Raw data path for Instacart CSVs is set via RAW_DATA_PATH, default /app/data
    raw_data_input_dir = os.getenv("RAW_DATA_PATH", "/app/data")

    # ---- Preprocessing Step (Assumed to be run by docker-compose command) ----
    # If not run by docker-compose, you would uncomment and run:
    # logger.info("="*50 + " PREPROCESSING DATA " + "="*50)
    # from src.preprocessing.data_preprocessing import InstacartDataPreprocessor
    # preprocessor = InstacartDataPreprocessor(data_path=raw_data_input_dir)
    # preprocessor.load_raw_data()
    # preprocessor.save_processed_data(output_path=processed_data_output_dir)
    # logger.info("="*50 + " PREPROCESSING COMPLETE " + "="*50)

    # ---- Trainer Initialization ----
    trainer = ModelTrainer(
        raw_data_path=raw_data_input_dir,
        processed_data_path=processed_data_output_dir,
        model_output_path=os.getenv("MODEL_PATH", "/app/models")
    )
    
    # ---- Populate DB Staging Tables (from raw Instacart CSVs) ----
    logger.info("="*50 + " POPULATING DB STAGING TABLES " + "="*50)
    trainer.populate_db_staging_tables()
    logger.info("="*50 + " DB STAGING POPULATION COMPLETE " + "="*50)
    
    # ---- Train and Evaluate Model (using processed data) ----
    logger.info("="*50 + " TRAINING AND EVALUATING MODEL " + "="*50)
    final_metrics = trainer.train_and_evaluate()
    logger.info(f"Final test metrics from training run: {final_metrics}")
    logger.info("="*50 + " MODEL TRAINING & EVALUATION COMPLETE " + "="*50)