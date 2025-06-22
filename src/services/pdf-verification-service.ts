/**
 * PDF verification service
 * Handles verification of sealed PDF documents
 */

import { PDFDocument } from 'pdf-lib'
import type { PDFVerificationResult, PDFSealMetadata } from '@/types/pdf'
import type { AttestationData } from '@/types/qrcode'
import { PDFProcessingError } from '@/types/errors'
import { PDFHashService } from './pdf-hash-service'
import { pdfSealingService } from './pdf-sealing-service'
import { VerificationService } from './verification-service'

/**
 * Service for verifying sealed PDF documents
 */
export class PDFVerificationService extends VerificationService {
  private pdfHashService = new PDFHashService()

  /**
   * Verify sealed PDF document
   * 
   * @param pdfFile - The sealed PDF file to verify
   * @returns Promise resolving to verification result
   */
  async verifyPDFDocument(pdfFile: File): Promise<PDFVerificationResult> {
    try {
      // 1. Extract QR code data from PDF
      const qrData = await this.extractQRFromPDF(pdfFile)
      
      // 2. Extract seal metadata from PDF document metadata
      const sealMetadata = await this.extractSealMetadata(pdfFile)
      
      // 3. Create clean PDF by removing QR code
      const cleanPDF = await this.removeQRCodeFromPDF(pdfFile, sealMetadata.qrLocation)
      
      // 4. Calculate hashes of clean PDF
      const currentHashes = await this.pdfHashService.calculatePDFHashes(cleanPDF)
      
      // 5. Compare hashes and verify signature
      const hashMatch = this.compareHashes(currentHashes, qrData.h)
      const signatureValid = await this.verifySignature(qrData)
      
      return {
        isValid: hashMatch && signatureValid,
        hashMatch,
        signatureValid,
        attestationData: qrData,
        metadata: sealMetadata,
      }
    } catch (error) {
      console.error('PDF verification failed:', error)
      
      if (error instanceof PDFProcessingError) {
        return {
          isValid: false,
          error: error.message,
          errorCode: error.code,
        }
      }
      
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown verification error',
        errorCode: 'VERIFICATION_FAILED',
      }
    }
  }
  
  /**
   * Extract QR code from PDF document
   * Note: This is a placeholder - actual QR extraction would need image processing
   */
  private async extractQRFromPDF(pdfFile: File): Promise<AttestationData> {
    // TODO: Implement QR code extraction from PDF
    // This would involve:
    // 1. Rendering PDF pages to images
    // 2. Scanning images for QR codes
    // 3. Decoding QR code data
    
    // For now, throw an error to indicate this needs implementation
    throw new PDFProcessingError(
      'document_processing_failed',
      'QR code extraction from PDF not yet implemented'
    )
  }
  
  /**
   * Extract seal metadata from PDF document
   */
  private async extractSealMetadata(pdfFile: File): Promise<PDFSealMetadata> {
    try {
      const pdfDoc = await PDFDocument.load(await pdfFile.arrayBuffer())
      const keywords = pdfDoc.getKeywords() || []
      
      // Find seal.codes metadata in keywords
      const sealKeyword = keywords.find(k => k.startsWith('seal.codes:'))
      if (!sealKeyword) {
        throw new PDFProcessingError(
          'document_processing_failed',
          'No seal.codes metadata found in PDF'
        )
      }
      
      const metadataJson = sealKeyword.replace('seal.codes:', '')
      return JSON.parse(metadataJson) as PDFSealMetadata
    } catch (error) {
      if (error instanceof PDFProcessingError) {
        throw error
      }
      throw new PDFProcessingError(
        'document_processing_failed',
        `Failed to extract PDF metadata: ${error}`
      )
    }
  }
  
  /**
   * Remove QR code from PDF to create clean version for verification
   */
  private async removeQRCodeFromPDF(
    pdfFile: File, 
    qrLocation: PDFSealMetadata['qrLocation']
  ): Promise<File> {
    try {
      return await pdfSealingService.removeQRCodeFromPDF(pdfFile, qrLocation)
    } catch (error) {
      throw new PDFProcessingError(
        'document_processing_failed',
        `Failed to remove QR code for verification: ${error}`
      )
    }
  }
  
  /**
   * Compare calculated hashes with stored hashes
   */
  private compareHashes(
    currentHashes: { cryptographic: string; compositePerceptual: string },
    storedHashes: AttestationData['h']
  ): boolean {
    // Compare cryptographic hash (exact match required)
    const cryptoMatch = currentHashes.cryptographic === storedHashes.c
    
    // Compare perceptual hash (stored in p.p for PDFs)
    const perceptualMatch = currentHashes.compositePerceptual === storedHashes.p.p
    
    console.log('Hash comparison:', {
      cryptographic: {
        current: currentHashes.cryptographic,
        stored: storedHashes.c,
        match: cryptoMatch,
      },
      perceptual: {
        current: currentHashes.compositePerceptual,
        stored: storedHashes.p.p,
        match: perceptualMatch,
      },
    })
    
    // For PDFs, both hashes should match
    return cryptoMatch && perceptualMatch
  }
  
  /**
   * Verify cryptographic signature
   * Note: This delegates to the parent VerificationService
   */
  private async verifySignature(attestationData: AttestationData): Promise<boolean> {
    try {
      // Use parent class signature verification
      return await this.verifyAttestationSignature(attestationData)
    } catch (error) {
      console.error('Signature verification failed:', error)
      return false
    }
  }
  
  /**
   * Check if a PDF file appears to be sealed with seal.codes
   */
  async isPDFSealed(pdfFile: File): Promise<boolean> {
    try {
      await this.extractSealMetadata(pdfFile)
      return true
    } catch (error) {
      return false
    }
  }
  
  /**
   * Get basic information about a sealed PDF without full verification
   */
  async getPDFSealInfo(pdfFile: File): Promise<{
    metadata: PDFSealMetadata;
    hasQRCode: boolean;
  }> {
    const metadata = await this.extractSealMetadata(pdfFile)
    
    // TODO: Check if QR code is actually present at the specified location
    // For now, assume it's present if metadata exists
    const hasQRCode = true
    
    return {
      metadata,
      hasQRCode,
    }
  }
}

/**
 * Default PDF verification service instance
 */
export const pdfVerificationService = new PDFVerificationService()
