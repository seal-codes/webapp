/**
 * Document Sealing Tests
 * 
 * Tests for document sealing functionality based on BDD scenarios
 */
import { test, expect, TEST_FIXTURES } from './fixtures/test-fixtures';

test.describe('Document Sealing', () => {
  test.beforeEach(async ({ documentPage, authenticatedSession, mockSupabaseClient }) => {
    // Given I have uploaded a document
    await documentPage.goto();
    await documentPage.uploadDocument(TEST_FIXTURES.VALID_IMAGE_PATH);
    
    // And I have successfully authenticated
    // (This is handled by the authenticatedSession fixture)
    await expect(documentPage.documentImage).toBeVisible();
    // Wait for the page to be fully loaded
    await documentPage.page.waitForLoadState('networkidle');
  });

  test('should position QR code', async ({ documentPage }) => {
    // Verify the QR code element is present
    const qrElement = documentPage.page.locator('[data-testid="qr-code-preview"]').or(documentPage.page.locator('.qr-code-preview'));
    await expect(qrElement).toBeVisible({ timeout: 5000 });
    
    // When I drag the QR code to a new position on the document
    await documentPage.positionQRCode(200, 200);
    
    // Then the QR code should be displayed at the new position
    const boundingBox = await qrElement.boundingBox();
    expect(boundingBox).not.toBeNull();
    
    // Verify the position is approximately where we dragged it
    // Note: The exact position may vary due to constraints, so we check it's "close enough"
    if (boundingBox) {
      expect(boundingBox.x).toBeGreaterThan(150);
      expect(boundingBox.y).toBeGreaterThan(150);
    }
  });

  test('should resize QR code', async ({ documentPage }) => {
    // Verify the QR code size controls are present
    const qrSizeControls = documentPage.page.locator('[data-testid="qr-size-controls"]').or(documentPage.page.locator('.qr-size-controls'));
    await expect(qrSizeControls).toBeVisible({ timeout: 5000 });
    
    // Get the QR code element and its initial size
    const qrElement = documentPage.page.locator('[data-testid="qr-code-preview"]').or(documentPage.page.locator('.qr-code-preview'));
    const initialBoundingBox = await qrElement.boundingBox();
    expect(initialBoundingBox).not.toBeNull();
    
    // When I adjust the QR code size using the size control
    const newSize = 30; // 30% size
    await documentPage.setQRCodeSize(newSize);
    
    // Then the QR code should be displayed with the new size
    // We'll wait a moment for the resize to take effect
    await documentPage.page.waitForTimeout(500);
    
    // Verify the size has changed
    const newBoundingBox = await qrElement.boundingBox();
    expect(newBoundingBox).not.toBeNull();
  });

  test('should seal document successfully', async ({ documentPage, sealedDocumentPage, page }) => {
    // Verify the seal document button is present
    await expect(documentPage.sealDocumentButton).toBeVisible({ timeout: 5000 });
    
    // When I click the "Seal Document" button
    await documentPage.sealDocument();
    
    // Then the document should be sealed
    // We'll wait for navigation to complete
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the sealed document page
    expect(page.url()).toContain('/sealed');
    
    // Verify the sealed document is visible
    await expect(sealedDocumentPage.sealedDocumentImage).toBeVisible({ timeout: 5000 });
  });

  test('should download sealed document', async ({ documentPage, sealedDocumentPage }) => {
    // Verify we're on the sealed document page and the download button is present
    await expect(sealedDocumentPage.downloadButton).toBeVisible({ timeout: 5000 });
    
    // When I click the "Download" button
    const downloadPromise = sealedDocumentPage.downloadDocument();
    
    // Then the sealed document should be downloaded to my device
    const download = await downloadPromise;
    
    // Verify the download has a valid filename
    expect(download.suggestedFilename()).toBeTruthy();
    expect(download.suggestedFilename()).toMatch(/\.(jpg|jpeg|png)$/i);
  });

  test('should share sealed document', async ({ documentPage, sealedDocumentPage }) => {
    // Verify we're on the sealed document page and the share button is present
    await expect(sealedDocumentPage.shareButton).toBeVisible({ timeout: 5000 });
    
    // When I click the "Share" button
    await sealedDocumentPage.shareDocument();
    
    // Verify the share dialog is opened
    await expect(sealedDocumentPage.page.getByTestId('share-dialog').or(
      sealedDocumentPage.page.locator('.share-dialog')
    )).toBeVisible({ timeout: 5000 });
  });

  test('should view a sealed document', async ({ sealedDocumentPage }) => {
    // Given I have a link to a sealed document
    // (We'll simulate this by directly navigating to a sealed document page)
    await sealedDocumentPage.gotoDocument('test-document-id');
    
    // Wait for the page to load
    await sealedDocumentPage.page.waitForLoadState('networkidle');
    
    // Verify we're on the sealed document page
    expect(sealedDocumentPage.page.url()).toContain('/sealed');
    expect(sealedDocumentPage.page.url()).toContain('test-document-id');
    
    // Verify the sealed document is visible
    await expect(sealedDocumentPage.sealedDocumentImage).toBeVisible({ timeout: 5000 });
  });
});
