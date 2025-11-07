# Guest Portal - ID Submission System

## Overview
A comprehensive guest portal system that allows guests to submit their ID documents for verification before check-in. Staff can review, approve, or reject submissions through the admin panel.

---

## Features Implemented

### 🎫 Guest Portal
- **Secure Access**: Booking ID + Phone number verification
- **Reservation Dashboard**: View booking details and guest list
- **ID Document Upload**: Support for Passport, Driver's License, and Aadhar
- **Multi-Guest Support**: Upload IDs for all guests in the reservation
- **Selfie Verification**: Mandatory for primary guest
- **Document Status Tracking**: Real-time status updates (Pending/Verified/Rejected)
- **Resubmission**: Guests can resubmit rejected documents
- **Mobile Optimized**: PWA with camera capture support
- **Image Compression**: Automatic compression to reduce file size

### 👨‍💼 Staff Management Panel
- **Documents Dashboard**: View all submitted documents
- **Filter & Search**: By status (Pending/Verified/Rejected) and booking ID/guest name
- **Statistics**: Total submissions, pending, verified, and rejected counts
- **Review Modal**: View all document images with zoom functionality
- **Approve/Reject Workflow**: With mandatory rejection reasons
- **Internal Notes**: Staff can add notes to each submission
- **WhatsApp Integration**: Quick links to notify guests
- **CSV Export**: Export document data for record-keeping
- **Retention Alerts**: Warning when documents are near 60-day deletion

---

## Setup Instructions

### 1. Database Setup

Execute the SQL schema in your Supabase SQL Editor:

```bash
# Run the SQL file in Supabase
cat guest_documents_schema.sql
```

Key components:
- **Table**: `guest_documents` with all required fields
- **Indexes**: For fast lookups by booking_id, status, retention_date
- **RLS Policies**: Row-level security for guest and staff access
- **Triggers**: Auto-calculate 60-day retention date
- **Stats View**: Pre-aggregated statistics

### 2. Supabase Storage Setup

Create a new storage bucket:

1. Go to Supabase Dashboard → Storage → Create bucket
2. **Bucket Name**: `guest-id-documents`
3. **Public**: No (keep private)
4. **File Size Limit**: 5MB
5. **Allowed MIME Types**: image/jpeg, image/png

Add Storage Policies (in Supabase Storage → Policies):

```sql
-- Policy 1: Guests can upload to their own booking folder
CREATE POLICY "Guests can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'guest-id-documents' AND
    (storage.foldername(name))[1] IN (
        SELECT booking_id FROM reservations
        WHERE guest_phone = current_setting('app.guest_phone', true)::text
    )
);

-- Policy 2: Staff can view all documents
CREATE POLICY "Staff can view documents"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'guest-id-documents' AND
    current_setting('app.user_role', true)::text IN ('admin', 'manager', 'staff')
);

-- Policy 3: Staff can delete expired documents
CREATE POLICY "Staff can delete documents"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'guest-id-documents' AND
    current_setting('app.user_role', true)::text IN ('admin', 'manager')
);
```

### 3. Deploy the Application

The changes are already in `index.html`. Simply deploy to your hosting:

```bash
# For Vercel (if using)
vercel --prod

# Or commit and push (already done)
git push origin main
```

---

## Usage Guide

### For Guests

#### Accessing the Portal

**Option 1: Direct Link**
```
https://your-app-url.com/?booking=ABC123
```

**Option 2: From Login Page**
1. Go to your ResIQ app
2. Click "Guest Portal →" link at bottom of login
3. Enter Booking ID and Phone Number
4. Click "Access Portal"

#### Submitting Documents

