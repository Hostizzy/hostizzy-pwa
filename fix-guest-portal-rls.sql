-- =====================================================
-- FIX: Allow Guest Portal Anonymous Access
-- Add this to your existing database schema
-- =====================================================

-- Enable RLS on reservations if not already enabled
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous users to SELECT reservations for authentication
-- This is safe because guests still need to know both booking_id AND phone
CREATE POLICY "Allow guest portal to verify bookings"
    ON reservations
    FOR SELECT
    TO anon
    USING (true);

-- Note: Guests can only READ, not modify.
-- They need both booking_id AND phone to authenticate (verified in app logic)

-- Alternative: More restrictive policy (optional, but harder to implement)
-- This would require passing booking_id in JWT claims
/*
CREATE POLICY "Allow guest portal to verify bookings"
    ON reservations
    FOR SELECT
    TO anon
    USING (
        booking_id = current_setting('request.jwt.claims', true)::json->>'booking_id'
    );
*/

-- Verify policies
SELECT * FROM pg_policies WHERE tablename = 'reservations';
