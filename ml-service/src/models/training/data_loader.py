# ml-service/src/preprocessing/data_loader.py
import pandas as pd
import os
import logging

logger = logging.getLogger(__name__)

class DataLoader:
    """
    Loads raw CSV data files for the ML pipeline
    """
    
    def __init__(self, data_path: str = "/app/data"):
        self.data_path = data_path
        
    def load_csv(self, filename: str) -> pd.DataFrame:
        """
        Load a CSV file from the data directory
        
        Args:
            filename: Name of the CSV file to load
            
        Returns:
            pandas DataFrame with the loaded data
        """
        file_path = os.path.join(self.data_path, filename)
        
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"CSV file not found: {file_path}")
            
        logger.info(f"Loading CSV file: {file_path}")
        df = pd.read_csv(file_path)
        logger.info(f"Loaded {len(df)} rows from {filename}")
        
        return df
    
    def load_instacart_data(self) -> dict:
        """
        Load all Instacart dataset files
        
        Returns:
            Dictionary containing all loaded dataframes
        """
        files = {
            'orders': 'orders.csv',
            'order_products_prior': 'order_products__prior.csv',
            'order_products_train': 'order_products__train.csv',
            'products': 'products.csv',
            'aisles': 'aisles.csv',
            'departments': 'departments.csv'
        }
        
        data = {}
        for key, filename in files.items():
            try:
                data[key] = self.load_csv(filename)
            except FileNotFoundError as e:
                logger.error(f"Failed to load {key}: {e}")
                raise
                
        return data