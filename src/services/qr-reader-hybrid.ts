/**
 * Hybrid QR Code reading service with fallback support
 * Uses jsQR as immediate fallback while rxing-wasm loads for better performance
 */

import jsQR from 'jsqr'
import { verificationService } from './verification-service'
import { qrAreaDetector } from './qr-area-detector'
import type { AttestationData } from '@/types/qrcode'
import type { DetectedQRRegion } from './qr-area-detector'

// Lazy import for rxing-wasm to avoid blocking the main bundle
let rxingWasm: any = null
let rxingWasmLoading = false

// Type for unified QR result
interface QRCode {
  data: string
  location: {
    x: number
    y: number
    width: number
    height: number
  }
}

interface QRScanResult {
  found: boolean
  attestationData?: AttestationData
  qrLocation?: { x: number; y: number; width: number; height: number }
  error?: string
  debugInfo?: {
    processingSteps: string[]
    scannedRegions: number
    totalRegions: number
    usedEngine?: 'jsqr' | 'rxing-wasm'
    wasmLoadTime?: number
  }
}

/**
 * Hybrid QR Reader Service with fallback support
 * Provides immediate QR scanning with jsQR while loading rxing-wasm for better performance
 */
export class HybridQRReaderService {
  private wasmLoadStartTime: number | null = null

  constructor() {
    // Start loading rxing-wasm in the background (skip in test environment)
    if (!this.isTestEnvironment()) {
      this.preloadRxingWasm()
    } else {
      console.log('🧪 Test environment detected, skipping WASM preload')
    }
  }

  /**
   * Detect if we're running in a test environment
   */
  private isTestEnvironment(): boolean {
    return (
      typeof process !== 'undefined' && 
      (process.env.NODE_ENV === 'test' || 
       process.env.VITEST === 'true' ||
       typeof (globalThis as any).describe !== 'undefined')
    )
  }

  /**
   * Preload rxing-wasm in the background
   */
  private async preloadRxingWasm(): Promise<void> {
    if (rxingWasm || rxingWasmLoading) return

    rxingWasmLoading = true
    this.wasmLoadStartTime = Date.now()

    try {
      console.log('🚀 Preloading rxing-wasm in background...')
      rxingWasm = await import('rxing-wasm')
      const loadTime = Date.now() - (this.wasmLoadStartTime || 0)
      console.log(`✅ rxing-wasm loaded successfully in ${loadTime}ms`)
    } catch (error) {
      console.warn('⚠️ Failed to load rxing-wasm, will use jsQR fallback:', error)
      rxingWasm = null
    } finally {
      rxingWasmLoading = false
    }
  }

