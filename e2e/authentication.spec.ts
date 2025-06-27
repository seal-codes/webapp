/**
 * Authentication Tests
 * 
 * Tests for authentication functionality using real GitHub authentication
 */
import { test as baseTest, expect } from '@playwright/test'
import { DocumentPage } from './pages/document-page'
import path from 'path'

// Define the test with base configuration
const test = baseTest.extend({})

test.describe('Authentication', () => {
  
  test.describe('Real GitHub Authentication', () => {
    // Use the real GitHub authentication state
    test.use({ storageState: 'playwright/.auth/github-api-user.json' })
    
    test('should load authenticated state with GitHub', async ({ page }) => {
      const documentPage = new DocumentPage(page)
      await documentPage.goto()
      
      // Upload a document to trigger authentication flow
      const testImagePath = path.join(process.cwd(), 'media', 'logo.png')
      await documentPage.uploadDocument(testImagePath)
      
      // Wait for document to be processed
      await expect(documentPage.documentImage).toBeVisible()
      
      // Since we're using real authenticated state, the seal document button should be visible
      await expect(documentPage.sealDocumentButton).toBeVisible({ timeout: 10000 })
      
      // Verify we can see authentication info
      await expect(page.getByText(/Authenticated as/i)).toBeVisible()
      await expect(page.getByText(/via github/i)).toBeVisible()
    })
  })

  // Test for authentication cancellation scenario (unauthenticated state)
  test.describe('Unauthenticated State', () => {
    test('should show authentication options when not authenticated', async ({ page }) => {
      const documentPage = new DocumentPage(page)
      await documentPage.goto()
      
      // Upload a document to trigger authentication flow
      const testImagePath = path.join(process.cwd(), 'media', 'logo.png')
      await documentPage.uploadDocument(testImagePath)
      
      // Wait for document to be processed
      await expect(documentPage.documentImage).toBeVisible()
      
      // Verify authentication buttons are visible
      await expect(documentPage.authButtons.google).toBeVisible()
      await expect(documentPage.authButtons.github).toBeVisible()
    })
  })

  // Test for session persistence
  test.describe('Session Persistence', () => {
    // Use the real GitHub authentication state
    test.use({ storageState: 'playwright/.auth/github-api-user.json' })
    
    test('should persist authentication session', async ({ page }) => {
      const documentPage = new DocumentPage(page)
      
      // First visit the document page
      await documentPage.goto()
      
      // Upload a document to trigger authentication flow
      const testImagePath = path.join(process.cwd(), 'media', 'logo.png')
      await documentPage.uploadDocument(testImagePath)
      
      // Wait for document to be processed
      await expect(documentPage.documentImage).toBeVisible()
      
      // Verify we're authenticated by checking for the seal document button
      await expect(documentPage.sealDocumentButton).toBeVisible({ timeout: 10000 })
      
      // Navigate to a different page
      await page.goto('http://localhost:5173/')
      
      // Wait a moment for navigation to complete
      await page.waitForLoadState('networkidle')
      
      // Return to the document page
      await documentPage.goto()
      
      // Wait for page to be ready
      await page.waitForLoadState('networkidle')
      
      // Since there might already be a document loaded, just check if we can see the auth state
      // Look for either the seal button (if document is loaded) or auth buttons (if not)
      try {
        // Try to find the seal button first (document already loaded)
        await expect(documentPage.sealDocumentButton).toBeVisible({ timeout: 5000 })
        console.log('Session persisted - seal button visible')
      } catch {
        // If no seal button, upload a document and then check
        console.log('No document loaded, uploading new document to verify session')
        await documentPage.uploadDocument(testImagePath)
        await expect(documentPage.documentImage).toBeVisible()
        await expect(documentPage.sealDocumentButton).toBeVisible({ timeout: 10000 })
      }
    })
  })
})
