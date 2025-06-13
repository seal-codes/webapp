/**
 * Hybrid QR Code reading service with fallback support
 * Uses jsQR as immediate fallback while rxing-wasm loads for better performance
 */

import jsQR from 'jsqr'
import { verificationService } from './verification-service'
import type { AttestationData } from '@/types/qrcode'
import { wasmGlobals } from './wasm-preloader'

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

interface QRScanOptions {
  waitForWasm?: boolean // Whether to wait for WASM if it's loading (default: true)
  wasmTimeout?: number  // Timeout for WASM loading in ms (default: 3000)
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
    wasmWaitTime?: number
  }
}

/**
 * Hybrid QR Reader Service with fallback support
 * Uses the global WASM preloader for optimal performance
 */
export class HybridQRReaderService {
  constructor() {
    // WASM preloading is now handled globally at app startup
    console.log('🔧 QR Reader Service initialized with global WASM preloader')
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
   * Scan an image for QR codes containing attestation data
   * Uses the best available engine (rxing-wasm if loaded, jsQR as fallback)
   * 
   * @param imageFile - The image file to scan
   * @param focusZone - Optional focus zone to crop image before scanning (improves performance and accuracy)
   * @param options - Scanning options
   * @returns Promise resolving to scan result
   */
  async scanImageForQR(
    imageFile: File,
    focusZone?: { x: number; y: number; width: number; height: number },
    options: QRScanOptions = {},
  ): Promise<QRScanResult> {
    const { waitForWasm = true, wasmTimeout = 3000 } = options
    const processingSteps: string[] = []
    let scannedRegions = 0
    const startTime = Date.now()
    let wasmWaitTime = 0

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

      // Wait for WASM if it's currently loading (configurable)
      const isWasmLoading = wasmGlobals.isWasmLoading()
      if (waitForWasm && isWasmLoading) {
        console.log(`⏳ WASM is loading, waiting up to ${wasmTimeout}ms for it to complete...`)
        processingSteps.push('Waiting for WASM to load')
        const wasmWaitStart = Date.now()
        await wasmGlobals.waitForWasm(wasmTimeout)
        wasmWaitTime = Date.now() - wasmWaitStart
        console.log(`⏳ Waited ${wasmWaitTime}ms for WASM`)
      }

      // Determine which engine to use
      const rxingWasm = wasmGlobals.getRxingWasm()
      const useRxing = !!rxingWasm
      const engine = useRxing ? 'rxing-wasm' : 'jsqr'
      console.log(`🔧 Using ${engine} for QR scanning (WASM ready: ${!!rxingWasm})`)
      processingSteps.push(`Using ${engine}`)

      let qrCode: QRCode | null = null

      if (focusZone) {
        // Scan with focus zone (crop to specific area)
        qrCode = await this.scanWithFocusZone(imageData, focusZone, engine, processingSteps)
        scannedRegions = 1
      } else {
        // Full image scan
        qrCode = await this.scanFullImage(imageData, engine, processingSteps)
        scannedRegions = 1
      }

      if (!qrCode) {
        return {
          found: false,
          error: 'No QR code found',
          debugInfo: {
            processingSteps,
            scannedRegions,
            totalRegions: scannedRegions,
            usedEngine: engine,
            wasmLoadTime: wasmGlobals.getLoadTime(),
            wasmWaitTime,
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
            wasmLoadTime: wasmGlobals.getLoadTime(),
            wasmWaitTime,
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
          wasmLoadTime: wasmGlobals.getLoadTime(),
          wasmWaitTime,
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
          usedEngine: wasmGlobals.getRxingWasm() ? 'rxing-wasm' : 'jsqr',
          wasmLoadTime: wasmGlobals.getLoadTime(),
          wasmWaitTime,
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
    processingSteps: string[],
  ): Promise<QRCode | null> {
    processingSteps.push('Full image scan')

    if (engine === 'rxing-wasm') {
      return await this.scanWithRxing(imageData, false) // false = quick scan for full image
    } else {
      return this.scanWithJsQR(imageData, false) // false = quick scan
    }
  }

  /**
   * Scan image with focus zone (crop to specific area before scanning)
   */
  private async scanWithFocusZone(
    imageData: ImageData,
    focusZone: { x: number; y: number; width: number; height: number },
    engine: 'jsqr' | 'rxing-wasm',
    processingSteps: string[],
  ): Promise<QRCode | null> {
    processingSteps.push('Scanning with focus zone (cropping image)')

    // Create a cropped version of the image data
    const canvas = document.createElement('canvas')
    canvas.width = focusZone.width
    canvas.height = focusZone.height
    const ctx = canvas.getContext('2d')!
    
    // Create a temporary canvas with the full image
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = imageData.width
    tempCanvas.height = imageData.height
    const tempCtx = tempCanvas.getContext('2d')!
    tempCtx.putImageData(imageData, 0, 0)
    
    // Draw the cropped area onto the target canvas
    ctx.drawImage(
      tempCanvas,
      focusZone.x, focusZone.y, focusZone.width, focusZone.height, // source rectangle
      0, 0, focusZone.width, focusZone.height // destination rectangle
    )

    const croppedImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    processingSteps.push(`Cropped to ${focusZone.width}x${focusZone.height} area`)

    let qrCode: QRCode | null = null
    if (engine === 'rxing-wasm') {
      qrCode = await this.scanWithRxing(croppedImageData, true) // true = try harder
    } else {
      qrCode = this.scanWithJsQR(croppedImageData, true) // true = try harder
    }

    // If QR code found, adjust coordinates back to original image space
    if (qrCode) {
      qrCode.location.x += focusZone.x
      qrCode.location.y += focusZone.y
      processingSteps.push('Adjusted QR code coordinates to original image space')
    }

    return qrCode
  }

  /**
   * Scan with rxing-wasm
   */
  private async scanWithRxing(imageData: ImageData, tryHarder: boolean): Promise<QRCode | null> {
    const rxingWasm = wasmGlobals.getRxingWasm()
    if (!rxingWasm) {
      return null
    }

    try {
      const luma8Data = rxingWasm.convert_imagedata_to_luma(imageData)
      const hints = new rxingWasm.DecodeHintDictionary()
      hints.set_hint(rxingWasm.DecodeHintTypes.PossibleFormats, 'qrcode')

      let result = null

      if (tryHarder) {
        hints.set_hint(rxingWasm.DecodeHintTypes.TryHarder, 'true')
        hints.set_hint(rxingWasm.DecodeHintTypes.AlsoInverted, 'true')
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
            height: imageData.height,
          },
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
          },
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
   * Wait for WASM to finish loading if it's currently loading
   */
  async waitForWasm(): Promise<boolean> {
    const result = await wasmGlobals.waitForWasm()
    return !!result
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
    const rxingWasm = wasmGlobals.getRxingWasm()
    const isLoading = wasmGlobals.isWasmLoading()
    
    return {
      rxingWasmAvailable: !!rxingWasm,
      rxingWasmLoading: isLoading,
      jsqrAvailable: true, // jsQR is always available
      recommendedEngine: rxingWasm ? 'rxing-wasm' : 'jsqr',
      wasmLoadTime: wasmGlobals.getLoadTime(),
    }
  }
}

/**
 * Default hybrid QR reader service instance
 */
export const hybridQRReaderService = new HybridQRReaderService()
