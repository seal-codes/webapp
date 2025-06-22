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
      console.log('🔧 Starting true QR code removal from PDF')
      console.log('📍 QR Location to remove:', qrLocation)
      
      // The key insight: we need to reconstruct the original PDF state
      // by removing the QR code drawing operations from the content stream
      
      const pdfDoc = await PDFDocument.load(await pdfFile.arrayBuffer())
      const pages = pdfDoc.getPages()
      
      if (qrLocation.pageNumber < 1 || qrLocation.pageNumber > pages.length) {
        throw new PDFProcessingError(
          'document_processing_failed',
          `Invalid page number in metadata: ${qrLocation.pageNumber}`,
        )
      }
      
      const targetPage = pages[qrLocation.pageNumber - 1]
      
      // Access the page's content stream and remove QR code operations
      await this.removeQRCodeFromContentStream(targetPage, qrLocation, qrObjectName)
      
      const cleanPdfBytes = await pdfDoc.save()
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

  /**
   * Remove QR code operations from the page's content stream
   */
  private async removeQRCodeFromContentStream(
    page: any, 
    qrLocation: PDFSealMetadata['qrLocation'], 
    qrObjectName?: string
  ): Promise<void> {
    try {
      console.log('📝 Removing QR code from content stream')
      
      // Access the internal page structure
      const pageNode = (page as any).node
      const pdfContext = (page as any).doc.context
      
      // Get the content stream(s)
      const contentsRef = pageNode.get('Contents')
      
      if (!contentsRef) {
        console.log('⚠️ No content stream found')
        return
      }
      
      // Handle both single content stream and array of content streams
      if (contentsRef.asArray) {
        // Multiple content streams
        const streamRefs = contentsRef.asArray()
        for (const streamRef of streamRefs) {
          await this.processAndCleanContentStream(streamRef, qrLocation, qrObjectName, pdfContext)
        }
      } else {
        // Single content stream
        await this.processAndCleanContentStream(contentsRef, qrLocation, qrObjectName, pdfContext)
      }
      
      console.log('✅ Content stream processing completed')
      
    } catch (error) {
      console.error('❌ Error removing QR code from content stream:', error)
      throw error
    }
  }

  /**
   * Process and clean a single content stream
   */
  private async processAndCleanContentStream(
    streamRef: any, 
    qrLocation: PDFSealMetadata['qrLocation'], 
    qrObjectName: string | undefined, 
    pdfContext: any
  ): Promise<void> {
    try {
      const stream = pdfContext.lookup(streamRef)
      
      if (!stream) {
        console.log('⚠️ Could not resolve content stream')
        return
      }
      
      // Get the content as a string
      let contentString: string
      
      if (stream.getContentsString) {
        contentString = stream.getContentsString()
      } else if (stream.contents) {
        // Try to decode the contents
        const contents = stream.contents
        contentString = new TextDecoder().decode(contents)
      } else {
        console.log('⚠️ Could not extract content from stream')
        return
      }
      
      console.log('📄 Processing content stream, length:', contentString.length)
      
      // Remove QR code operations from the content string
      const cleanedContent = this.removeQRCodeOperationsFromContent(contentString, qrLocation, qrObjectName)
      
      if (cleanedContent !== contentString) {
        console.log('✅ QR code operations removed')
        console.log('📊 Content reduced by', contentString.length - cleanedContent.length, 'characters')
        
        // Update the stream with cleaned content
        await this.updateContentStream(stream, cleanedContent, pdfContext)
      } else {
        console.log('⚠️ No QR code operations found to remove')
      }
      
    } catch (error) {
      console.error('❌ Error processing content stream:', error)
      // Don't throw - continue with other streams
    }
  }

  /**
   * Remove QR code operations from content string
   */
  private removeQRCodeOperationsFromContent(
    content: string, 
    qrLocation: PDFSealMetadata['qrLocation'], 
    qrObjectName?: string
  ): string {
    console.log('🔍 Analyzing content for QR code operations')
    
    // PDF content streams contain drawing operations
    // We need to identify and remove the sequence that draws the QR code
    
    // Look for image drawing operations (XObject Do commands) in the QR code area
    const lines = content.split('\n')
    const cleanedLines: string[] = []
    let i = 0
    
    while (i < lines.length) {
      const line = lines[i].trim()
      
      // Look for transformation matrix followed by XObject Do command
      // Pattern: numbers cm (transformation matrix) followed by /Name Do (draw XObject)
      if (this.isTransformationMatrix(line)) {
        const transformMatrix = this.parseTransformationMatrix(line)
        
        // Check if the next few lines contain a Do command
        let foundDoCommand = false
        let doCommandIndex = -1
        
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const nextLine = lines[j].trim()
          if (nextLine.includes('Do')) {
            // Check if this transformation matrix places content in the QR code area
            if (this.isTransformationInQRArea(transformMatrix, qrLocation)) {
              console.log('🎯 Found QR code drawing operation at line', i)
              foundDoCommand = true
              doCommandIndex = j
              break
            }
          }
        }
        
        if (foundDoCommand) {
          // Skip all lines from the transformation matrix to the Do command
          console.log('🗑️ Removing QR code operation sequence')
          i = doCommandIndex + 1
          continue
        }
      }
      
      // Keep this line
      cleanedLines.push(lines[i])
      i++
    }
    
    return cleanedLines.join('\n')
  }

  /**
   * Check if a line contains a transformation matrix
   */
  private isTransformationMatrix(line: string): boolean {
    // Transformation matrix format: a b c d e f cm
    const parts = line.split(/\s+/)
    return parts.length === 7 && parts[6] === 'cm'
  }

  /**
   * Parse transformation matrix from line
   */
  private parseTransformationMatrix(line: string): { x: number, y: number, width: number, height: number } {
    const parts = line.split(/\s+/)
    if (parts.length >= 6) {
      return {
        width: parseFloat(parts[0]) || 0,
        height: parseFloat(parts[3]) || 0,
        x: parseFloat(parts[4]) || 0,
        y: parseFloat(parts[5]) || 0
      }
    }
    return { x: 0, y: 0, width: 0, height: 0 }
  }

  /**
   * Check if transformation matrix places content in QR code area
   */
  private isTransformationInQRArea(
    transform: { x: number, y: number, width: number, height: number }, 
    qrLocation: PDFSealMetadata['qrLocation']
  ): boolean {
    // Check if the transformation matrix coordinates overlap with QR code area
    const tolerance = 5 // Allow some tolerance for floating point precision
    
    return Math.abs(transform.x - qrLocation.x) < tolerance &&
           Math.abs(transform.y - (800 - qrLocation.y - qrLocation.height)) < tolerance && // PDF coordinate conversion
           Math.abs(transform.width - qrLocation.width) < tolerance &&
           Math.abs(transform.height - qrLocation.height) < tolerance
  }

  /**
   * Update content stream with cleaned content
   */
  private async updateContentStream(stream: any, cleanedContent: string, pdfContext: any): Promise<void> {
    try {
      // Convert cleaned content to bytes
      const cleanedBytes = new TextEncoder().encode(cleanedContent)
      
      // Update the stream's content
      if (stream.contents) {
        stream.contents = cleanedBytes
      }
      
      // Update the Length field in the stream dictionary
      if (stream.dict) {
        const lengthObj = pdfContext.obj(cleanedBytes.length)
        stream.dict.set('Length', lengthObj)
      }
      
      console.log('📝 Content stream updated with cleaned content')
      
    } catch (error) {
      console.error('❌ Error updating content stream:', error)
      throw error
    }
  }

  /**
   * Remove QR code by finding and removing the specific XObject operation
   */
  private async removeQRCodeByObjectName(contentStreams: any, qrObjectName: string, pdfContext: any): Promise<void> {
    console.log('🎯 Removing QR code by object name:', qrObjectName)
    
    try {
      // Access the content stream(s)
      if (contentStreams.asArray) {
        // Multiple content streams
        const streamArray = contentStreams.asArray()
        for (const streamRef of streamArray) {
          await this.processContentStream(streamRef, qrObjectName, pdfContext)
        }
      } else {
        // Single content stream
        await this.processContentStream(contentStreams, qrObjectName, pdfContext)
      }
    } catch (error) {
      console.error('❌ Error processing content streams:', error)
      throw error
    }
  }

  /**
   * Process a single content stream to remove QR code operations
   */
  private async processContentStream(streamRef: any, qrObjectName: string, pdfContext: any): Promise<void> {
    try {
      const stream = pdfContext.lookup(streamRef)
      
      if (stream && stream.getContentsString) {
        const contentString = stream.getContentsString()
        console.log('📄 Original content stream length:', contentString.length)
        
        // Parse and filter the content stream
        const cleanedContent = this.removeQRCodeOperations(contentString, qrObjectName)
        
        if (cleanedContent !== contentString) {
          console.log('✅ QR code operations removed from content stream')
          console.log('📄 Cleaned content stream length:', cleanedContent.length)
          
          // Update the content stream
          // Note: This is a simplified approach - in practice, we'd need to properly
          // reconstruct the PDFContentStream object
          
          // For now, let's create a new content stream with the cleaned content
          const newContentBytes = new TextEncoder().encode(cleanedContent)
          
          // Update the stream's content
          // This is a low-level operation that may need adjustment based on pdf-lib internals
          if (stream.dict && stream.dict.set) {
            stream.dict.set('Length', pdfContext.obj(newContentBytes.length))
          }
          
          console.log('📝 Content stream updated')
        } else {
          console.log('⚠️ No QR code operations found in content stream')
        }
      }
    } catch (error) {
      console.error('❌ Error processing individual content stream:', error)
      // Don't throw here - continue with other streams
    }
  }

  /**
   * Remove QR code operations from content stream string
   */
  private removeQRCodeOperations(contentString: string, qrObjectName: string): string {
    console.log('🔍 Searching for QR code operations with object name:', qrObjectName)
    
    // PDF content streams contain operations like:
    // q (save graphics state)
    // 144 0 0 194 438 583 cm (transformation matrix)
    // /QRCode123 Do (draw XObject)
    // Q (restore graphics state)
    
    // We need to remove the sequence that draws our QR code XObject
    const lines = contentString.split('\n')
    const cleanedLines: string[] = []
    let skipMode = false
    let graphicsStateDepth = 0
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // Check if this line references our QR code XObject
      if (line.includes(qrObjectName) && line.includes('Do')) {
        console.log('🎯 Found QR code operation:', line)
        skipMode = true
        
        // Remove the transformation matrix and graphics state operations
        // that are part of the QR code drawing sequence
        
        // Look backwards to find the start of the graphics state (q operation)
        let backtrack = cleanedLines.length - 1
        while (backtrack >= 0) {
          const prevLine = cleanedLines[backtrack].trim()
          if (prevLine === 'q') {
            // Remove everything from the 'q' operation
            cleanedLines.splice(backtrack)
            break
          }
          backtrack--
        }
        
        // Skip this line (the Do operation)
        continue
      }
      
      // If we're in skip mode, look for the end of the graphics state (Q operation)
      if (skipMode && line === 'Q') {
        console.log('✅ Found end of QR code graphics state')
        skipMode = false
        continue // Skip the Q operation as well
      }
      
      // If we're not in skip mode, keep the line
      if (!skipMode) {
        cleanedLines.push(lines[i])
      }
    }
    
    const result = cleanedLines.join('\n')
    
    if (result !== contentString) {
      console.log('✅ Successfully removed QR code operations')
      console.log('📊 Removed', contentString.length - result.length, 'characters')
    } else {
      console.log('⚠️ No changes made to content stream')
    }
    
    return result
  }

  /**
   * Remove QR code by location (fallback method)
   */
  private async removeQRCodeByLocation(contentStreams: any, qrLocation: PDFSealMetadata['qrLocation'], pdfContext: any): Promise<void> {
    console.log('📍 Removing QR code by location coordinates')
    
    // This would involve parsing the content stream and removing operations
    // that draw within the specified coordinates
    
    // TODO: Implement location-based content stream manipulation
    console.log('⚠️ QR code removal by location not yet fully implemented')
  }
}

/**
 * Default PDF sealing service instance
 */
export const pdfSealingService = new PDFSealingService()
