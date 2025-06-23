/**
 * Document verification service
 * Handles QR code data encoding/decoding and document integrity verification with ultra-compact encoding
 */

import { encode, decode } from 'cbor-x'
import { documentHashService } from './document-hash-service'
import { attestationBuilder } from './attestation-builder'
import { signatureVerificationService } from './signature-verification-service'
import type { AttestationData, QRCodeExclusionZone } from '@/types/qrcode'
import type { SignatureVerificationResult } from './signature-verification-service'
import { debugVerification } from './debug-verification'

export type VerificationStatus =
  | 'verified_exact'           // Exact cryptographic match
  | 'verified_visual'          // Visual content matches (compressed)
  | 'modified'                 // Document has been modified
  | 'error_hash_mismatch'      // Hash doesn't match
  | 'error_invalid_format'     // Invalid document format
  | 'error_processing'         // Error during processing
  | 'error_signature_invalid'  // Signature verification failed
  | 'error_signature_missing'  // No signature found

/**
 * Verification result for document integrity check
 */
export interface VerificationResult {
  /** Whether the document integrity is verified */
  isValid: boolean;
  /** Detailed verification status */
  status: VerificationStatus;
  /** Detailed comparison results */
  details: {
    cryptographicMatch: boolean;
    perceptualMatch: boolean;
    documentType: string;
    signatureValid?: boolean;
    signatureVerification?: SignatureVerificationResult;
  };
}

/**
 * Decoded verification data from QR code
 */
export interface DecodedVerificationData {
  /** The original attestation data */
  attestationData: AttestationData;
  /** Whether decoding was successful */
  isValid: boolean;
  /** Error code if decoding failed */
  errorCode?: 'invalid_format' | 'decode_failed' | 'invalid_structure';
}

/**
 * Helper function to extract exclusion zone from decoded verification data
 */
export function getExclusionZone(decodedData: DecodedVerificationData | null): QRCodeExclusionZone | undefined {
  if (!decodedData?.attestationData?.e) {
    return undefined
  }

  const e = decodedData.attestationData.e
  return {
    x: e.x,
    y: e.y,
    width: e.w,
    height: e.h,
    fillColor: `#${e.f}`,
  }
}

/**
 * Ultra-compact data structure for QR encoding
 * Uses minimal field names and optimized data types
 */
interface UltraCompactData {
  /** Document hashes (cryptographic and perceptual) */
  h: {
    /** Cryptographic hash (SHA-256) */
    c: string;
    /** Perceptual hash (pHash) */
    p: string;
    /** Difference hash (dHash) */
    d: string;
  };
  /** Unix timestamp */
  t: number;
  /** Identity (provider:user) */
  i: string;
  /** Service key */
  s: string;
  /** Exclusion zone [x,y,w,h,f] - required for images, not used for PDFs */
  e?: (number | string)[];
  /** Signature (base64) */
  sig?: string;
  /** User URL (optional) */
  u?: string;
}

/**
 * Service for handling document verification with ultra-compact encoding
 */
export class VerificationService {
  /**
   * Scan an image file for QR codes
   * 
   * @param imageFile - The image file to scan
   * @param focusZone - Optional focus zone to crop image before scanning
   * @returns Promise resolving to scan result
   */
  async scanImageForQR(
    imageFile: File, 
    focusZone?: { x: number; y: number; width: number; height: number },
    options?: { waitForWasm?: boolean; wasmTimeout?: number },
  ) {
    // Use hybrid QR reader with fallback support (jsQR while rxing-wasm loads)
    const { hybridQRReaderService } = await import('./qr-reader-hybrid')
    return hybridQRReaderService.scanImageForQR(imageFile, focusZone, options)
  }

