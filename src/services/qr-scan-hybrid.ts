/**
 * Hybrid QR Code scanning service with fallback support
 * Uses jsQR as immediate fallback while rxing-wasm loads for better performance
 */

import jsQR from 'jsqr'
import type { AttestationData } from '@/types/qrcode'
import { verificationService } from './verification-service'

// Lazy import for rxing-wasm to avoid blocking the main bundle
let rxingWasm: any = null
let rxingWasmLoading = false

interface QRScanResult {
  found: boolean
  attestationData?: AttestationData
  debugInfo?: {
    processingSteps: string[]
    scannedRegions: number
    totalRegions: number
    usedEngine?: 'jsqr' | 'rxing-wasm'
    wasmLoadTime?: number
  }
}

/**
 * Hybrid QR Scan Service with fallback support
 * Provides immediate QR scanning with jsQR while loading rxing-wasm for better performance
 */
export class HybridQRScanService {
  private wasmLoadStartTime: number | null = null

  constructor() {
    // Start loading rxing-wasm in the background (skip in test environment)
    if (!this.isTestEnvironment()) {
      this.preloadRxingWasm()
    } else {
      console.log('🧪 Test environment detected, skipping WASM preload for scan service')
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
      console.log('🚀 Preloading rxing-wasm for QR scanning...')
      rxingWasm = await import('rxing-wasm')
      const loadTime = Date.now() - (this.wasmLoadStartTime || 0)
      console.log(`✅ rxing-wasm loaded for scanning in ${loadTime}ms`)
    } catch (error) {
      console.warn('⚠️ Failed to load rxing-wasm for scanning, will use jsQR fallback:', error)
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

      let imageData: ImageData

      if (exclusionZone) {
        // Apply exclusion zone by filling it with black
        ctx.fillStyle = 'black'
        ctx.fillRect(exclusionZone.x, exclusionZone.y, exclusionZone.width, exclusionZone.height)
        processingSteps.push('Exclusion zone applied')
      }

      imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      processingSteps.push('Image data extracted')

      // Determine which engine to use
      const useRxing = rxingWasm && !rxingWasmLoading
      const engine = useRxing ? 'rxing-wasm' : 'jsqr'
      console.log(`🔧 Using ${engine} for QR scanning`)
      processingSteps.push(`Using ${engine}`)

      // Scan for QR code
      let qrData: string | null = null

      if (engine === 'rxing-wasm' && rxingWasm) {
        qrData = await this.scanWithRxing(imageData)
      } else {
        qrData = this.scanWithJsQR(imageData)
      }

      if (!qrData) {
        return {
          found: false,
          debugInfo: {
            processingSteps,
            scannedRegions: 1,
            totalRegions: 1,
            usedEngine: engine,
            wasmLoadTime: this.wasmLoadStartTime ? Date.now() - this.wasmLoadStartTime : undefined,
          },
        }
      }

      processingSteps.push('QR code found')

      // Try to decode attestation data
      const attestationData = await this.extractAttestationData(qrData)

      if (!attestationData) {
        return {
          found: false,
          debugInfo: {
            processingSteps: [...processingSteps, 'QR found but no attestation data'],
            scannedRegions: 1,
            totalRegions: 1,
            usedEngine: engine,
            wasmLoadTime: this.wasmLoadStartTime ? Date.now() - this.wasmLoadStartTime : undefined,
          },
        }
      }

      processingSteps.push('Attestation data decoded')

      const totalTime = Date.now() - startTime
      console.log(`✅ QR scan completed in ${totalTime}ms using ${engine}`)

      return {
        found: true,
        attestationData,
        debugInfo: {
          processingSteps,
          scannedRegions: 1,
          totalRegions: 1,
          usedEngine: engine,
          wasmLoadTime: this.wasmLoadStartTime ? Date.now() - this.wasmLoadStartTime : undefined,
        },
      }
    } catch (error) {
      console.error('💥 QR scan failed:', error)
      return {
        found: false,
        debugInfo: {
          processingSteps: [...processingSteps, `Error: ${error}`],
          scannedRegions: 1,
          totalRegions: 1,
          usedEngine: rxingWasm ? 'rxing-wasm' : 'jsqr',
          wasmLoadTime: this.wasmLoadStartTime ? Date.now() - this.wasmLoadStartTime : undefined,
        },
      }
    }
  }

  /**
   * Scan with rxing-wasm
   */
  private async scanWithRxing(imageData: ImageData): Promise<string | null> {
    if (!rxingWasm) return null

    try {
      const luma8Data = rxingWasm.convert_imagedata_to_luma(imageData)
      const hints = new rxingWasm.DecodeHintDictionary()
      hints.set_hint(rxingWasm.DecodeHintTypes.TryHarder, "true")
      hints.set_hint(rxingWasm.DecodeHintTypes.PossibleFormats, "qrcode")
      hints.set_hint(rxingWasm.DecodeHintTypes.AlsoInverted, "true")

      const result = rxingWasm.decode_barcode_with_hints(luma8Data, imageData.width, imageData.height, hints)

      if (result) {
        return result.text()
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
  private scanWithJsQR(imageData: ImageData): string | null {
    try {
      const result = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      })

      return result ? result.data : null
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
 * Default hybrid QR scan service instance
 */
export const hybridQRScanService = new HybridQRScanService()
