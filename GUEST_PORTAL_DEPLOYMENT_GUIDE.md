# 🚀 Hostizzy Guest Portal - Complete Deployment Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Database Setup](#database-setup)
4. [File Structure](#file-structure)
5. [Integration Steps](#integration-steps)
6. [Deployment](#deployment)
7. [Google Play Store Publishing](#google-play-store-publishing)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This guest portal system allows guests to:
- Authenticate using Booking ID + Phone number
- Submit ID documents for all guests in their reservation
- Upload photos (with camera/file support)
- Track submission status

Staff can:
- Review submitted documents
- Approve/reject submissions
- Send WhatsApp reminders
- Track document status

---

## ✅ Prerequisites

### Required Accounts & Tools
- ✅ Supabase account (free tier works)
- ✅ Domain with HTTPS (required for PWA)
- ✅ Google Play Console account ($25 one-time fee)
- ✅ Node.js 16+ (for TWA build)
- ✅ Java JDK 11+ (for Android build)

### Domain Setup
Your guest portal needs its own subdomain or path:
- Option 1: `guest.hostizzy.com` (recommended)
- Option 2: `hostizzy.com/guest-portal.html`

---

## 🗄️ Database Setup

### Step 1: Run SQL Schema

1. Open Supabase SQL Editor: https://app.supabase.com/project/YOUR_PROJECT/sql
2. Copy contents of `database-schema.sql`
3. Execute the entire SQL script
4. Verify tables created:
   - `guest_documents`
   - `reservation_document_status` (view)

### Step 2: Create Storage Bucket

1. Go to Storage in Supabase Dashboard
2. Create new bucket: `guest-id-documents`
3. Settings:
   - ✅ Private bucket
   - ✅ 5MB file size limit
   - ✅ Allowed MIME types: `image/jpeg`, `image/jpg`, `image/png`

### Step 3: Test RLS Policies

Run this test query:
```sql
-- Test guest document insert
INSERT INTO guest_documents (
    booking_id, guest_type, guest_sequence, guest_name, guest_age, status
) VALUES (
    'BK-TEST-001', 'primary', 1, 'Test Guest', 30, 'pending'
);

-- Verify
SELECT * FROM guest_documents WHERE booking_id = 'BK-TEST-001';

-- Cleanup
DELETE FROM guest_documents WHERE booking_id = 'BK-TEST-001';
```

---

## 📁 File Structure

```
/home/user/hostizzy-pwa/
├── index.html                          # Admin panel (MODIFIED)
├── guest-portal.html                   # NEW - Guest-facing portal
├── guest-manifest.json                 # NEW - Guest portal manifest
├── guest-sw.js                         # NEW - Guest portal service worker
├── manifest.json                       # Existing admin manifest
├── sw.js                               # Existing admin service worker
├── database-schema.sql                 # NEW - Database setup
├── guest-documents-functions.js        # NEW - JS functions to integrate
├── GUEST_PORTAL_DEPLOYMENT_GUIDE.md    # This file
└── assets/
    ├── logo-192.png
    ├── logo-512-maskable.png
    └── logo.png
```

---

## 🔧 Integration Steps

### Step 1: Integrate JavaScript Functions

1. Open `guest-documents-functions.js`
2. Copy all functions
3. Open `index.html`
4. Find the `<script>` section (around line 3145)
5. Paste the functions BEFORE the closing `</script>` tag

### Step 2: Update showView Function

Find your `showView()` function and add:

```javascript
function showView(viewName) {
    // ... existing code to hide all views ...

    document.getElementById(viewName + 'View').classList.remove('hidden');

    // ADD THIS:
    if (viewName === 'guestDocuments') {
        loadGuestDocuments();
    }

    // ... rest of code ...
}
```

### Step 3: Update Home Stats Loading

Find where you load home statistics and add:

```javascript
async function loadHomeStats() {
    // ... existing stats code ...

    // ADD THIS:
    await loadGuestDocuments(); // This updates homeStatDocuments
}
```

### Step 4: Update Service Worker Registration

In `guest-portal.html`, the service worker is registered. Update the path if needed:

```javascript
// Around line 700 in guest-portal.html
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/guest-sw.js')
        .then(reg => console.log('Service Worker registered'))
        .catch(err => console.error('SW registration failed', err));
}
```

---

## 🌐 Deployment

### Option A: Same Domain (Easiest)

1. Upload files to your hosting:
   ```bash
   # Upload to your web server
   /public_html/
   ├── index.html
   ├── guest-portal.html
   ├── guest-manifest.json
   ├── guest-sw.js
   └── assets/
   ```

2. Test URLs:
   - Admin: `https://yourdomain.com/index.html`
   - Guest: `https://yourdomain.com/guest-portal.html`

### Option B: Subdomain (Recommended)

1. Create DNS record:
   - Type: `A` or `CNAME`
   - Name: `guest`
   - Value: Your server IP / domain

2. Create separate directory:
   ```bash
   /public_html/guest/
   ├── index.html (rename guest-portal.html to index.html)
   ├── guest-manifest.json → manifest.json
   ├── guest-sw.js → sw.js
   └── assets/ (symlink or copy from main)
   ```

3. Update manifest.json:
   ```json
   {
     "start_url": "/",
     "scope": "/"
   }
   ```

4. Test URL:
   - `https://guest.yourdomain.com`

### Option C: Vercel / Netlify

1. Create new site for guest portal
2. Upload only guest portal files
3. Configure custom domain
4. Deploy

---

## 📱 Google Play Store Publishing

### Phase 1: Prepare Assets (Week 1-2)

#### 1. Create App Icons

Required sizes:
- **512x512** - High-res icon (PNG, 32-bit, no alpha)
- **192x192** - Standard icon
- **Adaptive icon** - 108x108dp safe zone

Use your existing `logo.png` (512x512) as base.

#### 2. Create Screenshots

Take screenshots on actual Android devices:
- **Phone screenshots**: Minimum 2, maximum 8
  - Resolution: 1080x1920 or higher
  - Must show actual app in use
  - No chrome/browser UI

- **7-inch tablet** (optional but recommended)
- **10-inch tablet** (optional)

#### 3. Prepare Store Listing

**App name**: Hostizzy Guest Portal (max 50 characters)

**Short description** (max 80 characters):
```
Submit your ID documents securely for your Hostizzy vacation rental
```

**Full description** (max 4000 characters):
```
Hostizzy Guest Portal

Submit your identification documents quickly and securely for your vacation rental booking.

FEATURES:
✓ Secure Authentication - Access with Booking ID + Phone verification
✓ Multi-Guest Support - Submit IDs for all guests in your party
✓ Photo Capture - Take photos directly or upload existing files
✓ Real-time Status - Track verification status of your documents
✓ Privacy First - Auto-delete after 60 days

EASY 3-STEP PROCESS:
1. Enter your booking ID and phone number
2. Upload ID photos for each guest
3. Wait for staff verification

SUPPORTED ID TYPES:
• Aadhar Card
• Passport
• Driver's License
• Voter ID

DATA SECURITY:
Your documents are encrypted and stored securely. All documents are automatically deleted 60 days after submission per our privacy policy.

NEED HELP?
Contact the property directly through the app if you have questions about your booking or ID submission.

---

Hostizzy ResIQ - Professional Vacation Rental Management
```

### Phase 2: Build TWA (Trusted Web Activity) App

#### 1. Install Bubblewrap CLI

```bash
# Install Node.js dependencies
npm install -g @bubblewrap/cli

# Verify installation
bubblewrap --version
```

#### 2. Initialize Project

```bash
# Navigate to your project directory
cd /home/user/hostizzy-pwa

# Initialize TWA
bubblewrap init --manifest https://guest.yourdomain.com/guest-manifest.json

# Follow the prompts:
# - App name: Hostizzy Guest Portal
# - Package name: com.hostizzy.guest
# - Host: guest.yourdomain.com
# - Start URL: /
# - Theme color: #1a73e8
# - Background color: #ffffff
# - Icon URL: https://guest.yourdomain.com/assets/logo-512-maskable.png
```

This creates `twa-manifest.json`:
```json
{
  "packageId": "com.hostizzy.guest",
  "host": "guest.yourdomain.com",
  "name": "Hostizzy Guest Portal",
  "launcherName": "Hostizzy Guest",
  "display": "standalone",
  "themeColor": "#1a73e8",
  "backgroundColor": "#ffffff",
  "startUrl": "/",
  "iconUrl": "https://guest.yourdomain.com/assets/logo-512-maskable.png",
  "maskableIconUrl": "https://guest.yourdomain.com/assets/logo-512-maskable.png",
  "shortcuts": [],
  "webManifestUrl": "https://guest.yourdomain.com/guest-manifest.json",
  "enableSiteSettingsShortcut": true,
  "orientation": "portrait"
}
```

#### 3. Set Up Digital Asset Links

This proves you own the domain.

Create `/.well-known/assetlinks.json` on your server:

```bash
# Generate fingerprint first (after building)
keytool -list -v -keystore android.keystore -alias android

# The SHA256 fingerprint will be something like:
# A1:B2:C3:D4:...
```

Then create the file:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.hostizzy.guest",
    "sha256_cert_fingerprints": [
      "YOUR_SHA256_FINGERPRINT_HERE"
    ]
  }
}]
```

Upload to: `https://guest.yourdomain.com/.well-known/assetlinks.json`

Test: https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://guest.yourdomain.com

#### 4. Build APK

```bash
# Build the Android package
bubblewrap build

# This creates:
# - app-release-signed.apk (for testing)
# - app-release-bundle.aab (for Play Store)
```

If you get keystore errors:
```bash
# Create keystore
keytool -genkey -v -keystore android.keystore -alias android -keyalg RSA -keysize 2048 -validity 10000

# Use the keystore
bubblewrap build --keystore android.keystore --keystore-alias android
```

#### 5. Test APK Locally

```bash
# Install on connected Android device
adb install app-release-signed.apk

# Or upload to device and install manually
```

Test checklist:
- [ ] App launches in fullscreen (no browser chrome)
- [ ] Authentication works
- [ ] Camera permissions work
- [ ] File upload works
- [ ] Images compress properly
- [ ] App works offline (cached shell)
- [ ] Deep links work (`hostizzy://`)

### Phase 3: Submit to Play Store (Week 3-4)

#### 1. Create App in Play Console

1. Go to https://play.google.com/console
2. Click "Create app"
3. Fill in:
   - App name: **Hostizzy Guest Portal**
   - Default language: **English (United States)**
   - App/Game: **App**
   - Free/Paid: **Free**
   - Declarations: Check all boxes

#### 2. Complete Store Listing

**Main Store Listing** → **Store settings**:
- App name: Hostizzy Guest Portal
- Short description: (see above)
- Full description: (see above)
- App icon: 512x512 PNG
- Feature graphic: 1024x500 (create a banner)
- Phone screenshots: Upload 2-8
- Category: **Travel & Local** or **Productivity**
- Email: your-support@email.com
- Privacy policy URL: https://yourdomain.com/privacy

#### 3. Content Rating

**Policy** → **App content**:
1. Start questionnaire
2. Select category: **Utility, Productivity, Communication, or Other**
3. Answer questions honestly:
   - Does app share location? **No**
   - User-generated content? **Yes** (ID photos)
   - Content moderation? **Yes** (staff review)
   - Can users communicate? **No**

Expected rating: **Everyone** or **Mature 17+** (due to ID verification)

#### 4. Target Audience & Content

- Target age: **18+** (ID verification)
- Countries: **India** (or global)
- Content declaration: Check appropriate boxes

#### 5. App Access

- Is there restricted access? **Yes**
- Explain: "Users need a valid booking ID from Hostizzy to access the app"
- Provide demo credentials for review:
  ```
  Booking ID: DEMO-2024-001
  Phone: 9876543210
  ```

#### 6. Ads

- Does app contain ads? **No**

#### 7. Upload Bundle

**Release** → **Production**:
1. Create new release
2. Upload `app-release-bundle.aab`
3. Release name: `1.0.0` (Initial release)
4. Release notes:
   ```
   Initial release of Hostizzy Guest Portal

   Features:
   - Secure guest authentication
   - ID document submission
   - Multi-guest support
   - Real-time status tracking
   ```

#### 8. Review & Publish

1. Complete all sections until green checkmarks
2. Click "Review release"
3. Review all details
4. Click "Start rollout to Production"

**Timeline**:
- Initial review: 1-7 days
- Typical: 2-3 days for simple apps
- You'll get email notification

---

## 🧪 Testing

### Pre-Deployment Tests

#### Guest Portal Tests
- [ ] Authentication with valid Booking ID + Phone
- [ ] Authentication rejection with invalid credentials
- [ ] Multi-guest form flow
- [ ] Photo capture (mobile camera)
- [ ] File upload (desktop)
- [ ] Image compression works
- [ ] Upload progress indicators
- [ ] Session persistence (refresh page)
- [ ] Logout functionality
- [ ] Offline mode (service worker)

#### Admin Panel Tests
- [ ] Guest Documents view loads
- [ ] Filter by status works
- [ ] Search functionality
- [ ] Document review modal opens
- [ ] Image viewing (front/back/selfie)
- [ ] Approve document workflow
- [ ] Reject document workflow
- [ ] WhatsApp reminder link generation
- [ ] Stats update correctly
- [ ] Home dashboard shows pending count

### Testing Credentials

Create a test reservation:
```sql
INSERT INTO reservations (
    booking_id, property_id, property_name,
    check_in, check_out, nights,
    guest_name, guest_phone, guest_email,
    adults, kids,
    status, stay_amount, total_amount
) VALUES (
    'TEST-2024-001',
    'your-property-id',
    'Test Property',
    CURRENT_DATE + 7,
    CURRENT_DATE + 10,
    3,
    'Test Guest',
    '9876543210',
    'test@example.com',
    2, 0,
    'confirmed', 5000, 5000
);
```

Test with:
- Booking ID: `TEST-2024-001`
- Phone: `9876543210`

---

## 🐛 Troubleshooting

### Issue: "Booking not found"

**Cause**: Mismatch between booking ID or phone number

**Solution**:
```sql
-- Check reservation exists
SELECT booking_id, guest_phone FROM reservations WHERE booking_id = 'YOUR_BOOKING_ID';

-- Phone numbers must match (last 10 digits)
```

### Issue: "Failed to upload image"

**Cause**: Storage bucket not configured or RLS policy issue

**Solution**:
```sql
-- Check bucket exists
SELECT * FROM storage.buckets WHERE id = 'guest-id-documents';

-- Test upload permission
-- Temporarily disable RLS for testing
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Re-enable after testing
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
```

### Issue: Documents not showing in admin panel

**Cause**: JavaScript functions not properly integrated

**Solution**:
1. Open browser console (F12)
2. Check for errors
3. Verify `loadGuestDocuments()` function exists:
   ```javascript
   console.log(typeof loadGuestDocuments); // should be "function"
   ```

### Issue: Camera not working on mobile

**Cause**: HTTPS required for camera access

**Solution**:
- Ensure site is served over HTTPS
- Check browser permissions: Settings → Site Settings → Camera

### Issue: TWA app shows browser chrome

**Cause**: Digital Asset Links not configured

**Solution**:
1. Verify assetlinks.json is accessible:
   ```
   curl https://guest.yourdomain.com/.well-known/assetlinks.json
   ```
2. Verify fingerprint matches:
   ```bash
   keytool -list -v -keystore android.keystore -alias android
   ```
3. Test link: https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://guest.yourdomain.com

### Issue: Play Store rejection

**Common reasons**:
1. **Incomplete content rating**: Complete all questionnaires
2. **Missing privacy policy**: Must be accessible URL
3. **Screenshots show browser UI**: Retake with actual app
4. **App doesn't work**: Provide valid test credentials
5. **Digital Asset Links not verified**: Check assetlinks.json

**Solution**: Address the specific issue mentioned in rejection email and resubmit

---

## 📊 Analytics & Monitoring

### Track Key Metrics

Add to your analytics:
```javascript
// In guest-portal.html
function trackEvent(category, action, label) {
    // Google Analytics
    if (window.gtag) {
        gtag('event', action, {
            'event_category': category,
            'event_label': label
        });
    }
}

// Track document submissions
trackEvent('Guest Portal', 'Document Submitted', documentType);

// Track authentication
trackEvent('Guest Portal', 'Login Success', bookingId);
```

### Monitor Database

```sql
-- Daily submission stats
SELECT
    DATE(submitted_at) as date,
    COUNT(*) as submissions,
    SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) as verified,
    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
FROM guest_documents
WHERE submitted_at >= CURRENT_DATE - 30
GROUP BY DATE(submitted_at)
ORDER BY date DESC;

-- Top rejection reasons
SELECT
    rejection_reason,
    COUNT(*) as count
FROM guest_documents
WHERE status = 'rejected'
GROUP BY rejection_reason
ORDER BY count DESC;
```

---

## 🔐 Security Best Practices

### 1. Enable HTTPS Everywhere
- Use Let's Encrypt for free SSL certificates
- Enforce HTTPS redirects

### 2. Content Security Policy

Add to both portals:
```html
<meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob: https://dxthxsguqrxpurorpokq.supabase.co;
    connect-src 'self' https://dxthxsguqrxpurorpokq.supabase.co;
">
```

### 3. Rate Limiting

Implement in Supabase Edge Functions or server:
```javascript
// Limit document submissions per booking
const submissions = await supabase
    .from('guest_documents')
    .select('count')
    .eq('booking_id', bookingId)
    .single();

if (submissions.count > 10) {
    throw new Error('Too many submissions');
}
```

### 4. Input Validation

Already implemented:
- Phone number format validation
- Image size limits (5MB)
- File type restrictions (JPEG/PNG only)
- Booking ID format checks

---

## 📧 Email Notifications (Optional Enhancement)

### Using Supabase Edge Functions

1. Create Edge Function:
```bash
supabase functions new send-document-notification
```

2. Implement in `/supabase/functions/send-document-notification/index.ts`:
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const { bookingId, status, guestEmail } = await req.json()

  // Send email via SendGrid, Resend, or SMTP
  const emailBody = status === 'verified'
    ? `Your ID documents for booking ${bookingId} have been verified!`
    : `Your ID documents for booking ${bookingId} need to be resubmitted.`

  // Send email...

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  })
})
```

3. Call from your app:
```javascript
await supabase.functions.invoke('send-document-notification', {
    body: { bookingId, status, guestEmail }
});
```

---

## 🎉 Launch Checklist

### Pre-Launch (Week 1-2)
- [ ] Database schema deployed
- [ ] Storage bucket created
- [ ] Guest portal tested on mobile/desktop
- [ ] Admin panel integration tested
- [ ] Test reservations created
- [ ] Domain/subdomain configured
- [ ] HTTPS certificate installed
- [ ] Service workers registered

### Launch Day (Week 3)
- [ ] Deploy to production
- [ ] Test with real booking
- [ ] Send test WhatsApp link to yourself
- [ ] Verify document approval workflow
- [ ] Monitor Supabase logs
- [ ] Check error tracking

### Play Store Submission (Week 3-4)
- [ ] TWA app built and tested
- [ ] Digital Asset Links configured
- [ ] Screenshots taken
- [ ] Store listing complete
- [ ] Content rating obtained
- [ ] App submitted for review
- [ ] Test credentials provided

### Post-Launch (Week 4+)
- [ ] Monitor submission rates
- [ ] Check rejection reasons
- [ ] Gather user feedback
- [ ] Optimize image compression
- [ ] Add analytics
- [ ] Plan feature enhancements

---

## 📞 Support

For issues with:
- **Supabase**: https://supabase.com/docs
- **TWA/Bubblewrap**: https://github.com/GoogleChromeLabs/bubblewrap
- **Play Console**: https://support.google.com/googleplay/android-developer

For implementation help, check:
- Database schema comments in `database-schema.sql`
- Inline code comments in `guest-portal.html`
- Function documentation in `guest-documents-functions.js`

---

## 🚀 Future Enhancements

Ideas for v2.0:
- [ ] Email notifications for verification status
- [ ] SMS integration for OTP authentication
- [ ] OCR for auto-fill from ID photos
- [ ] Face verification (selfie match)
- [ ] Multiple language support
- [ ] Dark mode
- [ ] Document expiry warnings
- [ ] Bulk approval interface
- [ ] Export to PDF for records
- [ ] iOS App Store version

---

## 📝 Version History

**v1.0.0** (Current)
- Initial guest portal implementation
- Multi-guest ID submission
- Admin review interface
- WhatsApp integration
- PWA with offline support
- TWA for Play Store

---

**Built with ❤️ for Hostizzy**

For questions or support, contact your development team.

Good luck with your Play Store launch! 🎉
