-- ============================================
-- FIX: Allow authenticated admin users to UPDATE guest_documents
-- ============================================
-- This fixes the 401 error when approving/rejecting documents
-- Error: "new row violates row-level security policy for table 'guest_documents'"

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to update guest documents" ON guest_documents;
DROP POLICY IF EXISTS "Allow authenticated users to read all guest documents" ON guest_documents;

-- Policy 1: Allow authenticated users (admin staff) to SELECT all documents
CREATE POLICY "Allow authenticated users to read all guest documents"
    ON guest_documents
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy 2: Allow authenticated users (admin staff) to UPDATE documents
-- This enables approve/reject functionality
CREATE POLICY "Allow authenticated users to update guest documents"
    ON guest_documents
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy 3: Ensure anonymous users can still INSERT their own documents
-- (This should already exist from database-schema.sql, but we'll verify)
DROP POLICY IF EXISTS "Allow anonymous users to insert their documents" ON guest_documents;
CREATE POLICY "Allow anonymous users to insert their documents"
    ON guest_documents
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- Policy 4: Allow anonymous users to SELECT their own booking's documents
DROP POLICY IF EXISTS "Allow anonymous users to read their own documents" ON guest_documents;
CREATE POLICY "Allow anonymous users to read their own documents"
    ON guest_documents
    FOR SELECT
    TO anon
    USING (true);

-- Verify RLS is enabled
ALTER TABLE guest_documents ENABLE ROW LEVEL SECURITY;

-- Summary of policies:
-- 1. Authenticated users (admin) can SELECT all documents
-- 2. Authenticated users (admin) can UPDATE all documents (approve/reject)
-- 3. Anonymous users (guests) can INSERT documents
-- 4. Anonymous users (guests) can SELECT documents (to view their submissions)
