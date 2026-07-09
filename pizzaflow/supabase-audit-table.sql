-- SQL Script to create the pizzaflow_order_audit table in Supabase (PostgreSQL)

-- Drop table if it exists
-- DROP TABLE IF EXISTS pizzaflow_order_audit;

CREATE TABLE pizzaflow_order_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    total NUMERIC(10, 2) NOT NULL,
    payment_mode VARCHAR(50) NOT NULL,
    databricks_status VARCHAR(50) NOT NULL, -- 'SUCCESS', 'FAILED', 'PENDING'
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE pizzaflow_order_audit ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public read access (for viewing recent orders) 
-- and service-role write access (or all-authenticated/anon if needed)
-- Since we read it from the client-side to show recent orders, we should allow read to anon/public.
CREATE POLICY "Allow public read access to pizzaflow_order_audit" 
ON pizzaflow_order_audit 
FOR SELECT 
TO public 
USING (true);

-- Since backend inserts use supabaseAdmin (service_role), they bypass RLS.
-- But if we want to allow insert via normal clients, we can do:
-- CREATE POLICY "Allow backend inserts" ON pizzaflow_order_audit FOR INSERT WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_pizzaflow_order_audit_created_at ON pizzaflow_order_audit(created_at DESC);
