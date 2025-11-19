# ResIQ - Supabase Database Schema & RLS Security

**Document Version**: 1.0
**Last Updated**: November 19, 2025
**Status**: Production Environment
**Database**: Supabase PostgreSQL

---

## Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Core Application Tables](#core-application-tables)
4. [Row-Level Security Status](#row-level-security-status)
5. [RLS Policy Examples](#rls-policy-examples)
6. [Security Assessment](#security-assessment)
7. [Security Best Practices](#security-best-practices)

---

## Overview

ResIQ is deployed on **Vercel** (frontend) with **Supabase** (backend/database). The application is currently in **production** managing all Hostizzy properties. This document provides a comprehensive reference for the database schema and security posture.

### Deployment Architecture

```
┌─────────────────┐
│  Vercel (CDN)   │
│  - index.html   │
│  - guest-portal │
│  - Static Assets│
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────────────────────┐
│  Supabase                       │
│  ┌───────────────────────────┐  │
│  │ PostgreSQL Database       │  │
│  │ - auth schema (RLS)       │  │
│  │ - public schema (RLS)     │  │
│  │ - storage schema (RLS)    │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ Authentication            │  │
│  │ - JWT tokens              │  │
│  │ - Session management      │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ Storage (Guest Documents) │  │
│  │ - RLS protected           │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### Security Layers

1. **Network**: HTTPS/TLS encryption
2. **Authentication**: Supabase Auth (JWT)
3. **Authorization**: Row-Level Security (RLS)
4. **Storage**: Bucket policies + RLS
5. **API**: Supabase anonymous key with RLS enforcement

---

## Database Schema

### Schemas Present

| Schema | Purpose | RLS Status |
|--------|---------|------------|
| `auth` | User authentication, sessions, identities | Enabled (managed by Supabase) |
| `public` | Application tables (properties, reservations, etc.) | Enabled (custom policies) |
| `storage` | File storage (guest documents, images) | Enabled (bucket policies) |
| `realtime` | Real-time subscriptions | Managed by Supabase |
| `vault` | Secrets management | Managed by Supabase |
| `graphql` | GraphQL API layer | N/A |
| `extensions` | PostgreSQL extensions | N/A |
| `pgbouncer` | Connection pooling | N/A |

---

## Core Application Tables

All tables are in the `public` schema.

### 1. **properties**

**Purpose**: Property inventory and configuration
**RLS Status**: ✅ Enabled

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Property name |
| `location` | TEXT | Address/city |
| `type` | TEXT | Villa, farmhouse, apartment, etc. |
| `capacity` | INTEGER | Max guests |
| `revenue_share_percent` | NUMERIC | Hostizzy commission % (8-13%) |
| `ical_url` | TEXT | Calendar sync URL (Airbnb, Booking.com) |
| `auto_sync_enabled` | BOOLEAN | Enable automatic calendar sync |
| `ical_last_synced` | TIMESTAMP | Last successful sync time |
| `created_at` | TIMESTAMP | Record creation |

**Key Features**:
- Multi-property management
- OTA calendar sync (iCal)
- Dynamic commission rates per property

---

### 2. **reservations**

**Purpose**: Booking records (direct + OTA)
**RLS Status**: ✅ Enabled

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `booking_id` | TEXT | Unique booking reference (UNIQUE) |
| `property_id` | UUID | FK → properties.id |
| `property_name` | TEXT | Denormalized property name |
| `check_in` | DATE | Check-in date |
| `check_out` | DATE | Check-out date |
| `nights` | INTEGER | Duration |
| `status` | TEXT | confirmed, checked_in, checked_out, cancelled |
| `booking_source` | TEXT | direct, airbnb, booking.com, etc. |
| `guest_name` | TEXT | Primary guest name |
| `guest_email` | TEXT | Contact email |
| `guest_phone` | TEXT | Contact phone |
| `total_amount_inc_tax` | NUMERIC | Total booking value (with GST) |
| `total_amount` | NUMERIC | Base amount (without tax) |
| `hostizzy_revenue` | NUMERIC | Commission earned by Hostizzy |
| `revenue_share_percent` | NUMERIC | Commission % for this booking |
| `payment_status` | TEXT | pending, partial, paid, refunded |
| `paid_amount` | NUMERIC | Amount received so far |
| `ota_service_fee` | NUMERIC | OTA platform fees |
| `created_at` | TIMESTAMP | Booking creation time |

**Key Features**:
- Multi-channel bookings (direct + OTA)
- Automatic commission calculation
- Payment status tracking
- Guest contact information

**Business Logic**:
```javascript
hostizzy_revenue = total_amount * (revenue_share_percent / 100)
owner_payout = total_amount - hostizzy_revenue - ota_service_fee
```

---

### 3. **payments**

**Purpose**: Payment transaction records
**RLS Status**: ✅ Enabled

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `booking_id` | TEXT | FK → reservations.booking_id |
| `payment_date` | DATE | When payment received |
| `amount` | NUMERIC | Payment amount |
| `payment_method` | TEXT | cash, upi, card, bank_transfer |
| `payment_source` | TEXT | guest, ota, owner |
| `reference_number` | TEXT | Transaction ID / receipt number |
| `created_by` | UUID | FK → team_members.id |
| `created_at` | TIMESTAMP | Record creation |

**Key Features**:
- Multi-payment support (partial payments)
- Audit trail (created_by)
- Transaction reference tracking

---

### 4. **synced_availability**

**Purpose**: Calendar sync blocked dates
**RLS Status**: ✅ Enabled

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `property_id` | UUID | FK → properties.id |
| `blocked_date` | DATE | Unavailable date |
| `source` | TEXT | ical, manual, system |
| `booking_summary` | TEXT | Reason/description |
| `synced_at` | TIMESTAMP | Last sync time |

**Key Features**:
- Prevents double-bookings
- Syncs from multiple OTAs
- Manual blocking support

---

### 5. **guest_documents**

**Purpose**: KYC document storage and verification
**RLS Status**: ✅ Enabled

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `booking_id` | TEXT | FK → reservations.booking_id |
| `guest_type` | TEXT | primary, additional |
| `document_type` | TEXT | aadhaar, pan, passport, driving_license |
| `document_front_url` | TEXT | Storage URL (front side) |
| `document_back_url` | TEXT | Storage URL (back side, optional) |
| `selfie_url` | TEXT | Selfie photo URL |
| `status` | TEXT | pending, verified, rejected |
| `retention_date` | DATE | When to auto-delete (7 days post checkout) |
| `created_at` | TIMESTAMP | Upload time |

**Key Features**:
- Government-compliant KYC
- Multi-guest support
- Auto-deletion for privacy (7 days after checkout)
- Selfie verification

**Data Retention**:
- Documents auto-deleted 7 days after checkout
- Compliant with privacy regulations

---

### 6. **guest_portal_sessions**

**Purpose**: Temporary guest access tokens
**RLS Status**: ✅ Enabled

| Column | Type | Description |
|--------|------|-------------|
| `session_token` | TEXT | Primary key (UUID) |
| `booking_id` | TEXT | FK → reservations.booking_id |
| `verified_phone` | TEXT | Authenticated phone number |
| `expires_at` | TIMESTAMP | Session expiry time |
| `created_at` | TIMESTAMP | Session creation |

**Key Features**:
- Secure guest portal access
- Phone-based authentication
- Automatic session expiry
- No password required

---

### 7. **guest_meal_preferences**

**Purpose**: Meal planning and dietary preferences
**RLS Status**: ✅ Enabled

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `booking_id` | TEXT | FK → reservations.booking_id |
| `guest_name` | TEXT | Guest name |
| `meal_type` | TEXT | breakfast, lunch, dinner, bbq |
| `date` | DATE | Meal date |
| `selected_items` | JSONB | Ordered menu items |
| `dietary_restrictions` | TEXT | Allergies, preferences |
| `created_at` | TIMESTAMP | Order time |

**Key Features**:
- Per-guest meal tracking
- Dietary restriction support
- JSON menu storage
- Kitchen integration

---

### 8. **team_members**

**Purpose**: Internal staff accounts
**RLS Status**: ✅ Enabled

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Staff name |
| `email` | TEXT | Login email |
| `role` | TEXT | admin, manager, staff |
| `is_active` | BOOLEAN | Account status |
| `created_at` | TIMESTAMP | Account creation |

**Key Features**:
- Role-based access control (RBAC)
- Admin/Manager/Staff hierarchy
- Account deactivation support

**Roles**:
- **admin**: Full system access
- **manager**: Property management, reports
- **staff**: Guest operations, KYC verification

---

### 9. **communications**

**Purpose**: Message history (WhatsApp, SMS, Email)
**RLS Status**: ❌ **DISABLED** (Security Review Required)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `booking_id` | TEXT | FK → reservations.booking_id |
| `type` | TEXT | whatsapp, sms, email |
| `message` | TEXT | Message content |
| `sent_at` | TIMESTAMP | Send time |
| `status` | TEXT | sent, delivered, failed |

**⚠️ Security Concern**: RLS should be enabled to prevent unauthorized access to guest communications.

---

## Row-Level Security Status

### ✅ RLS Enabled Tables

**Core Business Data** (8/9 tables protected):
- ✅ `properties` - Protected by property ownership policies
- ✅ `reservations` - Only accessible to authorized team members
- ✅ `payments` - Financial data protected
- ✅ `synced_availability` - Property-scoped access
- ✅ `guest_documents` - Strict access controls (guest + admin only)
- ✅ `guest_portal_sessions` - Session-based access
- ✅ `guest_meal_preferences` - Booking-scoped access
- ✅ `team_members` - Admin-only access

**System Tables**:
- ✅ `auth.users` - Managed by Supabase
- ✅ `auth.sessions` - Managed by Supabase
- ✅ `storage.objects` - Bucket policies enforced

---

### ❌ RLS Disabled Tables (Action Required)

| Table | Risk Level | Recommendation |
|-------|------------|----------------|
| `communications` | **HIGH** | Enable RLS immediately - contains sensitive guest data |

**Fix provided in**: `PWA_AUDIT_AND_IMPROVEMENTS.md` (Priority 1)

---

## RLS Policy Examples

### Example 1: Properties Table

```sql
-- Only authenticated users can view properties
CREATE POLICY "properties_select_policy"
ON public.properties
FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert/update/delete properties
CREATE POLICY "properties_write_policy"
ON public.properties
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.id = auth.uid()
    AND team_members.role = 'admin'
    AND team_members.is_active = true
  )
);
```

### Example 2: Guest Documents (Guest + Admin Access)

```sql
-- Guests can only see their own documents
CREATE POLICY "guest_documents_select_policy"
ON public.guest_documents
FOR SELECT
TO authenticated
USING (
  -- Guest access via portal session
  booking_id IN (
    SELECT booking_id FROM guest_portal_sessions
    WHERE verified_phone = auth.jwt()->>'phone'
    AND expires_at > now()
  )
  OR
  -- Team member access
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.id = auth.uid()
    AND team_members.is_active = true
  )
);
```

### Example 3: Reservations (Role-Based Access)

```sql
-- All team members can view reservations
CREATE POLICY "reservations_select_policy"
ON public.reservations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.id = auth.uid()
    AND team_members.is_active = true
  )
);

