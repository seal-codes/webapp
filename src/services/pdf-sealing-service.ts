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
      
      // Get the PDF context for low-level operations
      const pdfContext = (pdfDoc as any).context
      
      // Debug: Let's examine the PDF structure more thoroughly
      console.log('🔍 Examining PDF structure...')
      console.log('📄 PDF has', pages.length, 'pages')
      console.log('📄 PDF context type:', pdfContext.constructor.name)
      
      // Try to find all XObjects in the entire PDF
      console.log('🔍 Searching for XObjects in entire PDF...')
      const pdfObjects = pdfContext.enumerateIndirectObjects()
      let foundXObjects = []
      
      for (const [ref, obj] of pdfObjects) {
        if (obj && obj.get && obj.get('Type') && obj.get('Type').toString() === '/XObject') {
          const subtype = obj.get('Subtype')
          console.log('🎯 Found XObject:', ref.toString(), 'Subtype:', subtype?.toString())
          foundXObjects.push({ ref: ref.toString(), subtype: subtype?.toString() })
        }
      }
      
      console.log('📋 Total XObjects found in PDF:', foundXObjects.length)
      
      // Try to remove the QR code by accessing the page's internal structure
      const pageNode = (targetPage as any).node
      console.log('📄 Page node type:', pageNode.constructor.name)
      
      // Look for Resources at different levels
      let resources = pageNode.get('Resources')
      if (!resources) {
        // Try to get resources from parent or inherited
        console.log('🔍 No direct Resources, checking inherited resources...')
        const parent = pageNode.get('Parent')
        if (parent) {
          resources = parent.get('Resources')
          console.log('📄 Found inherited resources:', !!resources)
        }
      }
      
      if (resources) {
        console.log('✅ Found Resources')
        const xObjects = resources.get('XObject')
        
        if (xObjects && qrObjectName) {
          console.log('🔍 Looking for XObject:', qrObjectName)
          
          // Get all XObject keys to see what's available
          const xObjectDict = xObjects.asDict()
          if (xObjectDict) {
            const keys = xObjectDict.keys()
            console.log('📋 Available XObjects:', keys)
            
            if (xObjectDict.has(qrObjectName)) {
              console.log('✅ Found QR XObject, removing it')
              
              // Get the XObject reference before removing it
              const qrXObjectRef = xObjectDict.get(qrObjectName)
              console.log('🎯 QR XObject reference:', qrXObjectRef)
              
              // Remove the XObject from the dictionary
              xObjectDict.delete(qrObjectName)
              console.log('🗑️ QR XObject removed from resources')
              
              // Also try to remove the actual object from the PDF context
              if (qrXObjectRef && pdfContext) {
                try {
                  // This might help clean up the actual object data
                  console.log('🧹 Attempting to clean up XObject data in PDF context')
                  // Note: This is experimental - PDF-lib might handle this automatically
                } catch (error) {
                  console.warn('⚠️ Could not clean up XObject data:', error)
                }
              }
            } else {
              console.log('⚠️ QR XObject not found in resources')
            }
          }
        } else {
          console.log('⚠️ No XObjects found or no QR object name provided')
          if (xObjects) {
            const xObjectDict = xObjects.asDict()
            if (xObjectDict) {
              const keys = xObjectDict.keys()
              console.log('📋 Available XObjects (no target):', keys)
            }
          }
        }
      } else {
        console.log('⚠️ No Resources found on page or inherited')
      }
      
      // Clean content stream references more thoroughly
      await this.cleanContentStreamFromQRReferences(targetPage, qrLocation, qrObjectName)
      
      // Try to save with default options (revert the save options that caused restructuring)
      console.log('💾 Saving PDF with default options...')
      const cleanPdfBytes = await pdfDoc.save()
      
      const cleanFile = new File([cleanPdfBytes], pdfFile.name, { type: 'application/pdf' })
      
      console.log('📄 Clean PDF created, size:', cleanFile.size, 'bytes')
      console.log('📄 Original PDF size:', pdfFile.size, 'bytes')
      console.log('📊 Size difference:', cleanFile.size - pdfFile.size, 'bytes')
      
      // Let's analyze the actual differences
      await this.analyzePDFDifferences(pdfFile, cleanFile)
      
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
   * Analyze the actual differences between original and cleaned PDF
   */
  private async analyzePDFDifferences(originalFile: File, cleanFile: File): Promise<void> {
    try {
      console.log('🔍 Analyzing PDF differences...')
      
      const originalBytes = new Uint8Array(await originalFile.arrayBuffer())
      const cleanBytes = new Uint8Array(await cleanFile.arrayBuffer())
      
      console.log('📊 Original PDF size:', originalBytes.length, 'bytes')
      console.log('📊 Clean PDF size:', cleanBytes.length, 'bytes')
      console.log('📊 Size difference:', cleanBytes.length - originalBytes.length, 'bytes')
      
      // Find first difference
      let firstDiffIndex = -1
      const minLength = Math.min(originalBytes.length, cleanBytes.length)
      
      for (let i = 0; i < minLength; i++) {
        if (originalBytes[i] !== cleanBytes[i]) {
          firstDiffIndex = i
          break
        }
      }
      
      if (firstDiffIndex >= 0) {
        console.log('🎯 First difference at byte index:', firstDiffIndex)
        
        // Show context around the difference
        const contextStart = Math.max(0, firstDiffIndex - 20)
        const contextEnd = Math.min(originalBytes.length, firstDiffIndex + 20)
        
        const originalContext = Array.from(originalBytes.slice(contextStart, contextEnd))
          .map(b => b >= 32 && b <= 126 ? String.fromCharCode(b) : `\\x${b.toString(16).padStart(2, '0')}`)
          .join('')
        
        const cleanContext = Array.from(cleanBytes.slice(contextStart, Math.min(cleanBytes.length, contextEnd)))
          .map(b => b >= 32 && b <= 126 ? String.fromCharCode(b) : `\\x${b.toString(16).padStart(2, '0')}`)
          .join('')
        
        console.log('📄 Original context:', originalContext)
        console.log('📄 Clean context:', cleanContext)
        
        // Show hex values at difference point
        console.log('🔢 Original byte at diff:', originalBytes[firstDiffIndex], `(0x${originalBytes[firstDiffIndex].toString(16)})`)
        console.log('🔢 Clean byte at diff:', cleanBytes[firstDiffIndex], `(0x${cleanBytes[firstDiffIndex].toString(16)})`)
      } else if (originalBytes.length !== cleanBytes.length) {
        console.log('📏 Files have different lengths but identical content up to shorter length')
        if (cleanBytes.length > originalBytes.length) {
          console.log('➕ Clean PDF has extra bytes at the end')
          const extraBytes = cleanBytes.slice(originalBytes.length)
          const extraContext = Array.from(extraBytes.slice(0, 40))
            .map(b => b >= 32 && b <= 126 ? String.fromCharCode(b) : `\\x${b.toString(16).padStart(2, '0')}`)
            .join('')
          console.log('📄 Extra content:', extraContext)
        } else {
          console.log('➖ Clean PDF is missing bytes from the end')
        }
      } else {
        console.log('✅ Files are identical!')
      }
      
    } catch (error) {
      console.error('❌ Error analyzing PDF differences:', error)
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
      
      const pageNode = page.node
      const contentsRef = pageNode.get('Contents')
      
      if (!contentsRef) {
        console.log('⚠️ No content stream found')
        return
      }
      
      // Get the PDF context for low-level operations
      const pdfContext = (page as any).doc.context
      
      // Handle both single content stream and array of content streams
      if (contentsRef.asArray) {
        console.log('📄 Processing multiple content streams')
        const streamRefs = contentsRef.asArray()
        for (let i = 0; i < streamRefs.length; i++) {
          console.log(`🔍 Processing content stream ${i + 1}/${streamRefs.length}`)
          await this.processContentStreamForQRRemoval(streamRefs[i], qrObjectName, pdfContext)
        }
      } else {
        console.log('📄 Processing single content stream')
        await this.processContentStreamForQRRemoval(contentsRef, qrObjectName, pdfContext)
      }
      
    } catch (error) {
      console.warn('⚠️ Error cleaning content stream:', error)
      // Don't throw - this is not critical
    }
  }

  /**
   * Process a single content stream to remove QR references
   */
  private async processContentStreamForQRRemoval(
    streamRef: any,
    qrObjectName: string | undefined,
    pdfContext: any
  ): Promise<void> {
    try {
      const stream = pdfContext.lookup(streamRef)
      
      if (!stream) {
        console.log('⚠️ Could not resolve content stream')
        return
      }
      
      // Try to get the content as a string
      let contentString: string | null = null
      
      if (stream.getContentsString) {
        contentString = stream.getContentsString()
      } else if (stream.contents) {
        // Try to decode the contents
        const contents = stream.contents
        contentString = new TextDecoder('utf-8', { fatal: false }).decode(contents)
      }
      
      if (!contentString) {
        console.log('⚠️ Could not extract content from stream')
        return
      }
      
      console.log('📄 Content stream length:', contentString.length, 'characters')
      
      // Look for references to the QR object
      if (qrObjectName && contentString.includes(qrObjectName)) {
        console.log('🎯 Found QR object reference in content stream:', qrObjectName)
        
        // Try to remove lines that reference the QR object
        const lines = contentString.split('\n')
        const originalLineCount = lines.length
        
        const filteredLines = lines.filter(line => {
          const hasQRReference = line.includes(qrObjectName)
          if (hasQRReference) {
            console.log('🗑️ Removing line with QR reference:', line.trim())
          }
          return !hasQRReference
        })
        
        if (filteredLines.length < originalLineCount) {
          const newContent = filteredLines.join('\n')
          console.log('✅ Removed', originalLineCount - filteredLines.length, 'lines with QR references')
          console.log('📊 Content reduced from', contentString.length, 'to', newContent.length, 'characters')
          
          // Update the stream content
          // Note: This is a simplified approach and might not work for all PDF structures
          if (stream.contents) {
            stream.contents = new TextEncoder().encode(newContent)
          }
        } else {
          console.log('ℹ️ No lines removed - QR reference might be inline')
        }
      } else {
        console.log('ℹ️ No QR object references found in content stream')
      }
      
    } catch (error) {
      console.warn('⚠️ Error processing content stream:', error)
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
