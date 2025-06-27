-- Add instacart_product_id to products table
ALTER TABLE products ADD COLUMN instacart_product_id INTEGER;
CREATE INDEX idx_products_instacart_id ON products(instacart_product_id);

-- Update existing products to extract ID from SKU
UPDATE products 
SET instacart_product_id = CAST(SUBSTRING(sku FROM 'CSV(\d+)') AS INTEGER)
WHERE sku LIKE 'CSV%';