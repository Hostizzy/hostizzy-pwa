-- Guest Documents Database Schema
-- Execute this in Supabase SQL Editor

-- Create guest_documents table
CREATE TABLE IF NOT EXISTS guest_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id TEXT NOT NULL,
    guest_type TEXT NOT NULL CHECK (guest_type IN ('primary', 'additional')),
    guest_name TEXT NOT NULL,
    guest_relation TEXT, -- For additional guests: 'spouse', 'child', 'friend', 'parent', 'sibling', 'other'
    document_type TEXT NOT NULL CHECK (document_type IN ('passport', 'drivers_license', 'aadhar')),
    document_number TEXT NOT NULL,
    document_front_url TEXT NOT NULL,
    document_back_url TEXT, -- For two-sided IDs (Aadhar, DL)
    selfie_url TEXT, -- Only for primary guest
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    retention_date TIMESTAMP WITH TIME ZONE, -- Auto-calculated: submitted_at + 60 days
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
    verified_by TEXT, -- team_member email
    verified_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    notes TEXT
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_guest_docs_booking ON guest_documents(booking_id);
CREATE INDEX IF NOT EXISTS idx_guest_docs_status ON guest_documents(status);
CREATE INDEX IF NOT EXISTS idx_guest_docs_retention ON guest_documents(retention_date);
CREATE INDEX IF NOT EXISTS idx_guest_docs_submitted ON guest_documents(submitted_at);

-- Create trigger to auto-calculate retention_date (60 days from submission)
CREATE OR REPLACE FUNCTION set_retention_date()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.retention_date IS NULL THEN
        NEW.retention_date := NEW.submitted_at + INTERVAL '60 days';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_retention_date
    BEFORE INSERT ON guest_documents
    FOR EACH ROW
    EXECUTE FUNCTION set_retention_date();

-- Create Supabase Storage Bucket (Run these in Supabase Storage UI or via API)
-- Bucket name: guest-id-documents
-- Public: false (private bucket)
-- File size limit: 5MB
-- Allowed MIME types: image/jpeg, image/png, image/jpg

-- Row Level Security Policies

-- Enable RLS
ALTER TABLE guest_documents ENABLE ROW LEVEL SECURITY;

-- Policy 1: Guests can insert documents for their own booking
CREATE POLICY "Guests can insert own documents"
    ON guest_documents
    FOR INSERT
    WITH CHECK (
        booking_id IN (
            SELECT booking_id
            FROM reservations
            WHERE guest_phone = current_setting('app.guest_phone', true)::text
        )
    );

-- Policy 2: Guests can view only their own documents
CREATE POLICY "Guests can view own documents"
    ON guest_documents
    FOR SELECT
    USING (
        booking_id IN (
            SELECT booking_id
            FROM reservations
            WHERE guest_phone = current_setting('app.guest_phone', true)::text
        )
    );

-- Policy 3: Staff can view all documents
CREATE POLICY "Staff can view all documents"
    ON guest_documents
    FOR SELECT
    USING (
        current_setting('app.user_role', true)::text IN ('admin', 'manager', 'staff')
    );

-- Policy 4: Staff can update (verify/reject) documents
CREATE POLICY "Staff can update documents"
    ON guest_documents
    FOR UPDATE
    USING (
        current_setting('app.user_role', true)::text IN ('admin', 'manager', 'staff')
    );

-- Policy 5: Only staff can delete documents
CREATE POLICY "Staff can delete documents"
    ON guest_documents
    FOR DELETE
    USING (
        current_setting('app.user_role', true)::text IN ('admin', 'manager')
    );

-- Grant permissions
GRANT ALL ON guest_documents TO authenticated;
GRANT ALL ON guest_documents TO anon;

-- Storage Policies (for guest-id-documents bucket)
-- Note: These need to be created in Supabase Storage > Policies UI

/*
Policy Name: "Guests can upload their own documents"
Allowed operations: INSERT
Target roles: anon, authenticated
USING expression:
bucket_id = 'guest-id-documents' AND
(storage.foldername(name))[1] IN (
    SELECT booking_id FROM reservations
    WHERE guest_phone = current_setting('app.guest_phone', true)::text
)

Policy Name: "Staff can view all documents"
Allowed operations: SELECT
Target roles: authenticated
USING expression:
bucket_id = 'guest-id-documents' AND
current_setting('app.user_role', true)::text IN ('admin', 'manager', 'staff')

Policy Name: "Staff can delete old documents"
Allowed operations: DELETE
Target roles: authenticated
USING expression:
bucket_id = 'guest-id-documents' AND
current_setting('app.user_role', true)::text IN ('admin', 'manager')
*/

-- Create view for staff to see document statistics
CREATE OR REPLACE VIEW guest_documents_stats AS
SELECT
    COUNT(*) as total_submissions,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE status = 'verified') as verified_count,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
    COUNT(*) FILTER (WHERE guest_type = 'primary') as primary_guests,
    COUNT(*) FILTER (WHERE guest_type = 'additional') as additional_guests,
    COUNT(*) FILTER (WHERE retention_date < NOW()) as expired_documents,
    COUNT(*) FILTER (WHERE submitted_at > NOW() - INTERVAL '24 hours') as submissions_today
FROM guest_documents;

-- Grant access to stats view
GRANT SELECT ON guest_documents_stats TO authenticated;

-- Sample query to check document counts per booking
-- SELECT booking_id, COUNT(*) as doc_count,
--        COUNT(*) FILTER (WHERE status = 'verified') as verified_count
-- FROM guest_documents
-- GROUP BY booking_id;

COMMENT ON TABLE guest_documents IS 'Stores guest ID documents uploaded via guest portal. Auto-deleted 60 days after submission.';
COMMENT ON COLUMN guest_documents.guest_type IS 'primary = main booker, additional = other guests in reservation';
COMMENT ON COLUMN guest_documents.retention_date IS 'Automatically set to 60 days from submission. Documents should be deleted after this date.';
COMMENT ON COLUMN guest_documents.document_type IS 'passport, drivers_license, or aadhar only';
COMMENT ON COLUMN guest_documents.selfie_url IS 'Mandatory for primary guest only, optional for additional guests';