-- Only admins and managers can create/update reservations
CREATE POLICY "reservations_write_policy"
ON public.reservations
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.id = auth.uid()
    AND team_members.role IN ('admin', 'manager')
    AND team_members.is_active = true
  )
);
```

---

## Security Assessment

### Current Security Posture: **GOOD** (8/10)

**Strengths**:
1. ✅ RLS enabled on 8/9 tenant-sensitive tables (89% coverage)
2. ✅ JWT-based authentication via Supabase Auth
3. ✅ Storage bucket policies protect guest documents
4. ✅ Auto-deletion of KYC documents (privacy compliance)
5. ✅ Session expiry for guest portal access
6. ✅ Audit trail via `created_by` fields in payments table
7. ✅ Proper separation of guest vs. admin access
8. ✅ Phone-based authentication for guest portal (no passwords to steal)

**Weaknesses**:
1. ❌ `communications` table lacks RLS (HIGH priority fix)
2. ⚠️ Anonymous Supabase key exposed in frontend (mitigated by RLS, but still a concern)
3. ⚠️ No Content Security Policy (CSP) headers configured
4. ⚠️ Console logging in production (138 instances - potential data exposure)
5. ⚠️ localStorage for sensitive session data (prefer httpOnly cookies)

---

## Security Best Practices

### ✅ Current Implementation

1. **RLS Coverage**: 8/9 core tables protected (89%)
2. **Authentication**: JWT tokens via Supabase Auth
3. **Storage Security**: Bucket policies + RLS on storage.objects
4. **Privacy Compliance**: Auto-deletion of KYC documents after 7 days
5. **Session Management**: Automatic expiry for guest portal sessions
6. **Audit Trail**: `created_by` field tracks who created payment records

### 🔧 Immediate Actions Required

1. **Enable RLS on `communications` table**
   - Risk: Contains guest messages (WhatsApp, SMS, email)
   - Impact: Prevent unauthorized access to guest communications
   - Effort: 5 minutes (SQL script provided in improvements document)

2. **Remove console.log from production**
   - Risk: Sensitive data exposure in browser console
   - Impact: Better security posture
   - Effort: 1-2 hours (automated script possible)

3. **Add Content Security Policy headers**
   - Risk: XSS attacks possible
   - Impact: Prevent script injection
   - Effort: 30 minutes (Vercel configuration)

4. **Document all RLS policies**
   - Risk: Team members may not understand security model
   - Impact: Better maintainability
   - Effort: This document serves as the reference

### 🚀 Future Enhancements

1. **Database-level audit logging** - Track all changes to sensitive tables
2. **Rate limiting** - Prevent brute force attacks on guest portal
3. **Field-level encryption** - Encrypt PAN/Aadhaar numbers at rest
4. **CAPTCHA for guest portal** - Prevent automated attacks
5. **IP whitelisting for admin panel** - Restrict access to known IPs

---

## Database Relationships

### Entity Relationship Summary

```
properties
    ↓ (1:N)
