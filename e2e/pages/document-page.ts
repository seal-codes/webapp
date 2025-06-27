/**
 * Document Page Object
 * Represents the document upload and processing page
 */
import { Page, Locator } from '@playwright/test'
import { BasePage } from './base-page'
import path from 'path'

export class DocumentPage extends BasePage {
  // Locators
  readonly documentDropzone: Locator
  readonly fileInput: Locator
  readonly selectFileButton: Locator
  readonly alternateDocumentButton: Locator
  readonly errorMessage: Locator
  readonly documentPreview: Locator
  readonly documentImage: Locator
  readonly documentDropzoneHeading: Locator
  readonly authButtons: Record<string, Locator>
  readonly userInfo: Locator
  readonly qrPositionControls: Locator
  readonly qrSizeControl: Locator
  readonly sealDocumentButton: Locator
  
  constructor(page: Page) {
    super(page)
    
    // Initialize locators using a combination of test-id attributes and text content
    // For elements that have data-testid attributes
    this.documentDropzone = page.getByTestId('document-dropzone').or(page.locator('.border-dashed'))
    this.fileInput = page.getByTestId('document-file-input').or(page.locator('input[type="file"]'))
    
    // For elements that don't have data-testid attributes but can be found by text
    this.selectFileButton = page.getByRole('button', { name: /Datei auswählen/i })
    this.alternateDocumentButton = page.getByRole('button', { name: /Anderes Dokument wählen/i })
    this.errorMessage = page.getByTestId('document-error-message').or(page.locator('.message.error'))
    this.documentPreview = page.getByTestId('document-image-preview').or(page.locator('.document-preview'))
    
    // Make document image selector more specific to avoid strict mode violations
    // Only target elements with alt="Document preview" to avoid matching QR code images
    this.documentImage = page.getByTestId('document-preview-image')
    
    this.documentDropzoneHeading = page.getByRole('heading', { name: /Dokument hier ablegen/i })
    
    // Auth-related locators
    this.authButtons = {
      google: page.getByTestId('select-auth-provider-google').or(
        page.getByRole('button', { name: /google/i }).or(page.locator('button:has-text("Google")')),
      ),
      github: page.getByTestId('select-auth-provider-github').or(
        page.getByRole('button', { name: /github/i }).or(page.locator('button:has-text("GitHub")')),
      ),
    }
    this.userInfo = page.locator('.user-info')
    
    // QR positioning locators
    this.qrPositionControls = page.locator('.qr-position-controls')
    this.qrSizeControl = page.locator('.qr-size-control')
    this.sealDocumentButton = page.getByRole('button', { name: /Dokument versiegeln|Seal document|🔒 Seal This Document/i })
  }
  
  /**
   * Navigate to the document page
   */
  async goto() {
    await super.goto('/document')
  }
  
  /**
   * Upload a document using the file input
   */
  async uploadDocument(filePath: string) {
    // Check if we need to click the alternate document button first
    if (await this.alternateDocumentButton.isVisible()) {
      await this.alternateDocumentButton.click()
      // Wait for the dropzone to appear
      await this.documentDropzoneHeading.waitFor({ state: 'visible' })
    }
    
    // Now upload the file
    await this.fileInput.setInputFiles(filePath)
    
    // Wait for the document to be processed and displayed
    await this.page.waitForTimeout(1000) // Give it a moment to process
    await this.documentImage.waitFor({ state: 'visible', timeout: 10000 })
  }
  
  /**
   * Upload a document via drag and drop simulation
   * Note: This is a simulation as Playwright doesn't fully support real drag and drop with files
   */
  async uploadDocumentViaDragAndDrop(filePath: string) {
    // Check if we need to click the alternate document button first
    if (await this.alternateDocumentButton.isVisible()) {
      await this.alternateDocumentButton.click()
      // Wait for the dropzone to appear
      await this.documentDropzoneHeading.waitFor({ state: 'visible' })
    }
    
    // Simulate dragenter and dragover events
    await this.documentDropzone.evaluate(element => {
      const dragEnterEvent = new Event('dragenter', { bubbles: true })
      element.dispatchEvent(dragEnterEvent)
      
      const dragOverEvent = new Event('dragover', { bubbles: true })
      element.dispatchEvent(dragOverEvent)
    })
    
    // Use setInputFiles as a workaround for actual drag and drop
    await this.fileInput.setInputFiles(filePath)
    
    // Wait for the document to be processed and displayed
    await this.page.waitForTimeout(1000) // Give it a moment to process
    await this.documentImage.waitFor({ state: 'visible', timeout: 10000 })
  }
  
  /**
   * Check if document was loaded successfully
   */
  async isDocumentLoaded(): Promise<boolean> {
    try {
      await this.documentImage.waitFor({ state: 'visible', timeout: 5000 })
      return true
    } catch (error) {
      return false
    }
  }
  
  /**
   * Get error message text if present
   */
  async getErrorMessage(): Promise<string | null> {
    if (await this.errorMessage.isVisible()) {
      return await this.errorMessage.textContent()
    }
    return null
  }
  
  /**
   * Proceed to the next step (authentication)
   * Note: In the current UI flow, there's no explicit 'Next' button
   * The authentication options are shown directly after document upload
   */
  async proceedToNextStep() {
    // In the current UI, authentication options are already visible
    // so we don't need to click a next button
    // Just wait for auth buttons to be visible
    await this.authButtons.google.waitFor({ state: 'visible', timeout: 5000 })
  }
  
  /**
   * Authenticate with a specific provider
   */
  async authenticateWith(provider: 'google' | 'github') {
    const button = this.authButtons[provider]
    await button.click()
    // In real tests, this would redirect to the provider's auth page
    // For our tests with mocks, we'll handle the redirect in the test itself
  }
  
  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    return await this.userInfo.isVisible()
  }
  
  /**
   * Position the QR code on the document
   */
  async positionQRCode(x: number, y: number) {
    // This would need to be implemented based on the actual UI implementation
    // For now, we'll use a simple drag simulation
    const qrElement = this.page.locator('.qr-code-preview')
    await qrElement.dragTo(this.page.locator('.document-preview'), {
      targetPosition: { x, y },
    })
  }
  
  /**
   * Set QR code size
   */
  async setQRCodeSize(sizePercent: number) {
    // This would need to be implemented based on the actual UI implementation
    // For now, we'll use a simple input value setting
    const sizeInput = this.qrSizeControl.locator('input')
    await sizeInput.waitFor({ state: 'visible', timeout: 5000 })
    await sizeInput.fill(String(sizePercent))
  }
  
  /**
   * Seal the document
   */
  async sealDocument() {
    await this.sealDocumentButton.click()
    await this.waitForNavigation()
  }
}
