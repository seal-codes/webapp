/**
 * Sealed Document Page Object
 * Represents the page displaying a sealed document with QR code
 */
import { Page, Locator } from '@playwright/test';
import { BasePage } from './base-page';

export class SealedDocumentPage extends BasePage {
  // Locators
  readonly sealedDocumentImage: Locator;
  readonly qrCode: Locator;
  readonly downloadButton: Locator;
  readonly shareButton: Locator;
  readonly verificationLink: Locator;
  readonly signerInfo: Locator;
  
  constructor(page: Page) {
    super(page);
    
    // Initialize locators
    this.sealedDocumentImage = page.getByTestId('sealed-document-image');
    this.qrCode = page.getByTestId('document-qr-code');
    this.downloadButton = page.getByRole('button', { name: /download/i });
    this.shareButton = page.getByRole('button', { name: /share/i });
    this.verificationLink = page.getByTestId('verification-link');
    this.signerInfo = page.getByTestId('signer-info');
  }
  
  /**
   * Navigate to a specific sealed document by ID
   */
  async gotoDocument(documentId: string) {
    await super.goto(`/sealed/${documentId}`);
  }
  
  /**
   * Download the sealed document
   */
  async downloadDocument() {
    // Start waiting for download before clicking
    const downloadPromise = this.page.waitForEvent('download');
    await this.downloadButton.click();
    const download = await downloadPromise;
    return download;
  }
  
  /**
   * Get the verification URL for the document
   */
  async getVerificationUrl(): Promise<string> {
    return await this.verificationLink.getAttribute('href') || '';
  }
  
  /**
   * Get signer information
   */
  async getSignerInfo(): Promise<string> {
    return await this.signerInfo.textContent() || '';
  }
  
  /**
   * Share the document (opens share dialog)
   */
  async shareDocument() {
    await this.shareButton.click();
    // Wait for share dialog to appear
    await this.page.waitForSelector('[data-testid="share-dialog"]', { state: 'visible' });
  }
}
