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

// Auxiliary modules
import './scripts/navigation.js'      // View management, routing
import './scripts/notifications.js'   // Push notifications, browser notifications
import './scripts/pwa.js'             // PWA installation, service worker
import './scripts/sync.js'            // Online/offline sync
import './scripts/dashboard.js'       // Dashboard rendering, metrics, filters
import './scripts/analytics.js'       // Charts, reports, visualizations

// Import legacy JavaScript (remaining helper functions and utilities)
// REMOVED: All functionality has been successfully modularized
// import './scripts/legacy.js'

console.log('✅ ResIQ loaded successfully (100% modular version)')
