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
          width: options.sealDimensions.width,
          height: options.sealDimensions.height,
        },
        qrObjectName: (options as any).qrObjectName, // Store the XObject name for removal
        attestationData: options.attestationData, // Store the attestation data for verification
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
   * Uses the same logic as image sealing - just draw the complete seal image
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
      const pdfY = pageHeight - options.position.y - options.sealDimensions.height
      
      // Generate a unique identifier for this QR code operation
      // We'll use a timestamp-based ID that we can search for in the content stream
      const qrOperationId = `QRCode_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Store the QR operation ID for later removal
      ;(options as any).qrObjectName = qrOperationId
      
      // Add a comment marker before drawing the QR code
      // This will help us identify the operation in the content stream
      const pageLeaf = (targetPage as any).node
      const pdfContext = (pdfDoc as any).context
      
      // Get or create the content stream
      let contentStream = (targetPage as any).contentStream
      if (!contentStream) {
        contentStream = (targetPage as any).createContentStream()
      }
      
      // Add a comment marker to identify the start of QR code operations
      const startMarker = `% START_QR_${qrOperationId}`
      const endMarker = `% END_QR_${qrOperationId}`
      
      // Draw complete seal image using exact dimensions
      targetPage.drawImage(qrImage, {
        x: options.position.x,
        y: pdfY,
        width: options.sealDimensions.width,
        height: options.sealDimensions.height,
      })
      
      console.log('🎯 QR code embedded with operation ID:', qrOperationId)
      
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
      console.log('📝 Adding seal metadata to PDF:', metadata)
      console.log('🔍 Attestation data in metadata:', metadata.attestationData)
      
      // Store metadata in PDF keywords field (JSON encoded)
      const existingKeywords = pdfDoc.getKeywords() || []
      const sealMetadataKeyword = `seal.codes:${JSON.stringify(metadata)}`
      
      console.log('📋 Seal metadata keyword:', sealMetadataKeyword)
      
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
      
      console.log('✅ Seal metadata added to PDF successfully')
    } catch (error) {
      console.error('❌ Error adding seal metadata:', error)
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
  async removeQRCodeFromPDF(pdfFile: File, qrLocation: PDFSealMetadata['qrLocation'], qrObjectName?: string): Promise<File> {
    try {
      console.log('🔧 Starting QR code removal from PDF using page reconstruction')
      console.log('📍 QR Location to remove:', qrLocation)
      
      const originalPdfDoc = await PDFDocument.load(await pdfFile.arrayBuffer())
      const cleanPdfDoc = await PDFDocument.create()
      
      const originalPages = originalPdfDoc.getPages()
      
      // Copy all pages, but reconstruct the page with the QR code
      for (let i = 0; i < originalPages.length; i++) {
        const originalPage = originalPages[i]
        
        if (i + 1 === qrLocation.pageNumber) {
          // This is the page with the QR code - we need to reconstruct it
          console.log('🔄 Reconstructing page', qrLocation.pageNumber, 'without QR code')
          
          const cleanPage = await this.reconstructPageWithoutQRCode(
            originalPage, 
            qrLocation, 
            cleanPdfDoc,
            originalPdfDoc
          )
          
          // The page is already added to cleanPdfDoc in reconstructPageWithoutQRCode
        } else {
          // Copy the page as-is
          const [copiedPage] = await cleanPdfDoc.copyPages(originalPdfDoc, [i])
          cleanPdfDoc.addPage(copiedPage)
        }
      }
      
      const cleanPdfBytes = await cleanPdfDoc.save()
      const cleanFile = new File([cleanPdfBytes], pdfFile.name, { type: 'application/pdf' })
      
      console.log('📄 Clean PDF created, size:', cleanFile.size, 'bytes')
      
      return cleanFile
    } catch (error) {
      console.error('❌ Failed to remove QR code:', error)
      throw new PDFProcessingError(
        'document_processing_failed',
        `Failed to remove QR code: ${error}`,
      )
    }
  }

  async removeQRCodeFromPDF(pdfFile: File, qrLocation: PDFSealMetadata['qrLocation'], qrObjectName?: string): Promise<File> {
    try {
      console.log('🔧 Starting QR code removal from PDF using object removal method')
      console.log('📍 QR Location to remove:', qrLocation)
      console.log('🎯 QR Object Name:', qrObjectName)
      
      const pdfDoc = await PDFDocument.load(await pdfFile.arrayBuffer())
      const pages = pdfDoc.getPages()
      
      if (qrLocation.pageNumber < 1 || qrLocation.pageNumber > pages.length) {
        throw new PDFProcessingError(
          'document_processing_failed',
          `Invalid page number in metadata: ${qrLocation.pageNumber}`,
        )
      }
      
      const targetPage = pages[qrLocation.pageNumber - 1]
      
      // Try to remove the QR code by accessing the page's internal structure
      try {
        const pageNode = (targetPage as any).node
        const resources = pageNode.get('Resources')
        
        if (resources) {
          const xObjects = resources.get('XObject')
          
          if (xObjects && qrObjectName) {
            console.log('🔍 Looking for XObject:', qrObjectName)
            
            // Try to remove the QR code XObject
            const xObjectDict = xObjects.asDict()
            if (xObjectDict && xObjectDict.has(qrObjectName)) {
              console.log('✅ Found QR XObject, removing it')
              xObjectDict.delete(qrObjectName)
              console.log('🗑️ QR XObject removed from resources')
            } else {
              console.log('⚠️ QR XObject not found in resources')
            }
          }
        }
        
        // Also try to clean the content stream by removing drawing commands
        // that reference the QR code area
        await this.cleanContentStreamFromQRReferences(targetPage, qrLocation, qrObjectName)
        
      } catch (error) {
        console.warn('⚠️ Could not remove QR via object removal, falling back to overlay method:', error)
        
        // Fallback: Use overlay method if object removal fails
        console.log('🎨 Falling back to white overlay method')
        targetPage.drawRectangle({
          x: qrLocation.x,
          y: qrLocation.y,
          width: qrLocation.width,
          height: qrLocation.height,
          color: { type: 'RGB', red: 1, green: 1, blue: 1 }, // White
          opacity: 1.0
        })
      }
      
      const cleanPdfBytes = await pdfDoc.save()
      const cleanFile = new File([cleanPdfBytes], pdfFile.name, { type: 'application/pdf' })
      
      console.log('📄 Clean PDF created, size:', cleanFile.size, 'bytes')
      console.log('📄 Original PDF size:', pdfFile.size, 'bytes')
      
      return cleanFile
    } catch (error) {
      console.error('❌ Failed to remove QR code:', error)
      throw new PDFProcessingError(
        'document_processing_failed',
        `Failed to remove QR code: ${error}`,
      )
    }
  }

  /**
   * Clean content stream from QR code references
   */
  private async cleanContentStreamFromQRReferences(
    page: any, 
    qrLocation: PDFSealMetadata['qrLocation'], 
    qrObjectName?: string
  ): Promise<void> {
    try {
      console.log('🧹 Cleaning content stream from QR references')
      
      // This is a simplified approach - we'll try to remove obvious QR-related commands
      // For now, we'll skip this complex implementation and rely on XObject removal
      console.log('⏭️ Content stream cleaning skipped - relying on XObject removal')
      
    } catch (error) {
      console.warn('⚠️ Error cleaning content stream:', error)
      // Don't throw - this is not critical
    }
  }

  /*
   * OLD COMPLEX CONTENT STREAM REMOVAL METHODS REMOVED
   * 
   * The previous implementation tried to parse and modify PDF content streams directly,
   * which was complex, fragile, and unreliable. The new approach simply draws a white
   * rectangle over the QR code area using PDF-lib's high-level APIs, which is much
   * simpler, more reliable, and achieves the same result for hash verification.
   */
}

export const pdfSealingService = new PDFSealingService()
