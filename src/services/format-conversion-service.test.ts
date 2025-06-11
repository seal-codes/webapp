/**
 * Tests for format conversion service
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { FormatConversionService } from './format-conversion-service'

describe('FormatConversionService', () => {
  let service: FormatConversionService

  beforeAll(() => {
    service = new FormatConversionService()
  })

  describe('isOptimalFormat', () => {
    it('should identify PNG as optimal', () => {
      const result = (service as any).isOptimalFormat('image/png')
      expect(result).toBe(true)
    })

    it('should identify WebP as optimal', () => {
      const result = (service as any).isOptimalFormat('image/webp')
      expect(result).toBe(true)
    })

    it('should identify JPEG as not optimal', () => {
      const result = (service as any).isOptimalFormat('image/jpeg')
      expect(result).toBe(false)
    })

    it('should identify GIF as not optimal', () => {
      const result = (service as any).isOptimalFormat('image/gif')
      expect(result).toBe(false)
    })
  })

  describe('selectTargetFormat', () => {
    it('should use WebP by default', () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' })
      Object.defineProperty(file, 'size', { value: 2_000_000 }) // 2MB
      
      const result = (service as any).selectTargetFormat(file, false)
      expect(result).toBe('image/webp')
    })

    it('should use PNG when preferred', () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' })
      Object.defineProperty(file, 'size', { value: 2_000_000 }) // 2MB
      
      const result = (service as any).selectTargetFormat(file, true)
      expect(result).toBe('image/png')
    })

    it('should always use WebP when not preferring PNG', () => {
      const smallFile = new File([''], 'test.jpg', { type: 'image/jpeg' })
      Object.defineProperty(smallFile, 'size', { value: 500_000 }) // 500KB
      
      const largeFile = new File([''], 'test.jpg', { type: 'image/jpeg' })
      Object.defineProperty(largeFile, 'size', { value: 6_000_000 }) // 6MB
      
      expect((service as any).selectTargetFormat(smallFile, false)).toBe('image/webp')
      expect((service as any).selectTargetFormat(largeFile, false)).toBe('image/webp')
    })
  })

  describe('updateFileName', () => {
    it('should update JPEG to PNG extension', () => {
      const result = (service as any).updateFileName('test.jpg', 'image/png')
      expect(result).toBe('test.png')
    })

    it('should update JPEG to WebP extension', () => {
      const result = (service as any).updateFileName('test.jpeg', 'image/webp')
      expect(result).toBe('test.webp')
    })

    it('should handle files without extensions', () => {
      const result = (service as any).updateFileName('test', 'image/png')
      expect(result).toBe('test.png')
    })

    it('should handle complex filenames', () => {
      const result = (service as any).updateFileName('my-document.final.jpg', 'image/webp')
      expect(result).toBe('my-document.final.webp')
    })
  })

  describe('getFormatDisplayName', () => {
    it('should return friendly names for common formats', () => {
      expect(service.getFormatDisplayName('image/jpeg')).toBe('JPEG')
      expect(service.getFormatDisplayName('image/jpg')).toBe('JPEG')
      expect(service.getFormatDisplayName('image/png')).toBe('PNG')
      expect(service.getFormatDisplayName('image/webp')).toBe('WebP')
      expect(service.getFormatDisplayName('image/gif')).toBe('GIF')
    })

    it('should return original format for unknown types', () => {
      expect(service.getFormatDisplayName('image/unknown')).toBe('image/unknown')
    })
  })

  describe('convertToOptimalFormat', () => {
    it('should not convert PNG files', async () => {
      const pngFile = new File(['fake-png-data'], 'test.png', { type: 'image/png' })
      
      const result = await service.convertToOptimalFormat(pngFile)
      
      expect(result.wasConverted).toBe(false)
      expect(result.file).toBe(pngFile)
      expect(result.originalFormat).toBe('image/png')
      expect(result.finalFormat).toBe('image/png')
    })

    it('should not convert WebP files', async () => {
      const webpFile = new File(['fake-webp-data'], 'test.webp', { type: 'image/webp' })
      
      const result = await service.convertToOptimalFormat(webpFile)
      
      expect(result.wasConverted).toBe(false)
      expect(result.file).toBe(webpFile)
      expect(result.originalFormat).toBe('image/webp')
      expect(result.finalFormat).toBe('image/webp')
    })

    // Note: Actual conversion tests would require a more complex setup with canvas mocking
    // The conversion logic is tested through integration tests
  })
})