  /**
   * Scan an image for QR codes containing attestation data
   * Uses the best available engine (rxing-wasm if loaded, jsQR as fallback)
   * 
   * @param imageFile - The image file to scan
   * @param exclusionZone - Optional exclusion zone to avoid scanning
   * @returns Promise resolving to scan result
   */
  async scanImageForQR(
    imageFile: File,
    exclusionZone?: { x: number; y: number; width: number; height: number }
  ): Promise<QRScanResult> {
    const processingSteps: string[] = []
    let scannedRegions = 0
    const startTime = Date.now()

    try {
      console.log('🔍 Starting hybrid QR scan...')
      processingSteps.push('Hybrid scan started')

      // Load image
      const image = await this.loadImage(imageFile)
      processingSteps.push('Image loaded')

      // Create canvas and get image data
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(image, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      processingSteps.push('Image data extracted')

      // Determine which engine to use
      const useRxing = rxingWasm && !rxingWasmLoading
      const engine = useRxing ? 'rxing-wasm' : 'jsqr'
      console.log(`🔧 Using ${engine} for QR scanning`)
      processingSteps.push(`Using ${engine}`)

      let qrCode: QRCode | null = null

      if (exclusionZone) {
        // Scan with exclusion zone
        qrCode = await this.scanWithExclusionZone(imageData, exclusionZone, engine, processingSteps)
        scannedRegions = 1
      } else {
        // Full image scan
        qrCode = await this.scanFullImage(imageData, engine, processingSteps)
        scannedRegions = 1
      }

      if (!qrCode) {
        const totalTime = Date.now() - startTime
        return {
          found: false,
          error: 'No QR code found',
          debugInfo: {
            processingSteps,
            scannedRegions,
            totalRegions: scannedRegions,
            usedEngine: engine,
            wasmLoadTime: this.wasmLoadStartTime ? Date.now() - this.wasmLoadStartTime : undefined,
          },
        }
      }

      // Extract attestation data
      const attestationData = await this.extractAttestationData(qrCode.data)
      processingSteps.push('Attestation data extracted')

      if (!attestationData) {
        return {
          found: false,
          error: `QR code found but does not contain seal.codes attestation data. Found: ${qrCode.data.substring(0, 100)}...`,
          debugInfo: {
            processingSteps,
            scannedRegions,
            totalRegions: scannedRegions,
            usedEngine: engine,
            wasmLoadTime: this.wasmLoadStartTime ? Date.now() - this.wasmLoadStartTime : undefined,
          },
        }
      }

      const totalTime = Date.now() - startTime
      console.log(`✅ QR scan completed in ${totalTime}ms using ${engine}`)

      return {
        found: true,
        attestationData,
        qrLocation: qrCode.location,
        debugInfo: {
          processingSteps,
          scannedRegions,
          totalRegions: scannedRegions,
          usedEngine: engine,
          wasmLoadTime: this.wasmLoadStartTime ? Date.now() - this.wasmLoadStartTime : undefined,
        },
      }
    } catch (error) {
      console.error('💥 QR scan failed:', error)
      return {
        found: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        debugInfo: {
          processingSteps,
          scannedRegions,
          totalRegions: scannedRegions,
          usedEngine: rxingWasm ? 'rxing-wasm' : 'jsqr',
          wasmLoadTime: this.wasmLoadStartTime ? Date.now() - this.wasmLoadStartTime : undefined,
        },
      }
    }
  }

  /**
   * Scan full image for QR codes
   */
  private async scanFullImage(
    imageData: ImageData,
    engine: 'jsqr' | 'rxing-wasm',
    processingSteps: string[]
  ): Promise<QRCode | null> {
    processingSteps.push('Full image scan')

    if (engine === 'rxing-wasm' && rxingWasm) {
      return await this.scanWithRxing(imageData, false) // false = quick scan for full image
    } else {
      return this.scanWithJsQR(imageData, false) // false = quick scan
    }
  }

  /**
   * Scan image with exclusion zone
   */
  private async scanWithExclusionZone(
    imageData: ImageData,
    exclusionZone: { x: number; y: number; width: number; height: number },
    engine: 'jsqr' | 'rxing-wasm',
    processingSteps: string[]
  ): Promise<QRCode | null> {
    processingSteps.push('Scanning with exclusion zone')

    // Create a copy of the image data and black out the exclusion zone
    const canvas = document.createElement('canvas')
    canvas.width = imageData.width
    canvas.height = imageData.height
    const ctx = canvas.getContext('2d')!
    ctx.putImageData(imageData, 0, 0)

    // Black out exclusion zone
    ctx.fillStyle = 'black'
    ctx.fillRect(exclusionZone.x, exclusionZone.y, exclusionZone.width, exclusionZone.height)

    const modifiedImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    if (engine === 'rxing-wasm' && rxingWasm) {
      return await this.scanWithRxing(modifiedImageData, true) // true = try harder
    } else {
      return this.scanWithJsQR(modifiedImageData, true) // true = try harder
    }
  }

  /**
   * Scan with rxing-wasm
   */
  private async scanWithRxing(imageData: ImageData, tryHarder: boolean): Promise<QRCode | null> {
    if (!rxingWasm) return null

    try {
      const luma8Data = rxingWasm.convert_imagedata_to_luma(imageData)
      const hints = new rxingWasm.DecodeHintDictionary()
      hints.set_hint(rxingWasm.DecodeHintTypes.PossibleFormats, "qrcode")

      let result = null

      if (tryHarder) {
        hints.set_hint(rxingWasm.DecodeHintTypes.TryHarder, "true")
        hints.set_hint(rxingWasm.DecodeHintTypes.AlsoInverted, "true")
        result = rxingWasm.decode_barcode_with_hints(luma8Data, imageData.width, imageData.height, hints)
      } else {
        result = rxingWasm.decode_barcode(luma8Data, imageData.width, imageData.height, false)
      }

      if (result) {
        return {
          data: result.text(),
          location: {
            x: 0, // rxing-wasm doesn't provide exact coordinates
            y: 0,
            width: imageData.width,
            height: imageData.height
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
   * Scan with jsQR
   */
  private scanWithJsQR(imageData: ImageData, tryHarder: boolean): QRCode | null {
    try {
      const options = tryHarder 
        ? { inversionAttempts: 'attemptBoth' as const }
        : { inversionAttempts: 'dontInvert' as const }

      const result = jsQR(imageData.data, imageData.width, imageData.height, options)

      if (result) {
        // Calculate bounding box from jsQR corner points
        const { location } = result
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
          data: result.data,
          location: {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
          }
        }
      }

      return null
    } catch (error) {
      console.log('jsQR scan failed:', error)
      return null
    }
  }

  /**
   * Load image from file
   */
  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })
  }

  /**
   * Extract attestation data from QR code data
   */
  private async extractAttestationData(qrData: string): Promise<AttestationData | undefined> {
    try {
      // Check if it's a verification URL
      if (qrData.includes('/v/')) {
        const urlParts = qrData.split('/v/')
        if (urlParts.length === 2) {
          const encodedData = urlParts[1]
          const decodedResult = verificationService.decodeFromQR(encodedData)
          
          if (decodedResult.isValid && decodedResult.attestationData) {
            return decodedResult.attestationData
          }
        }
      }
      
      // Try direct CBOR decoding
      const decodedResult = verificationService.decodeFromQR(qrData)
      if (decodedResult.isValid && decodedResult.attestationData) {
        return decodedResult.attestationData
      }
      
      return undefined
    } catch (error) {
      console.warn('Failed to extract attestation data:', error)
      return undefined
    }
  }

  /**
   * Manually trigger WASM loading (useful for testing)
   */
  async loadWasmManually(): Promise<boolean> {
    if (rxingWasm) return true
    
    try {
      await this.preloadRxingWasm()
      return !!rxingWasm
    } catch (error) {
      console.warn('Manual WASM loading failed:', error)
      return false
    }
  }

  /**
   * Get information about the current QR scanning capabilities
   */
  getEngineInfo(): {
    rxingWasmAvailable: boolean
    rxingWasmLoading: boolean
    jsqrAvailable: boolean
    recommendedEngine: 'jsqr' | 'rxing-wasm'
    wasmLoadTime?: number
  } {
    return {
      rxingWasmAvailable: !!rxingWasm,
      rxingWasmLoading,
      jsqrAvailable: true, // jsQR is always available
      recommendedEngine: rxingWasm ? 'rxing-wasm' : 'jsqr',
      wasmLoadTime: this.wasmLoadStartTime ? Date.now() - this.wasmLoadStartTime : undefined,
    }
  }
}

/**
 * Default hybrid QR reader service instance
 */
export const hybridQRReaderService = new HybridQRReaderService()