  /**
   * Scan a PDF file for embedded QR codes
   * 
   * @param pdfFile - The PDF file to scan
   * @returns Promise resolving to scan result
   */
  async scanPDFForQR(pdfFile: File) {
    console.log('🔍 Starting PDF QR code scan')
    
    try {
      // Import PDF processing service
      const { pdfVerificationService } = await import('./pdf-verification-service')
      
      // Extract seal metadata from PDF
      const sealMetadata = await pdfVerificationService.extractSealMetadata(pdfFile)
      
      if (sealMetadata) {
        console.log('✅ Found seal metadata in PDF:', sealMetadata)
        
        // First, try to use attestation data directly from metadata (preferred method)
        if (sealMetadata.attestationData) {
          console.log('✅ Using attestation data directly from PDF metadata')
          return {
            found: true,
            attestationData: sealMetadata.attestationData,
            debugInfo: {
              processingSteps: [
                'PDF metadata extracted',
                'Attestation data found in metadata',
                'Using direct attestation data'
              ],
              scannedRegions: 1,
              totalRegions: 1
            }
          }
        }
        
        // Fallback: Extract QR code image from PDF and decode it (for older sealed PDFs)
        if (sealMetadata.qrLocation) {
          console.log('⚠️ No attestation data in metadata, falling back to QR image extraction')
          
          // For PDFs, we need to extract the actual QR code content
          // Since the QR code contains the attestation data, we need to:
          // 1. Render the PDF page containing the QR code
          // 2. Extract the QR code area as an image
          // 3. Scan the QR code to get the attestation data
          
          const attestationData = await this.extractAttestationFromPDFQR(pdfFile, sealMetadata.qrLocation)
          
          if (attestationData) {
            return {
              found: true,
              attestationData: attestationData,
              debugInfo: {
                processingSteps: [
                  'PDF metadata extracted',
                  'No direct attestation data',
                  'QR location identified',
                  'PDF page rendered to image',
                  'QR code area extracted',
                  'QR code decoded',
                  'Attestation data parsed'
                ],
                scannedRegions: 1,
                totalRegions: 1
              }
            }
          }
        }
      }
      
      console.log('❌ No QR code found in PDF')
      return {
        found: false,
        attestationData: null,
        debugInfo: {
          processingSteps: [
            'PDF metadata checked',
            'No seal metadata found or QR extraction failed'
          ],
          scannedRegions: 0,
          totalRegions: 1
        }
      }
      
    } catch (error) {
      console.error('❌ Error scanning PDF for QR code:', error)
      throw error
    }
  }

