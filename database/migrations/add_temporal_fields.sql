-- database/migrations/add_temporal_fields.sql
-- CRITICAL: Add temporal fields required by TIFU-KNN model

-- Check if columns already exist before adding
DO $$ 
BEGIN
    -- Add days_since_prior_order if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'days_since_prior_order'
    ) THEN
        ALTER TABLE orders 
        ADD COLUMN days_since_prior_order DECIMAL(10,2) DEFAULT 0;
    END IF;

    -- Add order_dow (day of week) if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'order_dow'
    ) THEN
        ALTER TABLE orders 
        ADD COLUMN order_dow INTEGER NOT NULL DEFAULT 0 
        CHECK (order_dow >= 0 AND order_dow <= 6);
        COMMENT ON COLUMN orders.order_dow IS 'Day of week: 0=Monday, 6=Sunday';
    END IF;

    -- Add order_hour_of_day if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'order_hour_of_day'
    ) THEN
        ALTER TABLE orders 
        ADD COLUMN order_hour_of_day INTEGER NOT NULL DEFAULT 10 
        CHECK (order_hour_of_day >= 0 AND order_hour_of_day <= 23);
        COMMENT ON COLUMN orders.order_hour_of_day IS 'Hour of day: 0-23';
    END IF;
END $$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_temporal ON orders(order_dow, order_hour_of_day);
CREATE INDEX IF NOT EXISTS idx_orders_days_since ON orders(days_since_prior_order);

-- Update existing orders with temporal data if missing
-- This sets reasonable defaults for any existing orders
UPDATE orders 
SET 
    order_dow = EXTRACT(DOW FROM created_at)::INTEGER,
    order_hour_of_day = EXTRACT(HOUR FROM created_at)::INTEGER
WHERE order_dow IS NULL OR order_hour_of_day IS NULL;

-- Add comment to explain the temporal fields
COMMENT ON COLUMN orders.days_since_prior_order IS 'Days elapsed since user''s previous order - critical for TIFU-KNN temporal modeling';

-- Verify the changes
DO $$
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_name = 'orders' 
    AND column_name IN ('days_since_prior_order', 'order_dow', 'order_hour_of_day');
    
    IF col_count = 3 THEN
        RAISE NOTICE 'SUCCESS: All temporal fields added to orders table';
    ELSE
        RAISE EXCEPTION 'ERROR: Not all temporal fields were added. Found % fields', col_count;
    END IF;
END $$;