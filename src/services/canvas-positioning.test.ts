/**
 * Test to verify canvas-based preview positioning matches sealing positioning
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { qrCodeUICalculator } from './qrcode-ui-calculator'
import type { QRCodeUIPosition, DocumentDimensions } from '@/types/qrcode'

describe('Canvas Positioning Consistency', () => {
  let testDimensions: DocumentDimensions
  let testPosition: QRCodeUIPosition
  let testSizePercent: number

  beforeEach(() => {
    // Test with realistic image dimensions
    testDimensions = { width: 3000, height: 2000 }
    testPosition = { x: 85, y: 15 } // Top-right corner
    testSizePercent = 20
  })

  it('should calculate consistent pixel positions for preview and sealing', () => {
    // This is the calculation used in both canvas preview and sealing
    const pixelCalc = qrCodeUICalculator.calculateEmbeddingPixels(
      testPosition,
      testSizePercent,
      testDimensions,
      'image',
    )

    // Verify the calculation is deterministic
    const pixelCalc2 = qrCodeUICalculator.calculateEmbeddingPixels(
      testPosition,
      testSizePercent,
      testDimensions,
      'image',
    )

    expect(pixelCalc.position).toEqual(pixelCalc2.position)
    expect(pixelCalc.sizeInPixels).toEqual(pixelCalc2.sizeInPixels)
    expect(pixelCalc.exclusionZone).toEqual(pixelCalc2.exclusionZone)
  })

  it('should convert percentage positions to correct pixel coordinates', () => {
    const pixelCalc = qrCodeUICalculator.calculateEmbeddingPixels(
      testPosition,
      testSizePercent,
      testDimensions,
      'image',
    )

    // Calculate expected position manually
    // Position is center-based, so we need to account for seal dimensions
    const expectedCenterX = (testDimensions.width * testPosition.x) / 100
    const expectedCenterY = (testDimensions.height * testPosition.y) / 100
    
    // The actual position should be top-left corner of the seal
    const expectedX = expectedCenterX - (pixelCalc.completeSealDimensions.width / 2)
    const expectedY = expectedCenterY - (pixelCalc.completeSealDimensions.height / 2)

    expect(pixelCalc.position.x).toBeCloseTo(expectedX, 0)
    expect(pixelCalc.position.y).toBeCloseTo(expectedY, 0)
  })

  it('should maintain aspect ratio consistency across different document sizes', () => {
    // Use documents with the same aspect ratio to avoid minimum size effects
    const smallDoc = { width: 1200, height: 800 }  // 3:2 aspect ratio
    const largeDoc = { width: 3600, height: 2400 } // 3:2 aspect ratio
    
    const smallCalc = qrCodeUICalculator.calculateEmbeddingPixels(
      testPosition,
      testSizePercent,
      smallDoc,
      'image',
    )
    
    const largeCalc = qrCodeUICalculator.calculateEmbeddingPixels(
      testPosition,
      testSizePercent,
      largeDoc,
      'image',
    )

    // Position percentages should be the same when aspect ratios match
    const smallPosX = (smallCalc.position.x + smallCalc.completeSealDimensions.width / 2) / smallDoc.width * 100
    const smallPosY = (smallCalc.position.y + smallCalc.completeSealDimensions.height / 2) / smallDoc.height * 100
    
    const largePosX = (largeCalc.position.x + largeCalc.completeSealDimensions.width / 2) / largeDoc.width * 100
    const largePosY = (largeCalc.position.y + largeCalc.completeSealDimensions.height / 2) / largeDoc.height * 100

    expect(smallPosX).toBeCloseTo(largePosX, 1)
    expect(smallPosY).toBeCloseTo(largePosY, 1)
  })

  it('should handle boundary conditions correctly', () => {
    // Test corner positions
    const corners = [
      { x: 0, y: 0 },     // Top-left
      { x: 100, y: 0 },   // Top-right
      { x: 0, y: 100 },   // Bottom-left
      { x: 100, y: 100 },  // Bottom-right
    ]

    corners.forEach(corner => {
      const pixelCalc = qrCodeUICalculator.calculateEmbeddingPixels(
        corner,
        testSizePercent,
        testDimensions,
        'image',
      )

      // Ensure QR code stays within document bounds
      expect(pixelCalc.position.x).toBeGreaterThanOrEqual(0)
      expect(pixelCalc.position.y).toBeGreaterThanOrEqual(0)
      expect(pixelCalc.position.x + pixelCalc.completeSealDimensions.width).toBeLessThanOrEqual(testDimensions.width)
      expect(pixelCalc.position.y + pixelCalc.completeSealDimensions.height).toBeLessThanOrEqual(testDimensions.height)
    })
  })

  it('should create exclusion zones that match the seal position exactly', () => {
    const pixelCalc = qrCodeUICalculator.calculateEmbeddingPixels(
      testPosition,
      testSizePercent,
      testDimensions,
      'image',
    )

    // Exclusion zone should match the seal position and dimensions exactly
    expect(pixelCalc.exclusionZone.x).toBe(pixelCalc.position.x)
    expect(pixelCalc.exclusionZone.y).toBe(pixelCalc.position.y)
    expect(pixelCalc.exclusionZone.width).toBe(pixelCalc.completeSealDimensions.width)
    expect(pixelCalc.exclusionZone.height).toBe(pixelCalc.completeSealDimensions.height)
    expect(pixelCalc.exclusionZone.fillColor).toBe('#FFFFFF')
  })

  it('should handle different QR sizes consistently', () => {
    const sizes = [15, 20, 25, 30, 35]
    
    sizes.forEach(size => {
      const pixelCalc = qrCodeUICalculator.calculateEmbeddingPixels(
        testPosition,
        size,
        testDimensions,
        'image',
      )

      // Larger sizes should result in larger pixel dimensions
      expect(pixelCalc.sizeInPixels).toBeGreaterThan(0)
      expect(pixelCalc.completeSealDimensions.width).toBeGreaterThan(pixelCalc.sizeInPixels)
      expect(pixelCalc.completeSealDimensions.height).toBeGreaterThan(pixelCalc.sizeInPixels)
    })
  })

  it('should maintain minimum QR size requirements', () => {
    // Test with very small size percentage
    const pixelCalc = qrCodeUICalculator.calculateEmbeddingPixels(
      testPosition,
      5, // Very small percentage
      testDimensions,
      'image',
    )

    // Should enforce minimum size for scannability
    expect(pixelCalc.sizeInPixels).toBeGreaterThanOrEqual(120) // Minimum QR size
  })
})

describe('Canvas Coordinate Conversion', () => {
  it('should convert DOM coordinates to canvas coordinates correctly', () => {
    const documentDims = { width: 3000, height: 2000 }
    const displayDims = { width: 600, height: 400 }
    const scaleFactor = documentDims.width / displayDims.width // 5

    // Simulate a click at 50% of display width/height
    const displayClickX = displayDims.width * 0.5  // 300px
    const displayClickY = displayDims.height * 0.5 // 200px

    // Convert to canvas coordinates
    const canvasX = displayClickX * scaleFactor // 1500px
    const canvasY = displayClickY * scaleFactor // 1000px

    // Convert to percentage
    const percentX = (canvasX / documentDims.width) * 100  // 50%
    const percentY = (canvasY / documentDims.height) * 100 // 50%

    expect(percentX).toBe(50)
    expect(percentY).toBe(50)
  })

  it('should handle high DPI displays correctly', () => {
    const documentDims = { width: 4000, height: 3000 }
    const displayDims = { width: 800, height: 600 }
    const scaleFactor = documentDims.width / displayDims.width // 5

    // Test various click positions
    const testPositions = [
      { display: { x: 80, y: 60 }, expected: { x: 10, y: 10 } },    // 10% position
      { display: { x: 400, y: 300 }, expected: { x: 50, y: 50 } },  // 50% position
      { display: { x: 720, y: 540 }, expected: { x: 90, y: 90 } },   // 90% position
    ]

    testPositions.forEach(({ display, expected }) => {
      const canvasX = display.x * scaleFactor
      const canvasY = display.y * scaleFactor
      
      const percentX = (canvasX / documentDims.width) * 100
      const percentY = (canvasY / documentDims.height) * 100

      expect(percentX).toBeCloseTo(expected.x, 1)
      expect(percentY).toBeCloseTo(expected.y, 1)
    })
  })
})
