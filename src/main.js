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

// Import legacy JavaScript
// Note: This contains all the original functionality from index.html
// In Phase 2, we'll modularize this into:
// - config.js (Supabase setup, constants)
// - auth.js (login, logout, session)
// - database.js (DB operations)
// - reservations.js, payments.js, properties.js, guests.js
// - notifications.js, pwa.js
// - ui.js, utils.js
import './scripts/legacy.js'

console.log('✅ ResIQ loaded successfully (modular version)')
