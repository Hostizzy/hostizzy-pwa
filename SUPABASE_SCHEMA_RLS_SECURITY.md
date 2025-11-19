# ResIQ - Supabase Database Schema & Security Reference

**Document Version**: 1.0
**Last Updated**: November 19, 2025
**Status**: Production Environment
**Database**: Supabase PostgreSQL

---

## Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Row-Level Security (RLS) Status](#row-level-security-rls-status)
4. [Security Assessment](#security-assessment)
5. [Production-Safe Improvements](#production-safe-improvements)
6. [Future Roadmap](#future-roadmap)
7. [Implementation Guide](#implementation-guide)

---

## Overview

ResIQ is deployed on **Vercel** (frontend) with **Supabase** (backend/database). The application is currently in **production** managing all Hostizzy properties. This document provides a comprehensive reference for the database schema, security posture, and recommended improvements.

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

## Core Application Tables (public schema)

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
- Auto-deletion for privacy
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

## Row-Level Security (RLS) Status

### ✅ RLS Enabled Tables

**Core Business Data**:
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

---

## Security Assessment

### Current Security Posture: **GOOD** (8/10)

**Strengths**:
1. ✅ RLS enabled on all tenant-sensitive tables
2. ✅ JWT-based authentication via Supabase Auth
3. ✅ Storage bucket policies protect guest documents
4. ✅ Auto-deletion of KYC documents (privacy compliance)
5. ✅ Session expiry for guest portal access
6. ✅ Audit trail via `created_by` fields

**Weaknesses**:
1. ❌ `communications` table lacks RLS
2. ⚠️ Anonymous Supabase key exposed in frontend (mitigated by RLS)
3. ⚠️ No Content Security Policy (CSP) headers
4. ⚠️ Console logging in production (138 instances)
5. ⚠️ localStorage for sensitive session data (prefer httpOnly cookies)

---

## RLS Policy Examples (Current Implementation)

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

### Example 2: Guest Documents
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

### Example 3: Reservations (Role-Based)
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

## Production-Safe Improvements

### Priority 1: Immediate (No Downtime)

#### 1. Enable RLS on `communications` Table
**Risk**: None (additive change)
**Impact**: Secures guest message history

```sql
-- Enable RLS
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;

-- Policy: Only team members can view communications
CREATE POLICY "communications_select_policy"
ON public.communications
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.id = auth.uid()
    AND team_members.is_active = true
  )
);

-- Policy: Only admins and managers can insert communications
CREATE POLICY "communications_insert_policy"
ON public.communications
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.id = auth.uid()
    AND team_members.role IN ('admin', 'manager')
    AND team_members.is_active = true
  )
);
```

#### 2. Add Database Indexes for Performance
**Risk**: Minimal (short lock during creation)
**Impact**: Faster queries, better performance

```sql
-- Reservations: frequently filtered by property, dates, status
CREATE INDEX IF NOT EXISTS idx_reservations_property_id
ON reservations(property_id);

CREATE INDEX IF NOT EXISTS idx_reservations_check_in
ON reservations(check_in);

CREATE INDEX IF NOT EXISTS idx_reservations_status
ON reservations(status);

CREATE INDEX IF NOT EXISTS idx_reservations_booking_source
ON reservations(booking_source);

-- Payments: frequently joined on booking_id
CREATE INDEX IF NOT EXISTS idx_payments_booking_id
ON payments(booking_id);

-- Guest documents: filtered by booking and status
CREATE INDEX IF NOT EXISTS idx_guest_documents_booking_id
ON guest_documents(booking_id);

CREATE INDEX IF NOT EXISTS idx_guest_documents_status
ON guest_documents(status);

-- Synced availability: property + date range queries
CREATE INDEX IF NOT EXISTS idx_synced_availability_property_date
ON synced_availability(property_id, blocked_date);
```

#### 3. Add Composite Indexes for Common Queries
```sql
-- Reservation search: property + date range
CREATE INDEX IF NOT EXISTS idx_reservations_property_dates
ON reservations(property_id, check_in, check_out);

-- Payment reconciliation: booking + status
CREATE INDEX IF NOT EXISTS idx_payments_booking_status
ON payments(booking_id, payment_date);
```

---

### Priority 2: High (Staged Rollout)

#### 4. Implement Database Functions for Business Logic
**Benefit**: Centralized logic, better performance, security

```sql
-- Function: Calculate Hostizzy revenue
CREATE OR REPLACE FUNCTION calculate_hostizzy_revenue(
  p_total_amount NUMERIC,
  p_revenue_share_percent NUMERIC
) RETURNS NUMERIC AS $$
BEGIN
  RETURN ROUND(p_total_amount * (p_revenue_share_percent / 100), 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Get pending payments for booking
CREATE OR REPLACE FUNCTION get_pending_amount(p_booking_id TEXT)
RETURNS NUMERIC AS $$
DECLARE
  v_total NUMERIC;
  v_paid NUMERIC;
BEGIN
  SELECT total_amount INTO v_total
  FROM reservations
  WHERE booking_id = p_booking_id;

  SELECT COALESCE(SUM(amount), 0) INTO v_paid
  FROM payments
  WHERE booking_id = p_booking_id;

  RETURN GREATEST(v_total - v_paid, 0);
END;
$$ LANGUAGE plpgsql STABLE;
```

#### 5. Add Database Triggers for Data Integrity
```sql
-- Trigger: Auto-update reservation status
CREATE OR REPLACE FUNCTION auto_update_reservation_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.check_in <= CURRENT_DATE AND NEW.check_out > CURRENT_DATE THEN
    NEW.status = 'checked_in';
  ELSIF NEW.check_out <= CURRENT_DATE THEN
    NEW.status = 'checked_out';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_update_reservation_status
BEFORE INSERT OR UPDATE ON reservations
FOR EACH ROW
EXECUTE FUNCTION auto_update_reservation_status();

-- Trigger: Calculate hostizzy_revenue on reservation insert/update
CREATE OR REPLACE FUNCTION calc_hostizzy_revenue()
RETURNS TRIGGER AS $$
BEGIN
  NEW.hostizzy_revenue = calculate_hostizzy_revenue(
    NEW.total_amount,
    NEW.revenue_share_percent
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calc_hostizzy_revenue
BEFORE INSERT OR UPDATE OF total_amount, revenue_share_percent ON reservations
FOR EACH ROW
EXECUTE FUNCTION calc_hostizzy_revenue();
```

#### 6. Implement Audit Logging
```sql
-- Audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  changed_by UUID REFERENCES team_members(id),
  changed_at TIMESTAMP DEFAULT now()
);

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (table_name, operation, record_id, old_data, new_data, changed_by)
  VALUES (
    TG_TABLE_NAME,
    TG_OP,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply to sensitive tables
CREATE TRIGGER audit_reservations
AFTER INSERT OR UPDATE OR DELETE ON reservations
FOR EACH ROW
EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_payments
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW
EXECUTE FUNCTION audit_trigger_func();
```

---

### Priority 3: Medium (Incremental)

#### 7. Add Data Validation Constraints
```sql
-- Reservations: check_out must be after check_in
ALTER TABLE reservations
ADD CONSTRAINT chk_reservation_dates
CHECK (check_out > check_in);

-- Reservations: nights must match date difference
ALTER TABLE reservations
ADD CONSTRAINT chk_reservation_nights
CHECK (nights = (check_out - check_in));

-- Payments: amount must be positive
ALTER TABLE payments
ADD CONSTRAINT chk_payment_amount_positive
CHECK (amount > 0);

-- Properties: capacity must be positive
ALTER TABLE properties
ADD CONSTRAINT chk_property_capacity
CHECK (capacity > 0);

-- Properties: revenue share between 0-100
ALTER TABLE properties
ADD CONSTRAINT chk_revenue_share_percent
CHECK (revenue_share_percent BETWEEN 0 AND 100);
```

#### 8. Implement Soft Deletes
```sql
-- Add deleted_at column to tables
ALTER TABLE reservations ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE payments ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE properties ADD COLUMN deleted_at TIMESTAMP;

-- Update RLS policies to exclude soft-deleted records
DROP POLICY IF EXISTS "reservations_select_policy" ON reservations;

CREATE POLICY "reservations_select_policy"
ON reservations
FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.id = auth.uid()
    AND team_members.is_active = true
  )
);
```

---

## Future Roadmap

### Phase 1: Owner Portal (3-4 months)

#### New Tables Required

```sql
-- Property owners (separate from team_members)
CREATE TABLE property_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  pan_number TEXT,
  bank_account_number TEXT,
  ifsc_code TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);

-- Link properties to owners (many-to-one)
ALTER TABLE properties ADD COLUMN owner_id UUID REFERENCES property_owners(id);

-- Owner payout records
CREATE TABLE owner_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES property_owners(id),
  property_id UUID REFERENCES properties(id),
  booking_id TEXT REFERENCES reservations(booking_id),
  amount NUMERIC NOT NULL,
  payout_date DATE NOT NULL,
  payment_method TEXT,
  reference_number TEXT,
  status TEXT DEFAULT 'pending', -- pending, processed, failed
  created_by UUID REFERENCES team_members(id),
  created_at TIMESTAMP DEFAULT now()
);

-- Enable RLS
ALTER TABLE property_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_payouts ENABLE ROW LEVEL SECURITY;

-- RLS: Owners can only see their own data
CREATE POLICY "owners_select_own_data"
ON property_owners
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "owners_see_own_payouts"
ON owner_payouts
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR
  EXISTS (SELECT 1 FROM team_members WHERE id = auth.uid())
);
```

#### Owner Portal Features
- **Dashboard**: Revenue, occupancy, upcoming bookings
- **Reservations**: View bookings for their properties only
- **Payouts**: View payout history and pending amounts
- **Properties**: View their property details (read-only)
- **Reports**: Download revenue reports, tax summaries

#### RLS Modifications for Owner Access
```sql
-- Owners can view reservations for their properties
DROP POLICY IF EXISTS "reservations_select_policy" ON reservations;

CREATE POLICY "reservations_select_policy"
ON reservations
FOR SELECT
TO authenticated
USING (
  -- Team members see all
  EXISTS (SELECT 1 FROM team_members WHERE id = auth.uid() AND is_active = true)
  OR
  -- Owners see only their properties
  property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
);

-- Similar for payments, synced_availability, etc.
```

---

### Phase 2: Mobile App (App Store/Play Store) (4-6 months)

#### Architecture: Role-Based Single App

**Single App, Multiple Interfaces**:
```
┌─────────────────────────────────┐
│  ResIQ Mobile App               │
│  (iOS + Android)                │
├─────────────────────────────────┤
│  Login Screen                   │
│  - Email + Password             │
│  - Phone OTP (for guests)       │
└────────┬────────────────────────┘
         │
         ├─── Admin/Staff Login ──→ Admin Interface
         ├─── Owner Login ──────→ Owner Portal
         └─── Guest Login ──────→ Guest Portal
```

#### Authentication Flow
```sql
-- Enhanced team_members table for mobile
ALTER TABLE team_members ADD COLUMN device_token TEXT; -- FCM/APNS
ALTER TABLE team_members ADD COLUMN last_login_at TIMESTAMP;

-- Enhanced property_owners table
ALTER TABLE property_owners ADD COLUMN device_token TEXT;
ALTER TABLE property_owners ADD COLUMN last_login_at TIMESTAMP;

-- Guest portal: already has phone-based auth via guest_portal_sessions
```

#### Push Notifications
```sql
-- Notification queue table
CREATE TABLE push_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_type TEXT NOT NULL, -- team_member, owner, guest
  recipient_id UUID,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  sent_at TIMESTAMP,
  status TEXT DEFAULT 'pending', -- pending, sent, failed
  created_at TIMESTAMP DEFAULT now()
);

ALTER TABLE push_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own"
ON push_notifications
FOR SELECT
TO authenticated
USING (
  recipient_id = auth.uid()
  OR
  EXISTS (SELECT 1 FROM team_members WHERE id = auth.uid() AND role = 'admin')
);
```

#### App Features by Role

**Admin/Staff App**:
- Full ResIQ functionality (current web app)
- Push notifications for new bookings, KYC submissions
- Offline mode with sync
- Camera for guest document verification
- Barcode scanner for booking IDs

**Owner App**:
- Revenue dashboard (their properties only)
- Booking calendar
- Payout tracking
- Performance analytics
- Direct messaging with Hostizzy team

**Guest App**:
- Booking lookup
- KYC document upload
- Meal selection
- Check-in/out QR codes
- Property information
- Support chat

---

### Phase 3: Enhanced Features (6-12 months)

#### Multi-Tenancy for White-Label
```sql
-- Organizations table (for multi-tenancy)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  primary_color TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);

-- Link all entities to organizations
ALTER TABLE properties ADD COLUMN org_id UUID REFERENCES organizations(id);
ALTER TABLE team_members ADD COLUMN org_id UUID REFERENCES organizations(id);
ALTER TABLE property_owners ADD COLUMN org_id UUID REFERENCES organizations(id);

-- RLS: Isolate data by organization
CREATE POLICY "properties_org_isolation"
ON properties
FOR ALL
TO authenticated
USING (
  org_id = (SELECT org_id FROM team_members WHERE id = auth.uid())
);
```

#### Advanced Analytics Tables
```sql
-- Daily metrics rollup (for performance)
CREATE TABLE daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id),
  date DATE NOT NULL,
  occupancy_rate NUMERIC,
  revenue NUMERIC,
  bookings_count INTEGER,
  avg_booking_value NUMERIC,
  UNIQUE(property_id, date)
);

-- Automated refresh (daily)
CREATE OR REPLACE FUNCTION refresh_daily_metrics()
RETURNS void AS $$
BEGIN
  INSERT INTO daily_metrics (property_id, date, occupancy_rate, revenue, bookings_count, avg_booking_value)
  SELECT
    property_id,
    CURRENT_DATE - 1 AS date,
    -- occupancy calculation
    COUNT(*) FILTER (WHERE check_in <= CURRENT_DATE - 1 AND check_out > CURRENT_DATE - 1) * 100.0 /
      (SELECT capacity FROM properties p WHERE p.id = property_id) AS occupancy_rate,
    SUM(total_amount) AS revenue,
    COUNT(*) AS bookings_count,
    AVG(total_amount) AS avg_booking_value
  FROM reservations
  WHERE check_in = CURRENT_DATE - 1
  GROUP BY property_id
  ON CONFLICT (property_id, date) DO UPDATE
  SET occupancy_rate = EXCLUDED.occupancy_rate,
      revenue = EXCLUDED.revenue,
      bookings_count = EXCLUDED.bookings_count,
      avg_booking_value = EXCLUDED.avg_booking_value;
END;
$$ LANGUAGE plpgsql;
```

---

## Implementation Guide

### Working with Production Data

#### Safe Migration Strategy

**1. Test in Staging First**
```bash
# Create staging Supabase project
# Copy production schema (without data)
pg_dump --schema-only production_db > schema.sql
psql staging_db < schema.sql

# Apply migrations to staging
psql staging_db < migration_001_rls_communications.sql

# Test thoroughly
```

**2. Apply to Production (Zero Downtime)**
```bash
# Migrations should be:
# - Additive (no DROP/ALTER destructive operations)
# - Backward compatible
# - Tested in staging

# Good: Add RLS policy (non-breaking)
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
CREATE POLICY ...

# Good: Add index (low-risk)
CREATE INDEX CONCURRENTLY idx_name ON table(column);

# Bad: Remove column (breaking!)
# ALTER TABLE reservations DROP COLUMN old_field; -- DON'T DO THIS
```

**3. Use Transactions for Multi-Statement Changes**
```sql
BEGIN;

-- Multiple related changes
ALTER TABLE properties ADD COLUMN owner_id UUID;
CREATE INDEX idx_properties_owner ON properties(owner_id);
-- Rollback if any statement fails

COMMIT;
```

**4. Monitor Query Performance**
```sql
-- Enable pg_stat_statements extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find slow queries
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

---

### Database Backup Strategy

**Automated Backups** (Supabase provides):
- Daily automated backups (7-day retention)
- Point-in-time recovery (PITR)

**Manual Backups** (before major changes):
```bash
# Full backup
pg_dump -h db.xxxx.supabase.co -U postgres -d postgres > backup_$(date +%Y%m%d).sql

# Schema only
pg_dump --schema-only -h db.xxxx.supabase.co -U postgres -d postgres > schema.sql

# Data only
pg_dump --data-only -h db.xxxx.supabase.co -U postgres -d postgres > data.sql
```

---

### Migration Checklist

Before applying any database change:

- [ ] Tested in local Supabase instance
- [ ] Tested in staging environment
- [ ] Performance tested with production-like data volume
- [ ] Backup created
- [ ] Migration script is idempotent (can run multiple times safely)
- [ ] Rollback plan documented
- [ ] RLS policies verified
- [ ] Team notified of planned changes
- [ ] Monitoring in place to detect issues

---

## Claude AI Development Workflow

### Recommended Approach for Safe Production Changes

#### 1. Schema Changes
```bash
# Always work in feature branches
git checkout -b feature/add-owner-portal-schema

# Create migration files (numbered)
touch migrations/001_add_property_owners_table.sql
touch migrations/002_add_rls_policies_owners.sql
touch migrations/003_add_indexes_owners.sql

# Each migration should be:
# - Small and focused
# - Reversible
# - Well-commented
```

#### 2. Frontend Changes (Zero-Downtime)
```javascript
// Use feature flags for gradual rollout
const FEATURE_FLAGS = {
  ownerPortal: false, // Enable when ready
  newDashboard: false,
  pushNotifications: false
};

// Conditional rendering
if (FEATURE_FLAGS.ownerPortal && user.role === 'owner') {
  showOwnerPortal();
} else {
  showDefaultView();
}
```

#### 3. API Changes (Backward Compatible)
```javascript
// Bad: Breaking change
// function loadReservations(propertyId) { ... }

// Good: Additive change
function loadReservations(propertyId, options = {}) {
  const { includeDeleted = false, ownerId = null } = options;
  // New functionality without breaking existing calls
}
```

#### 4. Testing Strategy
```javascript
// Unit tests for business logic
describe('calculateHostizzyRevenue', () => {
  it('should calculate 10% commission correctly', () => {
    expect(calculateHostizzyRevenue(10000, 10)).toBe(1000);
  });
});

// Integration tests for database
describe('ReservationRepository', () => {
  it('should respect RLS policies', async () => {
    // Test that owners can only see their properties
  });
});

// E2E tests for critical flows
describe('Booking Flow', () => {
  it('should create reservation and send guest portal link', async () => {
    // Full workflow test
  });
});
```

---

## Security Best Practices Summary

### ✅ Current Implementation
1. RLS enabled on all core tables
2. JWT authentication via Supabase
3. Storage bucket policies
4. Auto-deletion of sensitive data (KYC documents)
5. Session expiry for guest access

### 🔧 Immediate Actions Required
1. Enable RLS on `communications` table
2. Remove console.log statements from production
3. Add Content Security Policy headers
4. Document all RLS policies

### 🚀 Future Enhancements
1. Implement database triggers for audit logging
2. Add rate limiting on Supabase edge functions
3. Implement field-level encryption for PAN/Aadhaar
4. Add CAPTCHA for guest portal authentication
5. Implement IP whitelisting for admin panel

---

## Conclusion

ResIQ's current database architecture is **production-ready and secure** with proper RLS implementation. The schema supports the core business workflows effectively.

### Strengths:
- ✅ Comprehensive RLS coverage
- ✅ Clean, normalized schema
- ✅ Privacy-compliant (auto-deletion)
- ✅ Audit trail via created_by

### Improvement Priorities:
1. **Immediate**: Enable RLS on `communications` table
2. **Short-term**: Add database indexes, triggers, and constraints
3. **Medium-term**: Owner portal tables and RLS policies
4. **Long-term**: Mobile app, push notifications, multi-tenancy

### Development Approach:
- Use feature branches and staging environment
- Apply migrations incrementally
- Maintain backward compatibility
- Monitor performance after each change
- Keep production stable while adding new features

---

**Document Maintained By**: Hostizzy Engineering Team
**Last Review**: November 19, 2025
**Next Review**: February 2026 (before Owner Portal release)

For questions or clarifications, refer to the implementation team or consult Supabase documentation at https://supabase.com/docs
