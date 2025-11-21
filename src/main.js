/**
 * ResIQ Main Entry Point
 * This file is the entry point for Vite build system
 */

// Import styles
import './styles/main.css'

// Import Supabase (will be bundled by Vite)
import { createClient } from '@supabase/supabase-js'

// Make Supabase available globally (for legacy code compatibility)
window.createClient = createClient

// Import modular scripts (Phase 2 - In Progress)
// Foundation modules
import './scripts/config.js'      // Supabase setup, constants
import './scripts/state.js'       // Global state management
import './scripts/utils.js'       // Formatters, validators, helpers
import './scripts/ui.js'          // UI utilities (toasts, loading, modals)

// Core modules
import './scripts/database.js'      // DB operations, IndexedDB
import './scripts/auth.js'          // Login, logout, session management
import './scripts/templates.js'     // WhatsApp message templates
import './scripts/whatsapp.js'      // WhatsApp integration

// Feature modules
import './scripts/reservations.js'  // Reservation CRUD, modals, filtering
import './scripts/payments.js'      // Payment CRUD, multi-entry, reminders
import './scripts/guests.js'        // Guest management, KYC documents
import './scripts/properties.js'    // Property management, iCal sync

// Import legacy JavaScript (remaining code to be extracted)
// TODO: Extract remaining modules:
// - dashboard.js, analytics.js, notifications.js
// - pwa.js, navigation.js, sync.js
import './scripts/legacy.js'

console.log('✅ ResIQ loaded successfully (modular version)')
