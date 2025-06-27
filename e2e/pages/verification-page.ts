/**
 * Verification Page Object
 * Represents the page for verifying sealed documents
 * Updated to match the German language UI elements
 */
import { Page, Locator } from '@playwright/test'
import { BasePage } from './base-page'

export class VerificationPage extends BasePage {
  // Locators
  readonly documentDropzone: Locator
  readonly fileInput: Locator
  readonly selectFileButton: Locator
  readonly verificationStatus: Locator
  readonly verificationDetails: Locator
  readonly signerInfo: Locator
  readonly timestampInfo: Locator
  readonly errorMessage: Locator
  readonly tryAgainButton: Locator
  readonly documentDropzoneHeading: Locator
  
  constructor(page: Page) {
    super(page)
    
    // Initialize locators using a combination of test-id attributes and text content
    this.documentDropzone = page.getByTestId('document-dropzone').or(page.locator('.border-dashed'))
    this.fileInput = page.getByTestId('document-file-input').or(page.locator('input[type="file"]'))
    this.selectFileButton = page.getByRole('button', { name: /Datei auswählen/i })
    this.documentDropzoneHeading = page.getByRole('heading', { name: /Dokument hier ablegen/i })
    
    // Result locators - these will be visible after verification
    this.verificationStatus = page.getByTestId('verification-status').or(page.locator('.verification-status'))
    this.verificationDetails = page.getByTestId('verification-details').or(page.locator('.verification-details'))
    this.signerInfo = page.getByTestId('verification-signer-info').or(page.locator('.signer-info'))
    this.timestampInfo = page.getByTestId('verification-timestamp').or(page.locator('.timestamp-info'))
    this.errorMessage = page.getByTestId('verification-error').or(page.locator('.error-message'))
    this.tryAgainButton = page.getByRole('button', { name: /Erneut versuchen|Try again/i })
  }
  
  /**
   * Navigate to the verification page
   */
  async goto() {
    await super.goto('/verify')
  }
  
  /**
   * Navigate to a verification URL with encoded data
   */
  async gotoWithEncodedData(encodedData: string) {
    await super.goto(`/v/${encodedData}`)
  }
  
  /**
   * Upload a document for verification
   */
  async uploadDocumentForVerification(filePath: string) {
    // Upload the document using the file input
    await this.fileInput.setInputFiles(filePath)
    
    // Wait for verification process to complete
    await this.page.waitForTimeout(2000) // Give it time to process
    
    // In a real application, we'd wait for verification results
    // For now, we'll just wait for any changes in the UI
    try {
      // Wait for either verification status or error message
      await Promise.race([
        this.verificationStatus.waitFor({ state: 'visible', timeout: 10000 }),
        this.errorMessage.waitFor({ state: 'visible', timeout: 10000 }),
      ])
    } catch (error) {
      console.log('Verification result elements not found within timeout')
    }
  }
  
  /**
   * Simulate scanning a QR code
   * In real tests, this would need to be mocked
   */
  async scanQrCode(qrCodeData: string) {
    // In the current UI, there's no explicit scan button
    // Instead, we'll simulate the QR code scan result directly
    await this.page.evaluate((data) => {
      // This assumes there's a global function or event handler for QR scan results
      // The actual implementation would depend on how the app handles QR scanning
      window.dispatchEvent(new CustomEvent('qrCodeScanned', { 
        detail: { data }, 
      }))
    }, qrCodeData)
    
    // Wait for verification result to appear
    await this.page.waitForTimeout(2000) // Give it time to process
  }
  
  /**
   * Get verification status text
   */
  async getVerificationStatus(): Promise<string> {
    try {
      await this.verificationStatus.waitFor({ state: 'visible', timeout: 5000 })
      return await this.verificationStatus.textContent() || ''
    } catch (error) {
      return ''
    }
  }
  
  /**
   * Check if verification was successful
   */
  async isVerificationSuccessful(): Promise<boolean> {
    const status = await this.getVerificationStatus()
    return status.toLowerCase().includes('success') || 
           status.toLowerCase().includes('verified') ||
           status.toLowerCase().includes('erfolg') || 
           status.toLowerCase().includes('verifiziert')
  }
  
  /**
   * Get signer information from verification result
   */
  async getSignerInfo(): Promise<string> {
    return await this.signerInfo.textContent() || ''
  }
  
  /**
   * Get timestamp information from verification result
   */
  async getTimestampInfo(): Promise<string> {
    return await this.timestampInfo.textContent() || ''
  }
  
  /**
   * Get error message if verification failed
   */
  async getErrorMessage(): Promise<string | null> {
    try {
      await this.errorMessage.waitFor({ state: 'visible', timeout: 5000 })
      return await this.errorMessage.textContent()
    } catch (error) {
      return null
    }
  }
  
  /**
   * Try verification again
   */
  async tryAgain() {
    if (await this.tryAgainButton.isVisible()) {
      await this.tryAgainButton.click()
    } else {
      // If no try again button, go back to the verification page
      await this.goto()
    }
  }
}
