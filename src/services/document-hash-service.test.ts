/**
 * Tests for document hashing service
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { DocumentHashService } from './document-hash-service'

describe('DocumentHashService', () => {
  let service: DocumentHashService

  beforeEach(() => {
    service = new DocumentHashService()
  })

  describe('calculateDocumentHashes', () => {
    it('should throw error for unsupported file types', async () => {
      const unsupportedFile = new File(['test'], 'test.txt', { type: 'text/plain' })
      
      await expect(service.calculateDocumentHashes(unsupportedFile))
        .rejects
        .toThrow('Unsupported document type')
    })

    // Skip PDF tests for now since PDF hash generation is not fully implemented
    it.skip('should handle PDF files and return proper hash structure', async () => {
      // TODO: Implement proper PDF hash generation
    })
  })

  describe('createExclusionZone', () => {
    it('should create exclusion zone with correct properties', () => {
      const position = { x: 10, y: 20 }
      const dimensions = { width: 100, height: 80 }
      const fillColor = '#FF0000'
      
      const exclusionZone = service.createExclusionZone(position, dimensions, fillColor)
      
      expect(exclusionZone).toEqual({
        x: 10,
        y: 20,
        width: 100,
        height: 80,
        fillColor: '#FF0000'
      })
    })

    it('should use default fill color when not provided', () => {
      const position = { x: 0, y: 0 }
      const dimensions = { width: 50, height: 50 }
      
      const exclusionZone = service.createExclusionZone(position, dimensions)
      
      expect(exclusionZone.fillColor).toBe('#FFFFFF')
    })
  })

  describe('SHA-256 hashing', () => {
    it('should produce consistent hashes for same input', async () => {
      const testData = new TextEncoder().encode('test data')
      const buffer = testData.buffer
      
      // Access the private method through type assertion for testing
      const service1 = new DocumentHashService()
      const service2 = new DocumentHashService()
      
      const hash1 = await (service1 as any).calculateSHA256(buffer)
      const hash2 = await (service2 as any).calculateSHA256(buffer)
      
      expect(hash1).toBe(hash2)
      expect(hash1).toHaveLength(64) // SHA-256 produces 64 character hex string
      expect(hash1).toMatch(/^[a-f0-9]{64}$/) // Should be valid hex
    })

    it('should produce different hashes for different inputs', async () => {
      const data1 = new TextEncoder().encode('test data 1')
      const data2 = new TextEncoder().encode('test data 2')
      
      const hash1 = await (service as any).calculateSHA256(data1.buffer)
      const hash2 = await (service as any).calculateSHA256(data2.buffer)
      
      expect(hash1).not.toBe(hash2)
    })
  })
})
