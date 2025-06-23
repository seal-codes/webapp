/**
 * PDF document hashing service
 * Handles cryptographic and composite perceptual hashing for PDF documents
 */

import { PDFDocument } from 'pdf-lib'
import type { PDFHashes, PDFImageData, PDFTextContent } from '@/types/pdf'
import { PDFProcessingError } from '@/types/errors'

/**
 * Service for calculating PDF-specific hashes
 */
export class PDFHashService {
  /**
   * Calculate comprehensive hashes for PDF document
   * 
   * @param pdfFile - The PDF file to hash
   * @returns Promise resolving to PDF hashes
   */
  async calculatePDFHashes(pdfFile: File): Promise<PDFHashes> {
    try {
      // Load PDF document
      const arrayBuffer = await pdfFile.arrayBuffer()
      const pdfDoc = await PDFDocument.load(arrayBuffer)
      
      // Calculate cryptographic hash - try content-normalized version first
      const cryptographic = await this.calculateNormalizedPDFHash(arrayBuffer)
      
      // Extract and hash text content (64-bit)
      const textHash = await this.extractAndHashText(pdfDoc)
      
      // Extract and hash all images (64-bit)
      const imageHash = await this.extractAndHashImages(pdfDoc)
      
      // Combine into 64-bit composite hash
      const compositePerceptual = this.combineTextAndImageHashes(textHash, imageHash)
      
      return { cryptographic, compositePerceptual }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('password') || error.message.includes('encrypted')) {
          throw new PDFProcessingError('pdf_encrypted', 'PDF is password protected')
        }
        if (error.message.includes('Invalid PDF')) {
          throw new PDFProcessingError('pdf_corrupted', 'PDF file is corrupted or invalid')
        }
      }
      throw new PDFProcessingError('document_processing_failed', `Failed to process PDF: ${error}`)
    }
  }

  /**
   * Calculate normalized PDF hash that ignores minor metadata differences
   * This helps handle cases where PDF-lib makes small formatting changes during save
   */
  private async calculateNormalizedPDFHash(arrayBuffer: ArrayBuffer): Promise<string> {
    try {
      console.log('🔢 Calculating normalized PDF hash...')
      
      // Convert to string to normalize metadata
      const pdfString = new TextDecoder('latin1').decode(arrayBuffer)
      
      // Normalize common metadata differences that PDF-lib might introduce
      const normalizedPdf = pdfString
        // Normalize stream lengths (the main source of our 1-byte difference)
        .replace(/\/Length\s+\d+/g, '/Length NORMALIZED')
        // Normalize object references that might change during save
        .replace(/\d+\s+0\s+R/g, 'X 0 R')
        // Normalize timestamps that might be updated
        .replace(/\/CreationDate\s*\([^)]+\)/g, '/CreationDate (NORMALIZED)')
        .replace(/\/ModDate\s*\([^)]+\)/g, '/ModDate (NORMALIZED)')
        // Normalize whitespace differences
        .replace(/\s+/g, ' ')
        .trim()
      
      console.log('📊 Original PDF size:', arrayBuffer.byteLength, 'bytes')
      console.log('📊 Normalized content length:', normalizedPdf.length, 'characters')
      
      // Calculate hash of normalized content
      const normalizedBytes = new TextEncoder().encode(normalizedPdf)
      const hash = await this.calculateSHA256(normalizedBytes.buffer)
      
      console.log('🔢 Normalized PDF hash:', hash)
      return hash
      
    } catch (error) {
      console.warn('⚠️ Normalized hash calculation failed, falling back to raw hash:', error)
      // Fallback to raw hash if normalization fails
      return this.calculateSHA256(arrayBuffer)
    }
  }
  
  /**
   * Calculate SHA-256 hash of data
   */
  private async calculateSHA256(data: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }
  
  /**
   * Extract all text and create 64-bit hash
   * Uses first 64 bits of SHA-256 (no truncation of smaller hash)
   */
  private async extractAndHashText(pdfDoc: PDFDocument): Promise<string> {
    try {
      // Extract text from all pages
      const allText = await this.extractAllTextFromPDF(pdfDoc)
      
      // Normalize text (remove extra whitespace, normalize line endings)
      const normalizedText = this.normalizeText(allText)
      
      // Calculate SHA-256 and take first 64 bits
      const textBytes = new TextEncoder().encode(normalizedText)
      const sha256Hash = await this.calculateSHA256(textBytes)
      
      return sha256Hash.substring(0, 16) // First 64 bits (16 hex characters)
    } catch (error) {
      // If text extraction fails, return zero hash
      console.warn('Text extraction failed, using zero hash:', error)
      return '0000000000000000'
    }
  }
  
  /**
   * Extract images and create composite 64-bit perceptual hash
   */
  private async extractAndHashImages(pdfDoc: PDFDocument): Promise<string> {
    try {
      const images = await this.extractAllImagesFromPDF(pdfDoc)
      const imageHashes: string[] = []
      
      for (const imageData of images) {
        // Skip very small images (likely icons, bullets, decorations)
        if (imageData.width < 32 || imageData.height < 32) {
          continue
        }
        
        // Calculate perceptual hash for each significant image
        const perceptualHash = await this.calculateImagePerceptualHash(imageData)
        imageHashes.push(perceptualHash)
      }
      
      // Combine all image hashes using XOR
      return this.combineImageHashes(imageHashes)
    } catch (error) {
      // If image extraction fails, return zero hash
      console.warn('Image extraction failed, using zero hash:', error)
      return '0000000000000000'
    }
  }
  
  /**
   * Combine text and image hashes into final 64-bit composite
   */
  private combineTextAndImageHashes(textHash: string, imageHash: string): string {
    const textBits = BigInt('0x' + textHash)    // 64 bits from text
    const imageBits = BigInt('0x' + imageHash)  // 64 bits from images
    
    // XOR combination for final 64-bit result
    const combined = textBits ^ imageBits
    return combined.toString(16).padStart(16, '0')
  }
  
  /**
   * Normalize text content for consistent hashing
   */
  private normalizeText(text: string): string {
    return text
      .replace(/\s+/g, ' ')           // Normalize whitespace
      .replace(/\r\n|\r|\n/g, '\n')   // Normalize line endings
      .trim()                         // Remove leading/trailing whitespace
  }
  
  /**
   * Extract all text content from PDF
   * Note: This is a simplified implementation - real PDF text extraction is complex
   */
  private async extractAllTextFromPDF(pdfDoc: PDFDocument): Promise<string> {
    // TODO: Implement proper text extraction using pdf.js or similar
    // For now, return empty string as placeholder
    // This will be implemented when we add pdf.js integration
    return ''
  }
  
  /**
   * Extract all images from PDF
   * Note: This is a simplified implementation - real PDF image extraction is complex
   */
  private async extractAllImagesFromPDF(pdfDoc: PDFDocument): Promise<PDFImageData[]> {
    // TODO: Implement proper image extraction using pdf-lib
    // For now, return empty array as placeholder
    // This will be implemented in the next iteration
    return []
  }
  
  /**
   * Calculate perceptual hash for image data
   */
  private async calculateImagePerceptualHash(imageData: PDFImageData): Promise<string> {
    // TODO: Implement perceptual hashing for extracted image data
    // For now, return a placeholder hash
    // This will use the same perceptual hashing logic as the existing image service
    return '0000000000000000'
  }
  
  /**
   * Combine multiple image hashes using XOR
   */
  private combineImageHashes(hashes: string[]): string {
    if (hashes.length === 0) {
      return '0000000000000000' // 64-bit zero if no images
    }
    
    let combined = 0n
    for (const hash of hashes) {
      combined ^= BigInt('0x' + hash)
    }
    
    return combined.toString(16).padStart(16, '0')
  }
}

/**
 * Default PDF hash service instance
 */
export const pdfHashService = new PDFHashService()
