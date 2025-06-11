/**
 * QR Code reading service for extracting attestation data from images
 * Uses jsQR library with manual selection fallback for better QR code detection
 */

import jsQR from 'jsqr'
import { verificationService } from './verification-service'
import { qrAreaDetector } from './qr-area-detector'
import type { AttestationData } from '@/types/qrcode'
import type { DetectedQRRegion } from './qr-area-detector'

// Type for jsQR result
interface QRCode {
  data: string
  location: {
    topLeftCorner: { x: number; y: number }
    topRightCorner: { x: number; y: number }
    bottomLeftCorner: { x: number; y: number }
    bottomRightCorner: { x: number; y: number }
  }
}

/**
 * QR code detection result
 */
export interface QRCodeDetectionResult {
  /** Whether a QR code was found */
  found: boolean;
  /** The raw QR code data (URL) */
  data?: string;
  /** Decoded attestation data if it's a seal.codes QR */
  attestationData?: AttestationData;
  /** Position of QR code in image */
  location?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Error message if detection failed */
  error?: string;
  /** Debug information */
  debug?: {
    scannedExclusionZone: boolean;
    scannedFullImage: boolean;
    scannedDetectedAreas: boolean;
    qrCodesFound: number;
    imageProcessed: boolean;
    imageDimensions?: { width: number; height: number };
    processingSteps: string[];
    detectedAreas?: DetectedQRRegion[];
    areaDetectionTime?: number;
  };
}

/**
 * Service for reading QR codes from images with manual selection fallback
 */
export class QRReaderService {
  /**
   * Detect and read QR code from an image file
   * 
   * @param imageFile - The image file to scan
   * @param exclusionZone - Optional exclusion zone to scan first
   * @returns Promise resolving to QR code detection result
   */
  // eslint-disable-next-line complexity
  async readQRCodeFromImage(
    imageFile: File, 
    exclusionZone?: { x: number; y: number; width: number; height: number },
  ): Promise<QRCodeDetectionResult> {
    const processingSteps: string[] = []
    
    try {
      console.log('🔍 Starting QR code detection for:', imageFile.name)
      processingSteps.push('Started QR detection')
      
      // Convert image file to image data
      const imageData = await this.getImageDataFromFile(imageFile)
      console.log('📐 Image loaded, dimensions:', imageData.width, 'x', imageData.height)
      processingSteps.push(`Image loaded: ${imageData.width}x${imageData.height}`)
      
      let qrCode = null
      let scannedExclusionZone = false
      let scannedFullImage = false
      let scannedDetectedAreas = false
      let detectedAreas: DetectedQRRegion[] = []
      let areaDetectionTime = 0
      
      // Step 1: Try scanning the exclusion zone if provided
      if (exclusionZone) {
        console.log('🎯 Step 1: Scanning exclusion zone:', exclusionZone)
        processingSteps.push('Scanning exclusion zone')
        qrCode = await this.scanImageRegion(imageData, exclusionZone)
        scannedExclusionZone = true
        
        if (qrCode) {
          console.log('✅ QR code found in exclusion zone!')
          processingSteps.push('QR found in exclusion zone')
        } else {
          console.log('❌ No QR code found in exclusion zone')
          processingSteps.push('No QR in exclusion zone')
        }
      }
      
      // Step 2: If no QR code found, use minimal area detection (fast)
      if (!qrCode) {
        console.log('🔍 Step 2: Using minimal area detection...')
        processingSteps.push('Starting minimal area detection')
        
        const areaDetectionStart = performance.now()
        const areaResult = await qrAreaDetector.detectQRCodeAreas(imageData)
        areaDetectionTime = performance.now() - areaDetectionStart
        
        console.log(`📊 Area detection completed in ${areaDetectionTime.toFixed(2)}ms`)
        console.log(`📊 Found ${areaResult.regions.length} potential QR areas`)
        processingSteps.push(`Found ${areaResult.regions.length} potential areas`)
        
        detectedAreas = areaResult.regions
        
        // Try scanning only the top 3 most confident areas (limit for performance)
        const topAreas = areaResult.regions.slice(0, 3)
        for (let i = 0; i < topAreas.length && !qrCode; i++) {
          const region = topAreas[i]
          console.log(`🎯 Scanning detected area ${i + 1}/${topAreas.length}:`, region)
          processingSteps.push(`Scanning area ${i + 1} (confidence: ${region.confidence.toFixed(2)})`)
          
          qrCode = await this.scanImageRegion(imageData, region)
          scannedDetectedAreas = true
          
          if (qrCode) {
            console.log(`✅ QR code found in detected area ${i + 1}!`)
            processingSteps.push(`QR found in area ${i + 1}`)
            break
          }
        }
        
        if (!qrCode && topAreas.length > 0) {
          console.log('❌ No QR code found in detected areas')
          processingSteps.push('No QR found in detected areas')
        }
      }
      
      // Step 3: If still no QR code found, try a quick full image scan
      if (!qrCode) {
        console.log('🔍 Step 3: Quick full image scan...')
        processingSteps.push('Quick full image scan')
        
        // Only try the fastest scan method for full image
        qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        })
        scannedFullImage = true
        
        if (qrCode) {
          console.log('✅ QR code found in quick full image scan!')
          processingSteps.push('QR found in quick full scan')
        } else {
          console.log('❌ No QR code found in quick full image scan')
          processingSteps.push('No QR found in quick full scan')
        }
      }
      