1. **View Dashboard**: See your reservation details and guest list
2. **Upload Documents**: Click "Upload Documents" for each guest
3. **Fill Form**:
   - Select document type (Passport/Driver's License/Aadhar)
   - Enter document number
   - Capture or upload front side image
   - Capture or upload back side (for Aadhar/DL)
   - Take selfie (primary guest only)
4. **Submit**: Wait for upload to complete
5. **Check Status**: Document status will show as "Pending Review"

#### After Submission

- **Verified**: ✅ Green badge - Document approved
- **Pending**: ⏳ Yellow badge - Awaiting staff review
- **Rejected**: ❌ Red badge - Needs resubmission (see reason)

### For Staff

#### Accessing Documents

1. **Login** to ResIQ admin panel
2. **Navigate**: Click "📄 Documents" in navigation
3. **Dashboard loads** with statistics

#### Reviewing Documents

1. **Filter**: Use status filters (Pending/Verified/Rejected)
2. **Search**: By booking ID or guest name
3. **Click Card**: Opens review modal
4. **View Images**: Click images to open full size in new tab
5. **Add Notes**: Internal notes for your team
6. **Actions**:
   - ✅ **Approve**: Mark as verified
   - ❌ **Reject**: Provide rejection reason
   - 💬 **WhatsApp**: Send notification to guest
7. **Close**: Changes saved immediately

#### Best Practices

- **Review within 24 hours** of submission
- **Provide clear rejection reasons** so guests can correct issues
- **Use internal notes** to communicate with team
- **Export regularly** for compliance records
- **Monitor retention dates** for upcoming deletions

---

## Technical Architecture

### Guest Portal Flow

```
Guest enters Booking ID + Phone
    ↓
Verify against reservations table
    ↓
Load guest documents for booking
    ↓
Display dashboard with guest list
    ↓
Guest uploads document
    ↓
Compress image (1200px max, 85% quality)
    ↓
Upload to Supabase Storage
    ↓
Save metadata to guest_documents table
    ↓
Set retention_date = submitted_at + 60 days
```

### Staff Review Flow

```
Load all guest_documents
    ↓
Display with filters/search
    ↓
Staff clicks document
    ↓
Generate signed URLs for images (1hr expiry)
    ↓
Display review modal
    ↓
Staff approves/rejects
    ↓
Update status + verified_by + timestamp
    ↓
Reload documents list
```

### Security Implementation

1. **Guest Access**:
   - Session stored in `sessionStorage` (1-hour expiry)
   - Can only view/submit for their booking
   - Phone number must match reservation

2. **Staff Access**:
   - Full admin authentication required
   - RLS policies enforce staff role check
   - Can view/update all documents

3. **Storage**:
   - Private bucket (no public URLs)
   - Signed URLs with 1-hour expiry
   - Path structure: `{booking_id}/{guest_name}/{timestamp}_{type}.jpg`

4. **Data Retention**:
   - Auto-calculated 60-day retention
   - Warning shown 7 days before deletion
   - Manual deletion by staff required

---

## Document Types & Validation

### Passport
- **Front Side**: Required
- **Back Side**: Not required
- **Selfie**: Required for primary guest
- **Document Number**: Required

### Driver's License
- **Front Side**: Required
- **Back Side**: Required
- **Selfie**: Required for primary guest
- **Document Number**: Required

### Aadhar Card
- **Front Side**: Required
- **Back Side**: Required
- **Selfie**: Required for primary guest
- **Document Number**: Required (12 digits)

### Validation Rules
- **Image Size**: Max 5MB per image
- **Image Format**: JPEG, JPG, PNG
- **Compression**: Auto-compressed to max 1200px width
- **Quality**: 85% JPEG quality
- **Guest Count**: Must match reservation (adults + kids)

---

## API Endpoints Used

### Database Queries

```javascript
// Get guest documents
supabase.from('guest_documents')
    .select('*')
    .eq('booking_id', bookingId)
    .order('submitted_at', { ascending: false })

// Insert document
supabase.from('guest_documents')
    .insert([{
        booking_id,
        guest_type,
        guest_name,
        document_type,
        document_number,
        document_front_url,
        document_back_url,
        selfie_url,
        status: 'pending'
    }])

// Approve document
supabase.from('guest_documents')
    .update({
        status: 'verified',
        verified_by: staffEmail,
        verified_at: timestamp,
        notes
    })
    .eq('id', docId)

// Reject document
supabase.from('guest_documents')
    .update({
        status: 'rejected',
        rejection_reason: reason,
        verified_by: staffEmail,
        verified_at: timestamp
    })
    .eq('id', docId)
```

### Storage Operations

```javascript
// Upload image
supabase.storage
    .from('guest-id-documents')
    .upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: false
    })

// Get signed URL
supabase.storage
    .from('guest-id-documents')
    .createSignedUrl(path, 3600) // 1 hour
```

---

## Configuration

### URL Parameters

Guest portal supports these URL parameters:

- `?booking=ABC123` - Pre-fill booking ID
- `?booking_id=ABC123` - Alternative format

Example:
```
https://your-app.com/?booking=ABC123
```

### Session Management

**Guest Sessions**:
- Stored in: `sessionStorage`
- Key: `guestSession`
- Expiry: 1 hour
- Data: `{booking_id, guest_phone, guest_name, expires}`

**Staff Sessions**:
- Uses existing admin authentication
- Stored in: `localStorage` (from existing system)

---

## Maintenance & Operations

### Data Retention Management

Documents are automatically marked for deletion after 60 days. Manual deletion required:

```sql
-- Find expired documents
SELECT * FROM guest_documents
WHERE retention_date < NOW();

-- Delete expired documents (staff only)
-- 1. Delete from storage (manually or via admin)
-- 2. Delete from database
DELETE FROM guest_documents
WHERE retention_date < NOW();
```

### Export Documents

CSV export includes:
- Booking ID
- Guest Name
- Guest Type (Primary/Additional)
- Document Type
- Document Number
- Status
- Submitted Date
- Retention Date
- Rejection Reason (if any)

### Statistics View

Pre-aggregated stats available:

```sql
SELECT * FROM guest_documents_stats;
```

Returns:
- Total submissions
- Pending count
- Verified count
- Rejected count
- Primary guests count
- Additional guests count
- Expired documents count
- Submissions today

---

## Troubleshooting

### Guest Portal Issues

**Problem**: "Booking not found"
- **Solution**: Verify booking ID and phone number match exactly
- Check if phone includes country code or not

**Problem**: "Upload failed"
- **Solution**: Check image size (< 5MB)
- Check internet connection
- Try different image format

**Problem**: "Selfie not required"
- **Solution**: This is correct for additional guests (only primary needs selfie)

### Staff Panel Issues

**Problem**: "Failed to load documents"
- **Solution**: Check Supabase connection
- Verify guest_documents table exists
- Check RLS policies are enabled

**Problem**: "Images not loading"
- **Solution**: Check storage bucket exists
- Verify signed URL generation
- Check storage policies

**Problem**: "Cannot approve/reject"
- **Solution**: Verify staff role in database
- Check RLS policies for updates

---

## Mobile App Features

### PWA Capabilities

- **Offline Ready**: Service worker caches app shell
- **Installable**: Add to home screen
- **Camera Access**: Direct camera capture for images
- **Responsive**: Mobile-first design
- **Fast**: Optimized for mobile networks

### Camera Permissions

The app requests camera permissions for:
- Document front/back capture
- Selfie verification

On iOS: Settings → Safari → Camera
On Android: Settings → Apps → [Browser] → Permissions → Camera

---

## Future Enhancements (Optional)

### Potential Features
1. **OCR Integration**: Auto-extract document numbers from images
2. **Face Matching**: Verify selfie matches ID photo
3. **Real-time Notifications**: Push notifications for status changes
4. **QR Code Access**: Generate QR codes for easy guest access
5. **Multi-language Support**: Hindi, regional languages
6. **Auto-deletion**: Scheduled job to delete expired documents
7. **Document Templates**: Pre-filled forms based on document type
8. **Bulk Approval**: Approve multiple documents at once
9. **Analytics Dashboard**: Document submission trends
10. **Email Notifications**: Alternative to WhatsApp

---

## Support & Contact

For issues or questions:

1. **Database Issues**: Check Supabase dashboard logs
2. **Storage Issues**: Verify bucket permissions
3. **UI Issues**: Check browser console for errors
4. **Feature Requests**: Create GitHub issue

---

## File Structure

```
hostizzy-pwa/
├── index.html                          # Main application (modified)
├── guest_documents_schema.sql          # Database schema
├── GUEST_PORTAL_README.md             # This file
├── manifest.json                       # PWA manifest
├── sw.js                              # Service worker
└── assets/
    └── logo.png                       # App logo
```

---

## Version History

### v1.0.0 (Current)
- ✅ Guest portal with ID submission
- ✅ Staff review panel
- ✅ Image compression
- ✅ WhatsApp integration
- ✅ 60-day retention system
- ✅ Mobile PWA support
- ✅ Offline capabilities

---

## License & Credits

Part of ResIQ by Hostizzy - Property Management System

© 2025 Hostizzy. All rights reserved.
