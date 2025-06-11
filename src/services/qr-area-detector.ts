/**
 * Minimal QR Code area detection service
 * Focuses on performance with simple detection methods
 */

/**
 * Detected QR code region
 */
export interface DetectedQRRegion {
  /** X position in pixels */
  x: number;
  /** Y position in pixels */
  y: number;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** Confidence score (0-1) */
  confidence: number;
  /** Detection method used */
  method: string;
}

/**
 * QR area detection result
 */
export interface QRAreaDetectionResult {
  /** Whether potential QR areas were found */
  found: boolean;
  /** Array of detected regions, sorted by confidence */
  regions: DetectedQRRegion[];
  /** Debug information */
  debug: {
    imageProcessed: boolean;
    imageDimensions: { width: number; height: number };
    detectionMethods: string[];
    processingTime: number;
  };
}

/**
 * Minimal service for detecting QR code areas in images
 * Focuses on performance over accuracy
 */
export class QRAreaDetector {
  /**
   * Detect potential QR code areas using only the fastest methods
   * 
   * @param imageData - Image data to analyze
   * @returns Detection result with potential QR regions
   */
  async detectQRCodeAreas(imageData: ImageData): Promise<QRAreaDetectionResult> {
    const startTime = performance.now()
    const detectionMethods: string[] = []
    const regions: DetectedQRRegion[] = []

    console.log('🔍 Starting minimal QR area detection on image:', imageData.width, 'x', imageData.height)

    try {
      // Only use corner detection - fastest and most reliable
      console.log('🔍 Using corner-based detection only')
      detectionMethods.push('corner-detection')
      const cornerRegions = this.detectCornerRegions(imageData)
      regions.push(...cornerRegions)

      const processingTime = performance.now() - startTime
      console.log(`✅ QR area detection completed in ${processingTime.toFixed(2)}ms`)
      console.log(`📊 Found ${regions.length} potential QR regions`)

      return {
        found: regions.length > 0,
        regions: regions.sort((a, b) => b.confidence - a.confidence),
        debug: {
          imageProcessed: true,
          imageDimensions: { width: imageData.width, height: imageData.height },
          detectionMethods,
          processingTime,
        },
      }
    } catch (error) {
      console.error('💥 Error in QR area detection:', error)
      return {
        found: false,
        regions: [],
        debug: {
          imageProcessed: false,
          imageDimensions: { width: imageData.width, height: imageData.height },
          detectionMethods,
          processingTime: performance.now() - startTime,
        },
      }
    }
  }

  /**
   * Detect regions in typical QR code locations (corners and center)
   * 
   * @param imageData - Image data to analyze
   * @returns Array of detected regions
   */
  private detectCornerRegions(imageData: ImageData): DetectedQRRegion[] {
    const regions: DetectedQRRegion[] = []
    const { width, height } = imageData
    
    // Try different QR sizes
    const qrSizes = [
      Math.min(width, height) * 0.15, // Small QR
      Math.min(width, height) * 0.25, // Medium QR
      Math.min(width, height) * 0.35,  // Large QR
    ]
    
    for (const qrSize of qrSizes) {
      const margin = qrSize * 0.05 // Small margin from edges
      
      // Define typical QR locations
      const locations = [
        { x: margin, y: margin, name: 'top-left' },
        { x: width - qrSize - margin, y: margin, name: 'top-right' },
        { x: margin, y: height - qrSize - margin, name: 'bottom-left' },
        { x: width - qrSize - margin, y: height - qrSize - margin, name: 'bottom-right' },
        { x: (width - qrSize) / 2, y: (height - qrSize) / 2, name: 'center' },
      ]
      
      for (const location of locations) {
        if (location.x >= 0 && location.y >= 0 && 
            location.x + qrSize <= width && location.y + qrSize <= height) {
          
          // Simple confidence based on location and size
          let confidence = 0.5
          
          // Prefer corners for QR codes
          if (location.name.includes('corner')) {
            confidence += 0.2
          }
          
          // Prefer medium sizes
          if (qrSize === qrSizes[1]) {
            confidence += 0.1
          }
          
          regions.push({
            x: Math.round(location.x),
            y: Math.round(location.y),
            width: Math.round(qrSize),
            height: Math.round(qrSize),
            confidence,
            method: `corner-${location.name}-${Math.round(qrSize)}`,
          })
        }
      }
    }
    
    console.log(`📊 Corner detection found ${regions.length} potential regions`)
    return regions
  }
}

/**
 * Default QR area detector instance
 */
export const qrAreaDetector = new QRAreaDetector()