-- database/migrations/ensure_user_metadata.sql
-- CRITICAL: Ensure users table has metadata JSONB field for storing instacart_user_id

-- Check if metadata column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE users 
        ADD COLUMN metadata JSONB DEFAULT '{}';
        
        COMMENT ON COLUMN users.metadata IS 'Stores additional user data including instacart_user_id for demo users';
        
        -- Create index for better query performance on metadata
        CREATE INDEX IF NOT EXISTS idx_users_metadata_instacart_id 
        ON users ((metadata->>'instacart_user_id')) 
        WHERE metadata->>'instacart_user_id' IS NOT NULL;
        
        RAISE NOTICE 'Added metadata column to users table';
    ELSE
        RAISE NOTICE 'Metadata column already exists in users table';
    END IF;
END $$;

-- Add other critical fields if missing
DO $$
BEGIN
    -- Add last_login_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'last_login_at'
    ) THEN
        ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP;
    END IF;
    
    -- Add reset_password_token if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'reset_password_token'
    ) THEN
        ALTER TABLE users ADD COLUMN reset_password_token VARCHAR(255);
    END IF;
    
    -- Add reset_password_expires if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'reset_password_expires'
    ) THEN
        ALTER TABLE users ADD COLUMN reset_password_expires TIMESTAMP;
    END IF;
END $$;

-- Verify the metadata field can store instacart_user_id
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Create a test user to verify metadata works
    INSERT INTO users (
        id,
        email,
        password,
        first_name,
        last_name,
        role,
        metadata
    ) VALUES (
        gen_random_uuid(),
        'metadata_test_' || extract(epoch from now()) || '@test.com',
        'test_password_hash',
        'Test',
        'User',
        'user',
        '{"instacart_user_id": "12345", "source": "test"}'::jsonb
    ) RETURNING id INTO test_user_id;
    
    -- Verify we can query by instacart_user_id
    IF EXISTS (
        SELECT 1 FROM users 
        WHERE metadata->>'instacart_user_id' = '12345'
        AND id = test_user_id
    ) THEN
        RAISE NOTICE 'SUCCESS: Metadata field properly stores instacart_user_id';
    ELSE
        RAISE EXCEPTION 'ERROR: Cannot query instacart_user_id from metadata';
    END IF;
    
    -- Clean up test user
    DELETE FROM users WHERE id = test_user_id;
END $$;

-- Create or update PredictedBasket tables if they don't exist
CREATE TABLE IF NOT EXISTS predicted_baskets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_of TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'generated' CHECK (status IN ('generated', 'modified', 'accepted', 'rejected')),
    confidence_score DECIMAL(3,2) DEFAULT 0.75,
    accepted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS predicted_basket_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    basket_id UUID NOT NULL REFERENCES predicted_baskets(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    confidence_score DECIMAL(3,2) DEFAULT 0.80,
    is_accepted BOOLEAN DEFAULT true,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_predicted_baskets_user_status 
ON predicted_baskets(user_id, status);

CREATE INDEX IF NOT EXISTS idx_predicted_basket_items_basket 
ON predicted_basket_items(basket_id);

-- Grant permissions if needed
GRANT ALL ON predicted_baskets TO timely_user;
GRANT ALL ON predicted_basket_items TO timely_user;