      if (!qrCode) {
        return {
          found: false,
          error: 'No QR code found in the image. Try using manual selection.',
          debug: {
            scannedExclusionZone,
            scannedFullImage,
            scannedDetectedAreas,
            qrCodesFound: 0,
            imageProcessed: true,
            imageDimensions: { width: imageData.width, height: imageData.height },
            processingSteps,
            detectedAreas,
            areaDetectionTime,
          },
        }
      }
      
      console.log('📄 QR code data:', qrCode.data)
      processingSteps.push('QR data extracted')
      
      // Calculate QR code location
      const location = this.calculateQRLocation(qrCode, imageData)
      console.log('📍 QR code location:', location)
      processingSteps.push('Location calculated')
      
      // Check if this is a seal.codes verification URL
      const attestationData = this.extractAttestationFromURL(qrCode.data)
      
      if (attestationData) {
        console.log('✅ Successfully extracted attestation data:', attestationData)
        processingSteps.push('Attestation data extracted')
      } else {
        console.log('⚠️ QR code found but does not contain seal.codes data')
        processingSteps.push('QR found but not seal.codes format')
      }
      
      return {
        found: true,
        data: qrCode.data,
        attestationData,
        location,
        debug: {
          scannedExclusionZone,
          scannedFullImage,
          scannedDetectedAreas,
          qrCodesFound: 1,
          imageProcessed: true,
          imageDimensions: { width: imageData.width, height: imageData.height },
          processingSteps,
          detectedAreas,
          areaDetectionTime,
        },
      }
    } catch (error) {
      console.error('💥 Error reading QR code:', error)
      processingSteps.push(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return {
        found: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        debug: {
          scannedExclusionZone: false,
          scannedFullImage: false,
          scannedDetectedAreas: false,
          qrCodesFound: 0,
          imageProcessed: false,
          processingSteps,
        },
      }
    }
  }

  /**
   * Scan a specific region of an image for QR codes
   * 
   * @param imageData - Full image data
   * @param region - Region to scan
   * @returns QR code result or null
   */
  private async scanImageRegion(
    imageData: ImageData,
    region: { x: number; y: number; width: number; height: number },
  ): Promise<QRCode | null> {
    try {
      console.log('🎯 Scanning region:', region)
      
      // Ensure region is within image bounds
      const boundedRegion = {
        x: Math.max(0, Math.floor(region.x)),
        y: Math.max(0, Math.floor(region.y)),
        width: Math.min(imageData.width - Math.max(0, Math.floor(region.x)), Math.floor(region.width)),
        height: Math.min(imageData.height - Math.max(0, Math.floor(region.y)), Math.floor(region.height)),
      }
      
      console.log('📐 Bounded region:', boundedRegion)
      
      if (boundedRegion.width <= 0 || boundedRegion.height <= 0) {
        console.log('❌ Invalid region dimensions')
        return null
      }
      
      // Create a new canvas for the region
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        throw new Error('Could not get canvas context')
      }
      
      // Set canvas size to region size
      canvas.width = boundedRegion.width
      canvas.height = boundedRegion.height
      
      // Create temporary canvas with full image
      const tempCanvas = document.createElement('canvas')
      const tempCtx = tempCanvas.getContext('2d')
      
      if (!tempCtx) {
        throw new Error('Could not get temporary canvas context')
      }
      
      tempCanvas.width = imageData.width
      tempCanvas.height = imageData.height
      tempCtx.putImageData(imageData, 0, 0)
      
      // Draw the region to our target canvas
      ctx.drawImage(
        tempCanvas,
        boundedRegion.x, boundedRegion.y, boundedRegion.width, boundedRegion.height, // Source
        0, 0, boundedRegion.width, boundedRegion.height, // Destination
      )
      
      // Get image data for the region
      const regionImageData = ctx.getImageData(0, 0, boundedRegion.width, boundedRegion.height)
      
      // Try multiple scan approaches but limit them for performance
      console.log('🔍 Scanning region with limited approaches...')
      
      // Approach 1: Direct scan
      let qrCode = jsQR(regionImageData.data, regionImageData.width, regionImageData.height, {
        inversionAttempts: 'dontInvert',
      })
      
      if (qrCode) {
        console.log('✅ Found with direct scan')
        return qrCode
      }

      // Approach 2: With inversion attempts
      qrCode = jsQR(regionImageData.data, regionImageData.width, regionImageData.height, {
        inversionAttempts: 'attemptBoth',
      })
      
      if (qrCode) {
        console.log('✅ Found with inversion attempts')
        return qrCode
      }

      console.log('❌ Region scanning failed')
      return null
    } catch (error) {
      console.warn('💥 Error scanning image region:', error)
      return null
    }
  }

  /**
   * Scan image for QR codes and automatically extract attestation data
   * This is the main method for the verification workflow
   * 
   * @param imageFile - The image file to scan
   * @param exclusionZone - Optional exclusion zone to check first
   * @returns Promise resolving to attestation data if found
   */
  async scanForAttestationData(
    imageFile: File,
    exclusionZone?: { x: number; y: number; width: number; height: number },
  ): Promise<{
    found: boolean;
    attestationData?: AttestationData;
    qrLocation?: { x: number; y: number; width: number; height: number };
    error?: string;
    debug?: {
      processingSteps: string[];
      scannedRegions: number;
      totalRegions: number;
    };
  }> {
    console.log('🔍 Scanning for attestation data in:', imageFile.name)
    
    const result = await this.readQRCodeFromImage(imageFile, exclusionZone)
    
    console.log('📊 QR scan result:', result)
    
    if (!result.found) {
      return {
        found: false,
        error: result.error || 'No QR code found',
        debug: result.debug,
      }
    }
    
    if (!result.attestationData) {
      return {
        found: false,
        error: `QR code found but it does not contain seal.codes attestation data. Found: ${result.data?.substring(0, 100)}...`,
        debug: result.debug,
      }
    }
    
    return {
      found: true,
      attestationData: result.attestationData,
      qrLocation: result.location,
      debug: result.debug,
    }
  }

  /**
   * Convert image file to ImageData for QR code scanning
   * 
   * @param imageFile - The image file
   * @returns Promise resolving to ImageData
   */
  private async getImageDataFromFile(imageFile: File): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }
      
      img.onload = () => {
        try {
          // Set canvas dimensions to match image
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          
          console.log('🖼️ Canvas dimensions set to:', canvas.width, 'x', canvas.height)
          
          // Draw image to canvas
          ctx.drawImage(img, 0, 0)
          
          // Get image data
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          console.log('📊 Image data extracted, length:', imageData.data.length)
          
          resolve(imageData)
        } catch (error) {
          console.error('💥 Error processing image:', error)
          reject(error)
        }
      }
      
      img.onerror = (error) => {
        console.error('💥 Failed to load image:', error)
        reject(new Error('Failed to load image'))
      }
      
      img.src = URL.createObjectURL(imageFile)
    })
  }

  /**
   * Calculate QR code location from jsQR result
   * 
   * @param qrCode - jsQR detection result
   * @param imageData - Original image data
   * @returns QR code location
   */
  private calculateQRLocation(
    qrCode: QRCode,
  ): { x: number; y: number; width: number; height: number } {
    const { location } = qrCode
    
    // Calculate bounding box from corner points
    const xs = [
      location.topLeftCorner.x,
      location.topRightCorner.x,
      location.bottomLeftCorner.x,
      location.bottomRightCorner.x,
    ]
    const ys = [
      location.topLeftCorner.y,
      location.topRightCorner.y,
      location.bottomLeftCorner.y,
      location.bottomRightCorner.y,
    ]
    
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    }
  }

  /**
   * Extract attestation data from a URL if it's a seal.codes verification URL
   * 
   * @param url - The URL from the QR code
   * @returns Attestation data if valid, undefined otherwise
   */
  private extractAttestationFromURL(url: string): AttestationData | undefined {
    try {
      console.log('🔍 Attempting to extract attestation data from URL:', url)
      
      // Check if this is a seal.codes verification URL
      // Support both full URLs and just the path
      const urlPattern = /(?:https?:\/\/[^/]+)?\/v\/([A-Za-z0-9_-]+)(?:\?.*)?$/
      const match = url.match(urlPattern)
      
      if (!match) {
        console.log('❌ URL does not match seal.codes verification pattern')
        console.log('Expected pattern: /v/{encodedData}')
        return undefined
      }
      
      const encodedData = match[1]
      console.log('✅ Extracted encoded data:', encodedData)
      
      const decodedResult = verificationService.decodeFromQR(encodedData)
      console.log('📊 Decode result:', decodedResult)
      
      if (decodedResult.isValid) {
        console.log('✅ Successfully decoded attestation data')
        return decodedResult.attestationData
      }
      
      console.log('❌ Decoded data is not valid:', decodedResult.error)
      return undefined
    } catch (error) {
      console.warn('💥 Failed to extract attestation data from URL:', error)
      return undefined
    }
  }

  /**
   * Check if an image likely contains a QR code by doing a quick scan
   * Useful for showing hints to users
   * 
   * @param imageFile - The image file to check
   * @returns Promise resolving to whether QR code is likely present
   */
  async hasQRCode(imageFile: File): Promise<boolean> {
    try {
      const result = await this.readQRCodeFromImage(imageFile)
      return result.found
    } catch {
      return false
    }
  }
}

/**
 * Default QR reader service instance
 */
export const qrReaderService = new QRReaderService()