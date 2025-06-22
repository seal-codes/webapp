/**
 * PDF sealing service using pdf-lib
 * Handles embedding QR codes and metadata into PDF documents
 */

import { PDFDocument, rgb } from 'pdf-lib'
import type { PDFSealingOptions, PDFSealMetadata } from '@/types/pdf'
import { PDFProcessingError } from '@/types/errors'

/**
 * Service for sealing PDF documents with QR codes
 */
export class PDFSealingService {
  /**
   * Seal PDF with QR code and metadata
   * 
   * @param options - Sealing options
   * @returns Promise resolving to sealed PDF file
   */
  async sealPDF(options: PDFSealingOptions): Promise<File> {
    try {
      const pdfDoc = await PDFDocument.load(await options.originalFile.arrayBuffer())
      
      // 1. Embed QR code as image on specified page
      await this.embedQRCodeAsImage(pdfDoc, options)
      
      // 2. Store seal metadata in PDF document metadata
      await this.addSealMetadata(pdfDoc, {
        sealCodesVersion: '1.0',
        qrLocation: {
          pageNumber: options.pageNumber,
          x: options.position.x,
          y: options.position.y,
          width: options.sizeInPixels,
          height: options.sizeInPixels,
        },
        originalHashInfo: {
          algorithm: 'SHA256+TextSHA256+ImagePerceptual',
          timestamp: new Date().toISOString(),
        },
      })
      
      // 3. Save sealed PDF
      const pdfBytes = await pdfDoc.save()
      return new File([pdfBytes], options.originalFile.name, { type: 'application/pdf' })
    } catch (error) {
      if (error instanceof PDFProcessingError) {
        throw error
      }
      throw new PDFProcessingError(
        'document_seal_failed',
        `Failed to seal PDF: ${error}`,
      )
    }
  }
  
  /**
   * Embed QR code as image on specified page
   */
  private async embedQRCodeAsImage(pdfDoc: PDFDocument, options: PDFSealingOptions): Promise<void> {
    try {
      const pages = pdfDoc.getPages()
      
      if (options.pageNumber < 1 || options.pageNumber > pages.length) {
        throw new PDFProcessingError(
          'document_processing_failed',
          `Invalid page number: ${options.pageNumber}. PDF has ${pages.length} pages.`,
        )
      }
      
      const targetPage = pages[options.pageNumber - 1] // Convert to 0-based index
      
      // Convert QR code data URL to image bytes
      const qrImageBytes = await this.dataUrlToBytes(options.qrCodeDataUrl)
      
      // Embed image in PDF
      const qrImage = await pdfDoc.embedPng(qrImageBytes)
      
      // Get page dimensions for coordinate conversion
      const { width: pageWidth, height: pageHeight } = targetPage.getSize()
      
      // Convert coordinates (PDF uses bottom-left origin, UI uses top-left)
      const pdfY = pageHeight - options.position.y - options.sizeInPixels
      
      // Draw QR code on page
      targetPage.drawImage(qrImage, {
        x: options.position.x,
        y: pdfY,
        width: options.sizeInPixels,
        height: options.sizeInPixels,
      })
    } catch (error) {
      throw new PDFProcessingError(
        'document_processing_failed',
        `Failed to embed QR code: ${error}`,
      )
    }
  }
  
  /**
   * Add seal metadata to PDF document
   */
  private async addSealMetadata(pdfDoc: PDFDocument, metadata: PDFSealMetadata): Promise<void> {
    try {
      // Store metadata in PDF keywords field (JSON encoded)
      const existingKeywords = pdfDoc.getKeywords() || []
      const sealMetadataKeyword = `seal.codes:${JSON.stringify(metadata)}`
      
      pdfDoc.setKeywords([...existingKeywords, sealMetadataKeyword])
      
      // Also set in subject field for additional discoverability
      const existingSubject = pdfDoc.getSubject() || ''
      const sealSubject = `Sealed with seal.codes at ${metadata.originalHashInfo.timestamp}`
      
      if (existingSubject) {
        pdfDoc.setSubject(`${existingSubject} | ${sealSubject}`)
      } else {
        pdfDoc.setSubject(sealSubject)
      }
      
      // Update modification date
      pdfDoc.setModificationDate(new Date())
    } catch (error) {
      throw new PDFProcessingError(
        'document_processing_failed',
        `Failed to add metadata: ${error}`,
      )
    }
  }
  
  /**
   * Convert data URL to bytes
   */
  private async dataUrlToBytes(dataUrl: string): Promise<Uint8Array> {
    try {
      // Extract base64 data from data URL
      const base64Data = dataUrl.split(',')[1]
      if (!base64Data) {
        throw new Error('Invalid data URL format')
      }
      
      // Convert base64 to bytes
      const binaryString = atob(base64Data)
      const bytes = new Uint8Array(binaryString.length)
      
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      
      return bytes
    } catch (error) {
      throw new PDFProcessingError(
        'document_processing_failed',
        `Failed to convert QR code data: ${error}`,
      )
    }
  }
  
  /**
   * Remove QR code from PDF (for verification)
   * Creates a clean version by drawing white rectangle over QR area
   */
  async removeQRCodeFromPDF(pdfFile: File, qrLocation: PDFSealMetadata['qrLocation']): Promise<File> {
    try {
      const pdfDoc = await PDFDocument.load(await pdfFile.arrayBuffer())
      const pages = pdfDoc.getPages()
      
      if (qrLocation.pageNumber < 1 || qrLocation.pageNumber > pages.length) {
        throw new PDFProcessingError(
          'document_processing_failed',
          `Invalid page number in metadata: ${qrLocation.pageNumber}`,
        )
      }
      
      const targetPage = pages[qrLocation.pageNumber - 1]
      const { height: pageHeight } = targetPage.getSize()
      
      // Convert coordinates (PDF uses bottom-left origin)
      const pdfY = pageHeight - qrLocation.y - qrLocation.height
      
      // Draw white rectangle over QR code area
      targetPage.drawRectangle({
        x: qrLocation.x,
        y: pdfY,
        width: qrLocation.width,
        height: qrLocation.height,
        color: rgb(1, 1, 1), // White
      })
      
      const cleanPdfBytes = await pdfDoc.save()
      return new File([cleanPdfBytes], pdfFile.name, { type: 'application/pdf' })
    } catch (error) {
      throw new PDFProcessingError(
        'document_processing_failed',
        `Failed to remove QR code: ${error}`,
      )
    }
  }
}

/**
 * Default PDF sealing service instance
 */
export const pdfSealingService = new PDFSealingService()
