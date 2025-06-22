/**
 * PDF rendering service using pdf.js
 * Handles PDF page rendering for user interface
 */

import * as pdfjsLib from 'pdfjs-dist'
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'
import type { PDFPageRenderResult } from '@/types/pdf'
import { PDFProcessingError } from '@/types/errors'

// Configure pdf.js worker - use the correct worker file for Vite
if (typeof window !== 'undefined') {
  // In browser environment, use the ES module worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString()
}

/**
 * Service for rendering PDF pages to canvas
 */
export class PDFRenderingService {
  /**
   * Load PDF document for rendering
   * 
   * @param file - PDF file to load
   * @returns Promise resolving to PDF document proxy
   */
  async loadPDF(file: File): Promise<PDFDocumentProxy> {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
      return await loadingTask.promise
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('password') || error.message.includes('encrypted')) {
          throw new PDFProcessingError('pdf_encrypted', 'PDF is password protected')
        }
        if (error.message.includes('Invalid PDF')) {
          throw new PDFProcessingError('pdf_corrupted', 'PDF file is corrupted or invalid')
        }
      }
      throw new PDFProcessingError('document_load_failed', `Failed to load PDF: ${error}`)
    }
  }
  
  /**
   * Render specific page to canvas
   * 
   * @param pdf - PDF document proxy
   * @param pageNum - Page number (1-based)
   * @param scale - Rendering scale (default: 1.0)
   * @returns Promise resolving to render result
   */
  async renderPage(
    pdf: PDFDocumentProxy, 
    pageNum: number, 
    scale: number = 1.0,
  ): Promise<PDFPageRenderResult> {
    try {
      const page = await pdf.getPage(pageNum)
      const viewport = page.getViewport({ scale })
      
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      
      if (!context) {
        throw new PDFProcessingError('document_processing_failed', 'Could not get canvas context')
      }
      
      canvas.width = viewport.width
      canvas.height = viewport.height
      
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      }
      
      await page.render(renderContext).promise
      
      return {
        canvas,
        pageNumber: pageNum,
        dimensions: { 
          width: viewport.width, 
          height: viewport.height 
        },
      }
    } catch (error) {
      throw new PDFProcessingError(
        'document_processing_failed', 
        `Failed to render page ${pageNum}: ${error}`,
      )
    }
  }
  
  /**
   * Get total page count
   * 
   * @param pdf - PDF document proxy
   * @returns Promise resolving to page count
   */
  async getPageCount(pdf: PDFDocumentProxy): Promise<number> {
    return pdf.numPages
  }
  
  /**
   * Render multiple pages (for thumbnails)
   * 
   * @param pdf - PDF document proxy
   * @param pageNumbers - Array of page numbers to render
   * @param scale - Rendering scale for thumbnails
   * @returns Promise resolving to array of render results
   */
  async renderPages(
    pdf: PDFDocumentProxy,
    pageNumbers: number[],
    scale: number = 0.2,
  ): Promise<PDFPageRenderResult[]> {
    const results: PDFPageRenderResult[] = []
    
    for (const pageNum of pageNumbers) {
      try {
        const result = await this.renderPage(pdf, pageNum, scale)
        results.push(result)
      } catch (error) {
        console.warn(`Failed to render page ${pageNum}:`, error)
        // Continue with other pages even if one fails
      }
    }
    
    return results
  }
  
  /**
   * Get page dimensions without rendering
   * 
   * @param pdf - PDF document proxy
   * @param pageNum - Page number (1-based)
   * @returns Promise resolving to page dimensions
   */
  async getPageDimensions(
    pdf: PDFDocumentProxy,
    pageNum: number,
  ): Promise<{ width: number; height: number }> {
    try {
      const page = await pdf.getPage(pageNum)
      const viewport = page.getViewport({ scale: 1.0 })
      
      return {
        width: viewport.width,
        height: viewport.height,
      }
    } catch (error) {
      throw new PDFProcessingError(
        'document_processing_failed',
        `Failed to get dimensions for page ${pageNum}: ${error}`,
      )
    }
  }
}

/**
 * Default PDF rendering service instance
 */
export const pdfRenderingService = new PDFRenderingService()
