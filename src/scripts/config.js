/**
 * Configuration - Supabase setup and constants
 */

import { createClient } from '@supabase/supabase-js'

// Supabase Configuration
const SUPABASE_URL = 'https://dxthxsguqrxpurorpokq.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4dGh4c2d1cXJ4cHVyb3Jwb2txIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMjc4MTMsImV4cCI6MjA3NTYwMzgxM30.JhGzqUolA-A_fGha-0DhHVl7p1vRq4CZcp5ttdVxjQg'

// Initialize Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Make available globally for legacy code compatibility
window.supabase = { createClient }
window.supabaseClient = supabase

// Booking Type Constants
export const BOOKING_TYPES = {
    'STAYCATION': { label: 'Staycation', icon: '🏖️' },
    'WEDDING': { label: 'Wedding', icon: '💒' },
    'BIRTHDAY': { label: 'Birthday Party', icon: '🎂' },
    'CORPORATE_EVENT': { label: 'Corporate Event', icon: '🏢' },
    'CORPORATE_STAY': { label: 'Corporate Stay', icon: '💼' },
    'SHOOT': { label: 'Shoot', icon: '📸' }
}

// Target occupancy nights per property per year
export const TARGET_OCCUPANCY_NIGHTS = 200

// Database constants
export const DB_NAME = 'HostizzyOfflineDB'
export const DB_VERSION = 1
