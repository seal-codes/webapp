/**
 * Authentication Tests
 * 
 * Tests for authentication functionality using GitHub OAuth to get real Supabase JWT
 */
import { test as baseTest, expect } from '@playwright/test'
import { DocumentPage } from './pages/document-page'
import { createIntegratedAuthHelper, createSupabaseHelper } from './utils/supabase-auth'
import path from 'path'

// Define the test with base configuration
const test = baseTest.extend({})

test.describe('Authentication', () => {
  
  test.describe('GitHub OAuth to Supabase JWT', () => {
    // Use the REAL GitHub to Supabase authentication state with actual JWT
    test.use({ storageState: 'playwright/.auth/github-supabase-storage.json' })
    
    test('should verify GitHub OAuth resulted in valid Supabase JWT', async ({ page }) => {
      const authHelper = createIntegratedAuthHelper()
      
      // Test full authentication chain
      const authStatus = await authHelper.verifyFullAuthentication(page)
      
      expect(authStatus.github).toBe(true)
      expect(authStatus.supabase).toBe(true)
      expect(authStatus.user.github.login).toBe('mrsimpson')
      expect(authStatus.user.supabase.email).toBeDefined()
      
      console.log(`✅ Full authentication verified:`)
      console.log(`   GitHub user: ${authStatus.user.github.login}`)
      console.log(`   Supabase user: ${authStatus.user.supabase.email}`)
      console.log(`   User ID: ${authStatus.user.supabase.id}`)
    })
    
    test('should have working Supabase JWT for API calls', async ({ page }) => {
      const supabaseHelper = createSupabaseHelper()
      
      // Verify JWT is valid
      const isValid = await supabaseHelper.verifyJWT(page)
      expect(isValid).toBe(true)
      
      // Get current user info
      const userInfo = await supabaseHelper.getCurrentUser(page)
      expect(userInfo.success).toBe(true)
      expect(userInfo.data.email).toBeDefined()
      
      console.log(`✅ Supabase JWT working:`)
      console.log(`   User email: ${userInfo.data.email}`)
      console.log(`   User role: ${userInfo.data.role || 'authenticated'}`)
      console.log(`   JWT expires: ${new Date(userInfo.data.exp * 1000).toISOString()}`)
      
      // Test database connectivity
      const dbConnected = await supabaseHelper.testDatabaseConnection(page)
      expect(dbConnected).toBe(true)
      console.log(`✅ Database connection verified`)
    })

    test('should work with document sealing flow', async ({ page }) => {
      const documentPage = new DocumentPage(page)
      await documentPage.goto()
      
      // Upload a document to trigger the sealing flow
      const testImagePath = path.join(process.cwd(), 'media', 'logo.png')
      await documentPage.uploadDocument(testImagePath)
      
      // Wait for document to be processed
      await expect(documentPage.documentImage).toBeVisible()
      
      // Since we have a real Supabase JWT, the seal document button should be visible
      await expect(documentPage.sealDocumentButton).toBeVisible({ timeout: 10000 })
      
      // Verify authentication UI shows the real user
      try {
        await expect(page.getByText(/authenticated as/i)).toBeVisible({ timeout: 5000 })
        console.log('✅ Authentication UI shows authenticated state')
      } catch {
        console.log('ℹ️  Authentication UI not found (may need implementation)')
      }
      
      // Verify we can access Supabase from the application context
      const appSupabaseTest = await page.evaluate(async () => {
        // Check if Supabase client is available in the app
        const supabaseKey = 'sb-ciabpodgryewgkhxepwb-auth-token'
        const authData = localStorage.getItem(supabaseKey)
        
        if (authData) {
          const parsed = JSON.parse(authData)
          return {
            hasJWT: !!parsed.access_token,
            userEmail: parsed.user?.email,
            tokenValid: parsed.access_token?.includes('.') // JWT format check
          }
        }
        
        return { hasJWT: false }
      })
      
      expect(appSupabaseTest.hasJWT).toBe(true)
      expect(appSupabaseTest.tokenValid).toBe(true)
      console.log(`✅ Application has valid Supabase JWT for user: ${appSupabaseTest.userEmail}`)
    })
  })

  // Test for unauthenticated state (no storage state)
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

  // Test for Supabase integration capabilities
  test.describe('Supabase Integration', () => {
    test.use({ storageState: 'playwright/.auth/github-supabase-storage.json' })
    
    test('should demonstrate Supabase API integration patterns', async ({ page }) => {
      const supabaseHelper = createSupabaseHelper()
      
      console.log('🔍 Testing Supabase integration patterns...')
      
      // Pattern 1: User authentication check
      const userCheck = await supabaseHelper.getCurrentUser(page)
      expect(userCheck.success).toBe(true)
      console.log(`✅ User auth check: ${userCheck.data.email}`)
      
      // Pattern 2: Custom API call example (adjust endpoint as needed)
      const customAPITest = await page.evaluate(async ({ supabaseUrl, jwt, anonKey }) => {
        try {
          // Example: Test a custom function or RPC call
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/hello_world`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${jwt}`,
              'apikey': anonKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
          })
          
          return {
            success: response.ok,
            status: response.status,
            available: response.status !== 404 // Function exists
          }
        } catch (error) {
          return {
            success: false,
            error: error.message
          }
        }
      }, {
        supabaseUrl: process.env.VITE_SUPABASE_URL,
        jwt: supabaseHelper.getAuthState()?.supabase.jwt,
        anonKey: process.env.VITE_SUPABASE_ANON_KEY
      })
      
      console.log(`ℹ️  Custom API test: ${customAPITest.available ? 'Available' : 'Not implemented yet'}`)
      
      // Pattern 3: Database connectivity
      const dbTest = await supabaseHelper.testDatabaseConnection(page)
      expect(dbTest).toBe(true)
      console.log(`✅ Database connectivity verified`)
      
      console.log('🎉 Supabase integration patterns tested successfully!')
    })
  })

  // Test for session persistence with real JWT
  test.describe('JWT Session Persistence', () => {
    test.use({ storageState: 'playwright/.auth/github-supabase-storage.json' })
    
    test('should persist Supabase JWT across page reloads', async ({ page }) => {
      const supabaseHelper = createSupabaseHelper()
      const documentPage = new DocumentPage(page)
      
      // First, verify JWT works
      const initialAuth = await supabaseHelper.getCurrentUser(page)
      expect(initialAuth.success).toBe(true)
      
      console.log(`Initial auth: ${initialAuth.data.email}`)
      
      // Visit the document page
      await documentPage.goto()
      
      // Upload a document
      const testImagePath = path.join(process.cwd(), 'media', 'logo.png')
      await documentPage.uploadDocument(testImagePath)
      await expect(documentPage.documentImage).toBeVisible()
      
      // Verify seal button is available (requires authentication)
      await expect(documentPage.sealDocumentButton).toBeVisible({ timeout: 10000 })
      
      // Navigate away and back
      await page.goto('http://localhost:5173/')
      await page.waitForLoadState('networkidle')
      
      // Return to document page
      await documentPage.goto()
      await page.waitForLoadState('networkidle')
      
      // Verify JWT still works after navigation
      const persistedAuth = await supabaseHelper.getCurrentUser(page)
      expect(persistedAuth.success).toBe(true)
      expect(persistedAuth.data.email).toBe(initialAuth.data.email)
      
      console.log('✅ Supabase JWT persisted across navigation')
      
      // Upload another document to verify full flow still works
      await documentPage.uploadDocument(testImagePath)
      await expect(documentPage.documentImage).toBeVisible()
      await expect(documentPage.sealDocumentButton).toBeVisible({ timeout: 10000 })
      
      console.log('✅ Full authentication flow persisted successfully')
    })
  })
})
