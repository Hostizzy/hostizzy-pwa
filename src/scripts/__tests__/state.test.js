/**
 * Unit Tests for state.js
 * Tests for global state management
 */

import { describe, it, expect, beforeEach } from 'vitest'

// Mock window object for tests
beforeEach(() => {
  global.window = {}
})

describe('State Module', () => {
  beforeEach(async () => {
    // Re-import to get fresh state for each test
    delete global.window.state
    delete global.window.allReservations
    delete global.window.allPayments
  })

  describe('Initial State', () => {
    it('should initialize with default values', async () => {
      const { state } = await import('../state.js')

      expect(state.currentView).toBe('home')
      expect(state.isSidebarCollapsed).toBe(false)
      expect(state.isOnline).toBe(true)
      expect(state.syncInProgress).toBe(false)
      expect(state.currentUser).toBeNull()
    })
  })

  describe('setAllReservations', () => {
    it('should update allReservations array', async () => {
      const { setAllReservations, allReservations } = await import('../state.js')

      const testReservations = [
        { id: 1, booking_id: 'BK001', guest_name: 'John Doe' },
        { id: 2, booking_id: 'BK002', guest_name: 'Jane Smith' }
      ]

      setAllReservations(testReservations)

      expect(window.allReservations).toHaveLength(2)
      expect(window.allReservations[0].booking_id).toBe('BK001')
    })

    it('should handle empty arrays', async () => {
      const { setAllReservations } = await import('../state.js')

      setAllReservations([])

      expect(window.allReservations).toHaveLength(0)
    })
  })

  describe('setAllPayments', () => {
    it('should update allPayments array', async () => {
      const { setAllPayments } = await import('../state.js')

      const testPayments = [
        { id: '1', booking_id: 'BK001', amount: 10000 },
        { id: '2', booking_id: 'BK002', amount: 15000 }
      ]

      setAllPayments(testPayments)

      expect(window.allPayments).toHaveLength(2)
      expect(window.allPayments[0].amount).toBe(10000)
    })
  })

  describe('setCurrentUser', () => {
    it('should update current user', async () => {
      const { setCurrentUser } = await import('../state.js')

      const testUser = {
        id: 'user1',
        email: 'admin@hostizzy.com',
        role: 'admin'
      }

      setCurrentUser(testUser)

      expect(window.currentUser).toEqual(testUser)
      expect(window.currentUser.role).toBe('admin')
    })

    it('should handle null user (logout)', async () => {
      const { setCurrentUser } = await import('../state.js')

      setCurrentUser(null)

      expect(window.currentUser).toBeNull()
    })
  })

  describe('selectedReservations', () => {
    it('should initialize as empty Set', async () => {
      const { selectedReservations } = await import('../state.js')

      expect(selectedReservations).toBeInstanceOf(Set)
      expect(selectedReservations.size).toBe(0)
    })

    it('should allow adding and removing items', async () => {
      const { selectedReservations } = await import('../state.js')

      selectedReservations.add('BK001')
      selectedReservations.add('BK002')

      expect(selectedReservations.size).toBe(2)
      expect(selectedReservations.has('BK001')).toBe(true)

      selectedReservations.delete('BK001')

      expect(selectedReservations.size).toBe(1)
      expect(selectedReservations.has('BK001')).toBe(false)
    })
  })

  describe('setCurrentWhatsAppBooking', () => {
    it('should update WhatsApp booking state', async () => {
      const { setCurrentWhatsAppBooking } = await import('../state.js')

      const testBooking = {
        booking_id: 'BK001',
        guest_name: 'John Doe',
        guest_phone: '9876543210'
      }

      setCurrentWhatsAppBooking(testBooking)

      expect(window.currentWhatsAppBooking).toEqual(testBooking)
    })

    it('should handle null value', async () => {
      const { setCurrentWhatsAppBooking } = await import('../state.js')

      setCurrentWhatsAppBooking(null)

      expect(window.currentWhatsAppBooking).toBeNull()
    })
  })
})
