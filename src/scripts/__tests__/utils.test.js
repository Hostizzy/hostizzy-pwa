/**
 * Unit Tests for utils.js
 * Tests for utility functions and formatters
 */

import { describe, it, expect, beforeEach } from 'vitest'

// Mock window object for tests
beforeEach(() => {
  global.window = {}
})

describe('Utils Module', () => {
  describe('formatCurrency', () => {
    it('should format amounts in Indian number system', () => {
      // Import after window is set up
      const { formatCurrency } = await import('../utils.js')

      expect(formatCurrency(1000)).toBe('₹1,000')
      expect(formatCurrency(10000)).toBe('₹10,000')
      expect(formatCurrency(100000)).toBe('₹1,00,000')
      expect(formatCurrency(1000000)).toBe('₹10,00,000')
    })

    it('should handle decimal amounts', () => {
      const { formatCurrency } = await import('../utils.js')

      expect(formatCurrency(1234.56)).toBe('₹1,235')
      expect(formatCurrency(99999.99)).toBe('₹1,00,000')
    })

    it('should handle zero and negative amounts', () => {
      const { formatCurrency } = await import('../utils.js')

      expect(formatCurrency(0)).toBe('₹0')
      expect(formatCurrency(-1000)).toBe('₹-1,000')
    })

    it('should use shorthand for large amounts', () => {
      const { formatCurrency } = await import('../utils.js')

      // 1 Lakh (1,00,000)
      expect(formatCurrency(100000, true)).toContain('L')

      // 1 Crore (1,00,00,000)
      expect(formatCurrency(10000000, true)).toContain('Cr')

      // Thousands
      expect(formatCurrency(50000, true)).toContain('K')
    })
  })

  describe('calculateNights', () => {
    it('should calculate nights between two dates', () => {
      const { calculateNights } = await import('../utils.js')

      expect(calculateNights('2025-01-01', '2025-01-02')).toBe(1)
      expect(calculateNights('2025-01-01', '2025-01-05')).toBe(4)
      expect(calculateNights('2025-01-01', '2025-01-01')).toBe(0)
    })

    it('should handle date strings in different formats', () => {
      const { calculateNights } = await import('../utils.js')

      expect(calculateNights('2025-01-01', '2025-01-03')).toBe(2)
    })
  })

  describe('generateBookingId', () => {
    it('should generate unique booking IDs', () => {
      const { generateBookingId } = await import('../utils.js')

      const id1 = generateBookingId()
      const id2 = generateBookingId()

      expect(id1).toBeTruthy()
      expect(id2).toBeTruthy()
      expect(id1).not.toBe(id2)
    })

    it('should generate IDs with correct format', () => {
      const { generateBookingId } = await import('../utils.js')

      const id = generateBookingId()

      // Should start with BK or similar prefix
      expect(id).toMatch(/^BK/)
      expect(id.length).toBeGreaterThan(5)
    })
  })

  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      const { isValidEmail } = await import('../utils.js')

      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('user.name@company.co.in')).toBe(true)
      expect(isValidEmail('admin+tag@hostizzy.com')).toBe(true)
    })

    it('should reject invalid email addresses', () => {
      const { isValidEmail } = await import('../utils.js')

      expect(isValidEmail('invalid')).toBe(false)
      expect(isValidEmail('test@')).toBe(false)
      expect(isValidEmail('@example.com')).toBe(false)
      expect(isValidEmail('test @example.com')).toBe(false)
      expect(isValidEmail('')).toBe(false)
    })
  })

  describe('isValidPhone', () => {
    it('should validate Indian phone numbers', () => {
      const { isValidPhone } = await import('../utils.js')

      expect(isValidPhone('9876543210')).toBe(true)
      expect(isValidPhone('+919876543210')).toBe(true)
      expect(isValidPhone('919876543210')).toBe(true)
    })

    it('should reject invalid phone numbers', () => {
      const { isValidPhone } = await import('../utils.js')

      expect(isValidPhone('123')).toBe(false)
      expect(isValidPhone('abcdefghij')).toBe(false)
      expect(isValidPhone('')).toBe(false)
    })
  })

  describe('debounce', () => {
    it('should debounce function calls', async () => {
      const { debounce } = await import('../utils.js')

      let callCount = 0
      const fn = () => callCount++
      const debouncedFn = debounce(fn, 100)

      // Call multiple times
      debouncedFn()
      debouncedFn()
      debouncedFn()

      // Should not have called yet
      expect(callCount).toBe(0)

      // Wait for debounce delay
      await new Promise(resolve => setTimeout(resolve, 150))

      // Should have called only once
      expect(callCount).toBe(1)
    })
  })

  describe('exportToCSV', () => {
    it('should generate CSV content from data', () => {
      const { exportToCSV } = await import('../utils.js')

      const data = [
        { name: 'John', age: 30, city: 'Mumbai' },
        { name: 'Jane', age: 25, city: 'Delhi' }
      ]

      const headers = ['name', 'age', 'city']
      const filename = 'test.csv'

      // Should not throw
      expect(() => exportToCSV(data, headers, filename)).not.toThrow()
    })
  })
})
