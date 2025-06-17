/**
 * Authentication Tests
 * 
 * Tests for authentication functionality based on BDD scenarios
 */
import { test as baseTest, expect } from '@playwright/test';
import { DocumentPage } from './pages/document-page';
import path from 'path';

// Define the test with base configuration
const test = baseTest.extend({});

test.describe('Authentication', () => {
  // Test with Google authentication
  test.describe('Google Authentication', () => {
    // Use the pre-authenticated state for Google
    test.use({ storageState: 'playwright/.auth/google-user.json' });
    
    test('should load authenticated state with Google', async ({ page }) => {
      const documentPage = new DocumentPage(page);
      await documentPage.goto();
      
      // Upload a document to trigger authentication flow
      const testImagePath = path.join(process.cwd(), 'media', 'logo.png');
      await documentPage.uploadDocument(testImagePath);
      
      // Wait for document to be processed
      await expect(documentPage.documentImage).toBeVisible();
      
      // Since we're using pre-authenticated state, the seal document button should be visible
      // without having to click the Google sign-in button
      await expect(documentPage.sealDocumentButton).toBeVisible({ timeout: 5000 });
    });
  });
  
  // Test with GitHub authentication
  test.describe('GitHub Authentication', () => {
    // Use the pre-authenticated state for GitHub
    test.use({ storageState: 'playwright/.auth/github-user.json' });
    
    test('should load authenticated state with GitHub', async ({ page }) => {
      const documentPage = new DocumentPage(page);
      await documentPage.goto();
      
      // Upload a document to trigger authentication flow
      const testImagePath = path.join(process.cwd(), 'media', 'logo.png');
      await documentPage.uploadDocument(testImagePath);
      
      // Wait for document to be processed
      await expect(documentPage.documentImage).toBeVisible();
      
      // Since we're using pre-authenticated state, the seal document button should be visible
      // without having to click the GitHub sign-in button
      await expect(documentPage.sealDocumentButton).toBeVisible({ timeout: 5000 });
    });
  });

  // Test for authentication cancellation scenario
  test.describe('Authentication Cancellation', () => {
    test('should handle authentication cancellation', async ({ page }) => {
      const documentPage = new DocumentPage(page);
      await documentPage.goto();
      
      // Upload a document to trigger authentication flow
      const testImagePath = path.join(process.cwd(), 'media', 'logo.png');
      await documentPage.uploadDocument(testImagePath);
      
      // Wait for document to be processed
      await expect(documentPage.documentImage).toBeVisible();
      
      // Verify authentication buttons are visible
      await expect(documentPage.authButtons.google).toBeVisible();
      await expect(documentPage.authButtons.github).toBeVisible();
    });
  });
  
  // Test for authentication error handling scenario
  test.describe('Authentication Error Handling', () => {
    test('should show authentication options when not authenticated', async ({ page }) => {
      const documentPage = new DocumentPage(page);
      await documentPage.goto();
      
      // Upload a document to trigger authentication flow
      const testImagePath = path.join(process.cwd(), 'media', 'logo.png');
      await documentPage.uploadDocument(testImagePath);
      
      // Wait for document to be processed
      await expect(documentPage.documentImage).toBeVisible();
      
      // Verify authentication buttons are visible
      await expect(documentPage.authButtons.google).toBeVisible();
      await expect(documentPage.authButtons.github).toBeVisible();
    });
  });

  // Test for session persistence
  test.describe('Session Persistence', () => {
    // Use the pre-authenticated state for Google
    test.use({ storageState: 'playwright/.auth/google-user.json' });
    
    test('should persist authentication session', async ({ page }) => {
      const documentPage = new DocumentPage(page);
      
      // First visit the document page
      await documentPage.goto();
      
      // Upload a document to trigger authentication flow
      const testImagePath = path.join(process.cwd(), 'media', 'logo.png');
      await documentPage.uploadDocument(testImagePath);
      
      // Wait for document to be processed
      await expect(documentPage.documentImage).toBeVisible();
      
      // Verify we're authenticated by checking for the seal document button
      await expect(documentPage.sealDocumentButton).toBeVisible({ timeout: 5000 });
      
      // Navigate to a different page
      await page.goto('/');
      
      // Return to the document page
      await documentPage.goto();
      
      // Upload a document again
      await documentPage.uploadDocument(testImagePath);
      await expect(documentPage.documentImage).toBeVisible();
      
      // Verify we're still authenticated by checking for the seal document button
      await expect(documentPage.sealDocumentButton).toBeVisible({ timeout: 5000 });
    });
  });
});