  /**
   * Extract attestation data from PDF QR code
   */
  private async extractAttestationFromPDFQR(pdfFile: File, qrLocation: any): Promise<AttestationData | null> {
    try {
      console.log('🎯 Extracting QR code image from PDF and decoding it')
      
      // Import PDF-lib for PDF processing
      const { PDFDocument } = await import('pdf-lib')
      
      // Load the PDF
      const pdfDoc = await PDFDocument.load(await pdfFile.arrayBuffer())
      const pages = pdfDoc.getPages()
      
      if (qrLocation.pageNumber < 1 || qrLocation.pageNumber > pages.length) {
        console.error('❌ Invalid page number in QR location')
        return null
      }
      
      const targetPage = pages[qrLocation.pageNumber - 1]
      const { width: pageWidth, height: pageHeight } = targetPage.getSize()
      
      console.log('📄 PDF page dimensions:', { pageWidth, pageHeight })
      console.log('📍 QR location:', qrLocation)
      
      // Convert PDF page to canvas
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('Could not get canvas context')
      }
      
      // Set canvas size to match PDF page
      const scale = 2 // Higher resolution for better QR detection
      canvas.width = pageWidth * scale
      canvas.height = pageHeight * scale
      ctx.scale(scale, scale)
      
      // Render PDF page to canvas using PDF.js
      const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
      
      // Set worker source - use the CDN version for reliability
      GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs'
      
      const loadingTask = getDocument(await pdfFile.arrayBuffer())
      const pdf = await loadingTask.promise
      const page = await pdf.getPage(qrLocation.pageNumber)
      
      const viewport = page.getViewport({ scale: scale })
      
      await page.render({
        canvasContext: ctx,
        viewport: viewport
      }).promise
      
      console.log('✅ PDF page rendered to canvas')
      
      // Extract QR code area from the rendered canvas
      const qrCanvas = document.createElement('canvas')
      const qrCtx = qrCanvas.getContext('2d')
      if (!qrCtx) {
        throw new Error('Could not get QR canvas context')
      }
      
      // Set QR canvas size
      qrCanvas.width = qrLocation.width * scale
      qrCanvas.height = qrLocation.height * scale
      
      // Copy QR area from main canvas to QR canvas
      // Note: PDF coordinates are from bottom-left, canvas coordinates are from top-left
      const canvasY = (pageHeight - qrLocation.y - qrLocation.height) * scale
      const canvasX = qrLocation.x * scale
      
      qrCtx.drawImage(
        canvas,
        canvasX, canvasY, qrLocation.width * scale, qrLocation.height * scale,
        0, 0, qrLocation.width * scale, qrLocation.height * scale
      )
      
      console.log('✅ QR code area extracted from PDF')
      
      // Convert QR canvas to blob
      const qrBlob = await new Promise<Blob>((resolve) => {
        qrCanvas.toBlob((blob) => {
          resolve(blob!)
        }, 'image/png')
      })
      
      // Create a File object from the blob
      const qrImageFile = new File([qrBlob], 'qr-from-pdf.png', { type: 'image/png' })
      
      console.log('🔍 Scanning extracted QR code image with hybridQRReader')
      
      // Use hybrid QR reader to decode the extracted QR image
      const { hybridQRReaderService } = await import('./qr-reader-hybrid')
      const scanResult = await hybridQRReaderService.scanImageForQR(qrImageFile)
      
      if (scanResult.found && scanResult.attestationData) {
        console.log('✅ QR code decoded successfully from PDF')
        return scanResult.attestationData
      } else {
        console.log('❌ Failed to decode QR code from extracted PDF image')
        return null
      }
      
    } catch (error) {
      console.error('❌ Error extracting QR from PDF:', error)
      return null
    }
  }

  /**
   * Verify document integrity against attestation data with proper verification order
   * 
   * @param document - The document file to verify
   * @param attestationData - The attestation data from QR code
   * @returns Promise resolving to verification result
   */
  async verifyDocument(document: File, attestationData: AttestationData): Promise<VerificationResult> {
    return this.verifyDocumentIntegrity(document, attestationData)
  }

  /**
   * Debug verification process step by step (for troubleshooting)
   * 
   * @param document - Document to verify
   * @param attestationData - Attestation data from QR code
   * @returns Debug information
   */
  async debugVerification(document: File, attestationData: AttestationData) {
    return debugVerification(document, attestationData)
  }

  /**
   * Encode attestation data for QR code URL with maximum compression
   * 
   * @param attestationData - The attestation data to encode
   * @returns URL-safe encoded string
   */
  encodeForQR(attestationData: AttestationData): string {
    try {
      // Create ultra-compact version
      const compactData = this.createUltraCompactData(attestationData)

      console.log('📦 Original attestation data size:', JSON.stringify(attestationData).length, 'chars')
      console.log('📦 Compact data size:', JSON.stringify(compactData).length, 'chars')

      // Encode to CBOR binary format (most efficient)
      const cborData = encode(compactData)
      console.log('📦 CBOR data size:', cborData.length, 'bytes')

      // Convert to base64url (URL-safe base64)
      const base64 = btoa(String.fromCharCode(...new Uint8Array(cborData)))
      const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

      console.log('📦 Final encoded size:', base64url.length, 'characters')
      console.log('📦 Compression ratio:', Math.round((1 - base64url.length / JSON.stringify(attestationData).length) * 100), '%')

      return base64url
    } catch (error) {
      console.error('Failed to encode attestation data:', error)
      throw new Error('Failed to encode verification data')
    }
  }

  /**
   * Create ultra-compact version of attestation data
   * Optimizes for minimal QR code size while preserving essential information
   * 
   * @param attestationData - Original attestation data
   * @returns Ultra-compact version
   */
  private createUltraCompactData(attestationData: AttestationData): UltraCompactData {
    // Create minimal version with efficient encoding
    const compact: UltraCompactData = {
      // Include both cryptographic and perceptual hashes
      h: {
        c: attestationData.h.c,    // Cryptographic hash
        p: attestationData.h.p.p,  // Perceptual hash
        d: attestationData.h.p.d,  // Difference hash
      },

      // Timestamp: Convert to Unix timestamp (saves ~15 characters vs ISO string)
      t: Math.floor(new Date(attestationData.t).getTime()),

      // Identity: Combine provider and user with separator (saves field overhead)
      // PRESERVE FULL USER ID - no truncation
      i: attestationData.i.p + ':' + attestationData.i.id,

      // Service: PRESERVE FULL KEY ID - no truncation
      s: attestationData.s.k,
      e: attestationData.e && [
        Math.round(attestationData.e.x),
        Math.round(attestationData.e.y),
        Math.round(attestationData.e.w),
        Math.round(attestationData.e.h),
        attestationData.e.f, // Fill color is required for hash consistency
      ]
    }

    // Include signature if present
    if (attestationData.sig) {
      compact.sig = attestationData.sig
    }

    // Include full user URL if present - PRESERVE FULL URL
    if (attestationData.u) {
      compact.u = attestationData.u
    }

    return compact
  }

  /**
   * Expand ultra-compact data back to full attestation data
   * 
   * @param compactData - Ultra-compact data
   * @returns Full attestation data
   */
  private expandCompactData(compactData: UltraCompactData): AttestationData {
    // Parse identity string
    const identityParts = compactData.i.split(':')
    const provider = identityParts[0] || 'unknown'
    const userId = identityParts[1] || 'unknown'

    // Reconstruct full attestation data
    const expanded: AttestationData = {
      h: {
        c: compactData.h.c,
        p: {
          p: compactData.h.p,
          d: compactData.h.d,
        },
      },
      t: new Date(compactData.t).toISOString(),
      i: {
        p: provider,
        id: userId,
      },
      s: {
        n: 'sc',
        k: compactData.s,
      },
      // Exclusion zone - only exists for images, not PDFs
      e: compactData.e ? {
        x: compactData.e[0] as number,
        y: compactData.e[1] as number,
        w: compactData.e[2] as number,
        h: compactData.e[3] as number,
        f: compactData.e[4] as string, // Use the original fill color for hash consistency
      } : undefined,
    }

    // Add signature if present
    if (compactData.sig) {
      expanded.sig = compactData.sig
    }

    // Add user URL if present
    if (compactData.u) {
      expanded.u = compactData.u
    }

    return expanded
  }

  /**
   * Decode attestation data from QR code URL parameter
   * 
   * @param encodedData - URL-safe encoded string from QR code
   * @returns Decoded attestation data or error information
   */
  decodeFromQR(encodedData: string): DecodedVerificationData {
    try {
      console.log('🔍 Decoding data of length:', encodedData.length)

      // Add padding if needed and convert back from base64url
      let base64 = encodedData.replace(/-/g, '+').replace(/_/g, '/')
      while (base64.length % 4) {
        base64 += '='
      }

      // Convert from base64 to binary
      const binaryString = atob(base64)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      // Decode from CBOR
      const compactData = decode(bytes) as UltraCompactData
      console.log('📦 Decoded compact data:', compactData)

      // Expand to full attestation data
      const attestationData = this.expandCompactData(compactData)
      console.log('📦 Expanded attestation data:', attestationData)

      // Validate the structure
      if (!this.validateAttestationStructure(attestationData)) {
        return {
          attestationData: {} as AttestationData,
          isValid: false,
          errorCode: 'invalid_structure',
        }
      }

      return {
        attestationData,
        isValid: true,
      }
    } catch (error) {
      console.error('Failed to decode verification data:', error)
      return {
        attestationData: {} as AttestationData,
        isValid: false,
        errorCode: 'decode_failed',
      }
    }
  }

  /**
   * Generate verification URL for QR code
   * 
   * @param attestationData - The attestation data
   * @param baseUrl - Base URL of the application
   * @returns Complete verification URL
   */
  generateVerificationUrl(attestationData: AttestationData, baseUrl: string): string {
    const encodedData = this.encodeForQR(attestationData)
    const url = `${baseUrl}/v/${encodedData}`

    console.log('🔗 Generated verification URL length:', url.length)

    return url
  }

  /**
   * Verify document integrity against attestation data with proper verification order
   * CORRECTED ORDER: Hash verification first, then signature verification
   * 
   * @param document - The document file to verify
   * @param attestationData - The attestation data from QR code
   * @returns Promise resolving to verification result
   */
  async verifyDocumentIntegrity(
    document: File,
    attestationData: AttestationData,
  ): Promise<VerificationResult> {
    try {
      console.log('🔍 Starting document verification with corrected order...')

      // STEP 1: Verify document hashes first (client-side verification)
      console.log('📊 Step 1: Verifying document hashes...')

      // Extract exclusion zone from attestation data
      const exclusionZone = attestationBuilder.extractExclusionZone(attestationData)

      // Calculate hashes for the uploaded document with exclusion zone
      // For PDFs, this will attempt to remove the QR code before calculating hashes
      const calculatedHashes = await documentHashService.calculateDocumentHashesForVerification(
        document,
        exclusionZone,
      )

      // Compare cryptographic hash
      const storedHash = attestationData.h.c
      const calculatedHash = calculatedHashes.cryptographic

      const cryptographicMatch = calculatedHash === storedHash

      // Compare perceptual hashes (with some tolerance for compression)
      const pHashMatch = this.comparePerceptualHashes(
        calculatedHashes.pHash,
        attestationData.h.p.p,
      )
      const dHashMatch = this.comparePerceptualHashes(
        calculatedHashes.dHash,
        attestationData.h.p.d,
      )
      const perceptualMatch = pHashMatch || dHashMatch

      console.log('📊 Hash verification results:', {
        cryptographicMatch,
        perceptualMatch,
        pHashMatch,
        dHashMatch,
      })

      // If document hashes don't match, return early (no need to verify signature)
      if (!cryptographicMatch && !perceptualMatch) {
        console.log('❌ Document hashes do not match - document has been modified')
        return {
          isValid: false,
          status: 'modified',
          details: {
            cryptographicMatch: false,
            perceptualMatch: false,
            documentType: document.type,
            signatureValid: false, // We know it's invalid because document was modified
          },
        }
      }

      console.log('✅ Document hashes verified, proceeding with signature verification...')

      // STEP 2: Verify the signature online (only if hashes match)
      console.log('🔐 Step 2: Verifying signature online...')

      let signatureVerification: SignatureVerificationResult | undefined
      let signatureValid = false

      if (attestationData.sig) {
        console.log('🔐 Verifying signature online...')
        signatureVerification = await signatureVerificationService.verifySignature(attestationData)
        signatureValid = signatureVerification.isValid
        
        console.log('📋 Signature verification result:', {
          isValid: signatureValid,
          error: signatureVerification.error,
        })
      } else {
        console.log('⚠️ No signature found in attestation data')
      }

      // If signature verification fails, return signature error
      if (!signatureValid) {
        return {
          isValid: false,
          status: attestationData.sig ? 'error_signature_invalid' : 'error_signature_missing',
          details: {
            cryptographicMatch,
            perceptualMatch,
            documentType: document.type,
            signatureValid: false,
            signatureVerification,
          },
        }
      }

      // STEP 3: Determine final verification result
      let status: VerificationStatus
      let isValid: boolean

      if (cryptographicMatch) {
        isValid = true
        status = 'verified_exact'
      } else if (perceptualMatch) {
        isValid = true
        status = 'verified_visual'
      } else {
        // This shouldn't happen since we checked hashes earlier, but just in case
        isValid = false
        status = 'modified'
      }

      console.log('📊 Final verification completed:', {
        signatureValid,
        cryptographicMatch,
        perceptualMatch,
        finalStatus: status,
      })

      return {
        isValid,
        status,
        details: {
          cryptographicMatch,
          perceptualMatch,
          documentType: document.type,
          signatureValid: true,
          signatureVerification,
        },
      }
    } catch (error) {
      console.error('Error verifying document:', error)
      return {
        isValid: false,
        status: 'error_processing',
        details: {
          cryptographicMatch: false,
          perceptualMatch: false,
          documentType: document.type,
          signatureValid: false,
        },
      }
    }
  }

  /**
   * Compare perceptual hashes using Hamming distance
   * 
   * @param hash1 - First hash
   * @param hash2 - Second hash
   * @returns Whether hashes are similar enough
   */
  private comparePerceptualHashes(hash1: string, hash2: string): boolean {
    // If either hash is empty, return false
    if (!hash1 || !hash2) {
      return false
    }

    // Calculate Hamming distance (number of differing bits)
    let distance = 0
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] !== hash2[i]) {
        distance++
      }
    }

    // Calculate similarity percentage
    const similarity = 1 - (distance / hash1.length)

    // Consider hashes similar if they match at least 90%
    return similarity >= 0.9
  }

  /**
   * Validate attestation data structure
   * 
   * @param data - Data to validate
   * @returns Whether the structure is valid
   */
  // TODO: zod schema?
  // eslint-disable-next-line complexity
  private validateAttestationStructure(data: AttestationData) {
    return (
      data &&
      typeof data === 'object' &&
      data.h &&
      typeof data.h.c === 'string' &&
      data.h.p &&
      typeof data.h.p.p === 'string' &&
      typeof data.h.p.d === 'string' &&
      typeof data.t === 'string' &&
      data.i &&
      typeof data.i.p === 'string' &&
      typeof data.i.id === 'string' &&
      data.s &&
      typeof data.s.n === 'string' &&
      typeof data.s.k === 'string' &&
      // Exclusion zone is optional (only exists for images, not PDFs)
      (!data.e || (
        typeof data.e.x === 'number' &&
        typeof data.e.y === 'number' &&
        typeof data.e.w === 'number' &&
        typeof data.e.h === 'number' &&
        typeof data.e.f === 'string'
      ))
    )
  }

  /**
   * Get encoding statistics for optimization analysis
   * 
   * @param attestationData - Attestation data to analyze
   * @returns Encoding statistics
   */
  getEncodingStats(attestationData: AttestationData): {
    originalSize: number;
    compactSize: number;
    cborSize: number;
    finalSize: number;
    compressionRatio: number;
    recommendations: string[];
  } {
    const originalJson = JSON.stringify(attestationData)
    const compactData = this.createUltraCompactData(attestationData)
    const compactJson = JSON.stringify(compactData)
    const cborData = encode(compactData)
    const finalEncoded = this.encodeForQR(attestationData)

    const compressionRatio = (1 - finalEncoded.length / originalJson.length) * 100

    const recommendations: string[] = []

    if (finalEncoded.length > 100) {
      recommendations.push('Consider shorter user identifiers')
    }

    if (attestationData.u && attestationData.u.length > 20) {
      recommendations.push('User URL is long - consider shortening or removing')
    }

    if (compressionRatio < 50) {
      recommendations.push('Low compression ratio - review data structure')
    }

    return {
      originalSize: originalJson.length,
      compactSize: compactJson.length,
      cborSize: cborData.length,
      finalSize: finalEncoded.length,
      compressionRatio,
      recommendations,
    }
  }
}

/**
 * Default verification service instance
 */
export const verificationService = new VerificationService()