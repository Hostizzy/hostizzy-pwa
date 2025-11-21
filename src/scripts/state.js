/**
 * Global State Management
 */

// Application state
export const state = {
    reservations: [],
    properties: [],
    payments: [],
    user: null,
    isOnline: navigator.onLine,
    syncInProgress: false
}

// Global arrays (for legacy compatibility)
export let allReservations = []
export let allPayments = []
export let selectedReservations = new Set()
export let currentUser = null
export let currentWhatsAppBooking = null

// Update functions
export function setAllReservations(reservations) {
    allReservations = reservations
    state.reservations = reservations
}

export function setAllPayments(payments) {
    allPayments = payments
    state.payments = payments
}

export function setCurrentUser(user) {
    currentUser = user
    state.user = user
}

export function setCurrentWhatsAppBooking(booking) {
    currentWhatsAppBooking = booking
}

export function addSelectedReservation(id) {
    selectedReservations.add(id)
}

export function removeSelectedReservation(id) {
    selectedReservations.delete(id)
}

export function clearSelectedReservations() {
    selectedReservations.clear()
}

export function setOnlineStatus(status) {
    state.isOnline = status
}

export function setSyncInProgress(status) {
    state.syncInProgress = status
}

// Make available globally for legacy code
window.allReservations = allReservations
window.allPayments = allPayments
window.selectedReservations = selectedReservations
window.currentUser = currentUser
window.currentWhatsAppBooking = currentWhatsAppBooking