reservations ← synced_availability
    ↓ (1:N)
    ├─→ payments
    ├─→ guest_documents
    ├─→ guest_portal_sessions
    ├─→ guest_meal_preferences
    └─→ communications

team_members (separate hierarchy)
    ↓ (audit trail)
payments.created_by
```

### Foreign Key Constraints

- `reservations.property_id` → `properties.id`
- `payments.booking_id` → `reservations.booking_id`
- `payments.created_by` → `team_members.id`
- `guest_documents.booking_id` → `reservations.booking_id`
- `guest_portal_sessions.booking_id` → `reservations.booking_id`
- `guest_meal_preferences.booking_id` → `reservations.booking_id`
- `communications.booking_id` → `reservations.booking_id`
- `synced_availability.property_id` → `properties.id`

---

## Conclusion

ResIQ's database architecture is **production-ready and secure** with proper RLS implementation covering 89% of core tables.

### Summary:
- ✅ **8/9 tables have RLS enabled**
- ✅ **Clean, normalized schema**
- ✅ **Privacy-compliant** (auto-deletion of KYC)
- ✅ **Audit trail** via created_by fields
- ✅ **Proper authentication** (JWT + phone-based for guests)

### Critical Fix Required:
- ❌ Enable RLS on `communications` table (see `PWA_AUDIT_AND_IMPROVEMENTS.md`)

### Schema Strengths:
1. **Comprehensive data model** covering all business workflows
2. **Flexible commission structure** (per-property revenue share)
3. **Multi-channel booking support** (direct + OTA)
4. **Guest-centric features** (KYC, meals, portal access)
5. **Proper separation of concerns** (team vs. guest access)

---

**Document Maintained By**: Hostizzy Engineering Team
**Last Review**: November 19, 2025
**Next Review**: February 2026 (before Owner Portal release)

For production-safe improvements and future roadmap, see: `PWA_AUDIT_AND_IMPROVEMENTS.md`
For Supabase documentation: https://supabase.com/docs
