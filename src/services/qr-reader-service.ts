/**
 * QR Code reading service for extracting attestation data from images
 * Uses rxing-wasm library with manual selection fallback for better QR code detection
 */

import { 
  decode_barcode, 
  decode_barcode_with_hints,
  convert_imagedata_to_luma, 
  DecodeHintDictionary, 
  DecodeHintTypes,
} from 'rxing-wasm'
import { verificationService } from './verification-service'
import { qrAreaDetector } from './qr-area-detector'
import type { AttestationData } from '@/types/qrcode'

// Interface for internal QR scan result
interface QRScanResult {
  found: boolean
  error?: string
  data?: string
  attestationData?: AttestationData
  location?: { x: number; y: number; width: number; height: number }
  debug?: {
    processingSteps: string[]
    detectedAreas?: unknown[]
  }
}
import type { DetectedQRRegion } from './qr-area-detector'

// Type for rxing-wasm result (simplified interface)
interface QRCode {
  data: string
  location: {
    x: number
    y: number
    width: number
    height: number
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
        
        // Try scanning the full image with rxing-wasm
        qrCode = await this.scanImageData(imageData, false) // false = don't try harder for speed
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
      const location = this.calculateQRLocation(qrCode)
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
   * Scan ImageData for QR codes using rxing-wasm
   * 
   * @param imageData - Image data to scan
   * @param tryHarder - Whether to use more intensive scanning
   * @returns QR code result or null
   */
  private async scanImageData(imageData: ImageData, tryHarder: boolean = true): Promise<QRCode | null> {
    try {
      // Convert ImageData to luma format for rxing-wasm
      const luma8Data = convert_imagedata_to_luma(imageData)
      
      // Create hints for better QR detection
      const hints = new DecodeHintDictionary()
      hints.set_hint(DecodeHintTypes.PossibleFormats, 'qrcode')
      
      if (tryHarder) {
        hints.set_hint(DecodeHintTypes.TryHarder, 'true')
        hints.set_hint(DecodeHintTypes.AlsoInverted, 'true')
        
        const result = decode_barcode_with_hints(luma8Data, imageData.width, imageData.height, hints)
        
        if (result) {
          return {
            data: result.text(),
            location: {
              x: 0, // rxing-wasm doesn't provide exact corner coordinates
              y: 0,
              width: imageData.width,
              height: imageData.height,
            },
          }
        }
      } else {
        // Quick scan without hints
        const result = decode_barcode(luma8Data, imageData.width, imageData.height, false)
        
        if (result) {
          return {
            data: result.text(),
            location: {
              x: 0, // rxing-wasm doesn't provide exact corner coordinates
              y: 0,
              width: imageData.width,
              height: imageData.height,
            },
          }
        }
      }
      
      return null
    } catch (error) {
      console.log('rxing-wasm scan failed:', error)
      return null
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
      
      // Scan the region with rxing-wasm
      console.log('🔍 Scanning region with rxing-wasm...')
      
      const qrCode = await this.scanImageData(regionImageData, true) // Use tryHarder for regions
      
      if (qrCode) {
        console.log('✅ Found QR code in region')
        // Adjust location to be relative to full image
        qrCode.location = {
          x: boundedRegion.x,
          y: boundedRegion.y,
          width: boundedRegion.width,
          height: boundedRegion.height,
        }
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
    
    return this.processQRScanResult(result)
  }

  /**
   * Process the QR scan result and format the response
   */
  private processQRScanResult(result: QRScanResult): {
    found: boolean;
    attestationData?: AttestationData;
    qrLocation?: { x: number; y: number; width: number; height: number };
    error?: string;
    debug?: {
      processingSteps: string[];
      scannedRegions: number;
      totalRegions: number;
    };
  } {
    if (!result.found) {
      return this.createNotFoundResult(result)
    }
    
    if (!result.attestationData) {
      return this.createInvalidDataResult(result)
    }
    
    return this.createSuccessResult(result)
  }

  /**
   * Create result for when no QR code is found
   */
  private createNotFoundResult(result: QRScanResult) {
    return {
      found: false,
      error: result.error || 'No QR code found',
      debug: {
        processingSteps: result.debug?.processingSteps || [],
        scannedRegions: result.debug?.detectedAreas?.length || 0,
        totalRegions: result.debug?.detectedAreas?.length || 0,
      },
    }
  }

  /**
   * Create result for when QR code is found but doesn't contain attestation data
   */
  private createInvalidDataResult(result: QRScanResult) {
    return {
      found: false,
      error: `QR code found but it does not contain seal.codes attestation data. Found: ${result.data?.substring(0, 100)}...`,
      debug: {
        processingSteps: result.debug?.processingSteps || [],
        scannedRegions: result.debug?.detectedAreas?.length || 1,
        totalRegions: result.debug?.detectedAreas?.length || 1,
      },
    }
  }

  /**
   * Create result for successful attestation data extraction
   */
  private createSuccessResult(result: QRScanResult) {
    return {
      found: true,
      attestationData: result.attestationData,
      qrLocation: result.location,
      debug: {
        processingSteps: result.debug?.processingSteps || [],
        scannedRegions: result.debug?.detectedAreas?.length || 1,
        totalRegions: result.debug?.detectedAreas?.length || 1,
      },
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
   * Calculate QR code location from rxing-wasm result
   * Note: rxing-wasm doesn't provide exact corner coordinates like jsQR,
   * so we return the region that was scanned or estimate based on image size
   * 
   * @param qrCode - rxing-wasm detection result
   * @param imageData - Original image data
   * @returns QR code location
   */
  private calculateQRLocation(
    qrCode: QRCode,
  ): { x: number; y: number; width: number; height: number } {
    // rxing-wasm doesn't provide exact corner coordinates like jsQR
    // Return the location that was already set during scanning
    return qrCode.location
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
      
      console.log('❌ Decoded data is not valid:', decodedResult.errorCode)
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