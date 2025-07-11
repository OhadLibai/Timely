# database/populate_db.py
"""
Database Population Script
Seeds the database with Instacart products and categories.
Uses Instacart IDs as primary keys
"""

import os
import pandas as pd
import numpy as np
from datetime import datetime
import psycopg2
from psycopg2.pool import SimpleConnectionPool
import json

# Database configuration
DATABASE_CONFIG = {
    'host': 'localhost',  # Connect locally within container
    'port': 5432,
    'database': 'timely_db',
    'user': 'timely_user',
    'password': 'timely_password'
}

# Data paths - Updated for new structure
DATA_PATH = '/shared/dataset'  # Shared volume mount
CATEGORY_DETAILS_PATH = '/app/category_details.csv'  # Local to container

# Price ranges by department (in dollars)
PRICE_RANGES = {
    'produce': (0.49, 5.99),
    'dairy eggs': (1.99, 8.99),
    'snacks': (0.99, 6.99),
    'beverages': (0.99, 9.99),
    'frozen': (2.99, 12.99),
    'pantry': (1.49, 7.99),
    'bakery': (1.99, 8.99),
    'canned goods': (0.99, 4.99),
    'deli': (3.99, 14.99),
    'dry goods pasta': (1.49, 5.99),
    'meat seafood': (4.99, 24.99),
    'breakfast': (2.99, 9.99),
    'international': (1.99, 12.99),
    'alcohol': (4.99, 39.99),
    'pets': (2.99, 19.99),
    'household': (1.99, 14.99),
    'personal care': (1.99, 19.99),
    'babies': (3.99, 24.99),
    'missing': (1.99, 9.99),
    'other': (1.99, 9.99),
    'bulk': (9.99, 49.99)
}


class DatabasePopulator:
    def __init__(self):
        self.pool = SimpleConnectionPool(1, 5, **DATABASE_CONFIG)
        
    def get_connection(self):
        return self.pool.getconn()
    
    def put_connection(self, conn):
        self.pool.putconn(conn)
        
    def load_csv_data(self):
        """Load all necessary CSV files"""
        print("Loading CSV data...")
        
        # Load Instacart data from shared dataset volume
        self.departments = pd.read_csv(os.path.join(DATA_PATH, 'departments.csv'))
        self.aisles = pd.read_csv(os.path.join(DATA_PATH, 'aisles.csv'))
        self.products = pd.read_csv(os.path.join(DATA_PATH, 'products.csv'))
        
        # Load category details from local container path
        self.category_details = pd.read_csv(CATEGORY_DETAILS_PATH)
        
        # Create department name to image URL mapping for products
        self.image_map = {}
        for _, row in self.category_details.iterrows():
            dept_name = row['department_name'].lower()
            self.image_map[dept_name] = row['imageUrl']
        
        print(f"Loaded {len(self.departments)} departments")
        print(f"Loaded {len(self.aisles)} aisles")
        print(f"Loaded {len(self.products)} products")
        
    def generate_price(self, department_name):
        """Generate a realistic price based on department"""
        dept_lower = department_name.lower()
        price_range = PRICE_RANGES.get(dept_lower, (1.99, 9.99))
        
        # Generate price with common retail patterns
        base_price = np.random.uniform(price_range[0], price_range[1])
        
        # Round to common price endings (.99, .49, .79)
        endings = [0.99, 0.49, 0.79, 0.29]
        price = int(base_price) + np.random.choice(endings)
        
        # Ensure within range
        return max(price_range[0], min(price, price_range[1]))
    
    def populate_categories(self):
        """Populate categories from departments"""
        print("\nPopulating categories...")
        
        conn = self.get_connection()
        cur = conn.cursor()
        
        try:
            for _, dept in self.departments.iterrows():
                dept_name_lower = dept['department'].lower()
                
                # Get image URL or use placeholder
                image_url = self.image_map.get(dept_name_lower, '/images/categories/default.jpg')
                
                # Get description from category_details
                desc_row = self.category_details[
                    self.category_details['department_name'].str.lower() == dept_name_lower
                ]
                description = desc_row['description'].iloc[0] if not desc_row.empty else f"Quality {dept['department']} products"
                
                cur.execute("""
                    INSERT INTO categories (department_id, name, description, image_url, is_active)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (department_id) DO NOTHING
                """, (
                    int(dept['department_id']),
                    dept['department'].title(),
                    description,
                    image_url,
                    True
                ))
            
            conn.commit()
            print(f"Created {len(self.departments)} categories")
            
        finally:
            cur.close()
            self.put_connection(conn)
    
    def populate_products(self):
        """Populate products from Instacart data"""
        print("\nPopulating products...")
        
        conn = self.get_connection()
        cur = conn.cursor()
        
        try:
            # Merge products with aisles and departments
            products_full = self.products.merge(
                self.aisles, on='aisle_id', how='left'
            ).merge(
                self.departments, on='department_id', how='left'
            )
            
            batch_size = 1000
            total_products = len(products_full)
            
            for i in range(0, total_products, batch_size):
                batch = products_full.iloc[i:i+batch_size]
                
                for _, product in batch.iterrows():
                    # Get department name
                    dept_name = product.get('department', 'other')
                    
                    # Generate price based on department
                    price = self.generate_price(dept_name)
                    
                    # Extract brand from product name if possible
                    product_name = product['product_name']
                    brand = 'Generic'
                    
                    # Common brand patterns
                    if ' - ' in product_name:
                        brand = product_name.split(' - ')[0]
                    elif product_name.startswith(('Organic ', 'Fresh ', 'Frozen ')):
                        brand = product_name.split()[0]
                    
                    # Use department image for product (inherit from category)
                    image_url = self.image_map.get(dept_name.lower(), '/images/categories/default.jpg')
                    
                    cur.execute("""
                        INSERT INTO products (
                            instacart_product_id, name, description, price, unit, brand, 
                            image_url, department_id, aisle_id, aisle_name, is_active
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (instacart_product_id) DO NOTHING
                    """, (
                        int(product['product_id']),
                        product_name,
                        f"Fresh {product.get('aisle', 'quality')} - {product_name}",
                        float(price),
                        'each',
                        brand[:255],  # Truncate if too long
                        image_url,
                        int(product['department_id']),
                        int(product['aisle_id']),
                        product.get('aisle', ''),
                        True
                    ))
                
                if i % 5000 == 0:
                    conn.commit()
                    print(f"Progress: {min(i + batch_size, total_products)}/{total_products} products")
            
            conn.commit()
            print(f"Created {total_products} products")
            
        finally:
            cur.close()
            self.put_connection(conn)
    
    def run(self):
        """Run the complete population process"""
        print("="*60)
        print("TIMELY DATABASE POPULATION")
        print("="*60)
        
        try:
            # Check if already populated
            conn = self.get_connection()
            cur = conn.cursor()
            cur.execute("SELECT COUNT(*) FROM products")
            count = cur.fetchone()[0]
            cur.close()
            self.put_connection(conn)
            
            if count > 0:
                print(f"\nDatabase already has {count} products. Skipping population.")
                return
            
            # Load data
            self.load_csv_data()
            
            # Populate in order
            self.populate_categories()
            self.populate_products()
            
            print("\n✅ Database population complete!")
            
        except Exception as e:
            print(f"\n❌ Error during population: {e}")
            raise
        finally:
            self.pool.closeall()


if __name__ == "__main__":
    populator = DatabasePopulator()
    populator.run()