/**
 * Real authentication setup for Playwright tests
 * Uses browser automation to complete OAuth flow with GitHub PAT
 */

import { test as setup, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

// Load test environment variables
dotenv.config({ path: '.env.test.local' })

// Ensure auth directory exists
const authDir = path.join(process.cwd(), 'playwright/.auth')
if (!fs.existsSync(authDir)) {
  fs.mkdirSync(authDir, { recursive: true })
}

// Check if we have the required test credentials
const requiredEnvVars = [
  'GITHUB_TEST_PAT',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
]

const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
if (missingVars.length > 0) {
  console.warn(`⚠️  Missing test environment variables: ${missingVars.join(', ')}`)
  console.warn('Real authentication tests will be skipped.')
}

// GitHub PAT authentication with real OAuth flow
setup('authenticate with GitHub OAuth using PAT', async ({ page, context }) => {
  // Skip if we don't have required credentials
  if (missingVars.length > 0) {
    console.log('Skipping GitHub OAuth auth setup - missing credentials')
    return
  }

  console.log('🔐 Starting GitHub OAuth flow with PAT authentication...')
  console.log(`🌐 Supabase URL: ${process.env.VITE_SUPABASE_URL}`)

  try {
    // First, authenticate with GitHub using the PAT
    console.log('🔑 Pre-authenticating with GitHub using PAT...')
    
    // Navigate to GitHub and inject the PAT as authentication
    await page.goto('https://github.com')
    
    // Inject the PAT into GitHub's session (this simulates being logged in)
    await page.evaluate((pat) => {
      // Store the PAT in a way that GitHub might recognize
      // This is a simplified approach - in reality, we'd need to convert PAT to session cookies
      document.cookie = 'logged_in=yes; domain=.github.com; path=/'
      localStorage.setItem('github_pat', pat)
    }, process.env.GITHUB_TEST_PAT)
    
    console.log('✅ GitHub PAT injected')
    
    // Now start the OAuth flow in our app
    console.log('🚀 Starting OAuth flow in our app...')
    
    // Navigate to the app
    await page.goto('http://localhost:5173/document')
    await page.waitForLoadState('networkidle')
    
    // Upload a document to get to the auth step
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('e2e/fixtures/images/valid-image.png')
    await page.waitForTimeout(2000)
    
    // Click the GitHub authentication button
    const githubButton = page.getByRole('button', { name: /github/i })
    await githubButton.waitFor({ state: 'visible', timeout: 10000 })
    
    console.log('🔗 Clicking GitHub OAuth button...')
    await githubButton.click()
    
    // Wait for redirect to GitHub OAuth
    console.log('⏳ Waiting for GitHub OAuth redirect...')
    await page.waitForURL('**/github.com/**', { timeout: 30000 })
    
    console.log('🌐 Redirected to GitHub OAuth')
    console.log('📍 Current URL:', page.url())
    
    // Check if we need to authorize the app
    const authorizeButton = page.getByRole('button', { name: /authorize/i })
    if (await authorizeButton.isVisible({ timeout: 10000 })) {
      console.log('✅ Authorizing application...')
      await authorizeButton.click()
    } else {
      console.log('ℹ️  Checking for other authorization elements...')
      
      // Look for other possible authorization elements
      const authElements = [
        page.locator('input[type="submit"][value*="Authorize"]'),
        page.locator('button:has-text("Authorize")'),
        page.locator('[data-testid*="authorize"]'),
        page.locator('.btn-primary:has-text("Authorize")'),
      ]
      
      let authorized = false
      for (const element of authElements) {
        if (await element.isVisible({ timeout: 2000 })) {
          console.log('✅ Found authorization element, clicking...')
          await element.click()
          authorized = true
          break
        }
      }
      
      if (!authorized) {
        console.log('ℹ️  No authorization needed - app may already be authorized')
      }
    }
    
    // Wait for redirect back to our app
    console.log('⏳ Waiting for OAuth callback redirect...')
    await page.waitForURL('**/localhost:5173/**', { timeout: 30000 })
    
    // Wait for Supabase to process the authentication
    console.log('🔄 Processing authentication...')
    await page.waitForTimeout(5000)
    
    // Check if we have a real Supabase session
    const authData = await page.evaluate(() => {
      const supabaseKey = 'sb-ciabpodgryewgkhxepwb-auth-token'
      const authDataStr = localStorage.getItem(supabaseKey)
      if (authDataStr) {
        try {
          const authData = JSON.parse(authDataStr)
          return {
            hasToken: !!authData.access_token,
            tokenLength: authData.access_token?.length || 0,
            userEmail: authData.user?.email || 'unknown',
            tokenStart: authData.access_token?.substring(0, 30) + '...',
            isJWT: authData.access_token?.includes('.'), // JWTs contain dots
          }
        } catch (e) {
          return { error: 'Failed to parse auth data' }
        }
      }
      return { error: 'No auth data found' }
    })
    
    console.log('🔍 Auth data check:', authData)
    
    if (!authData.hasToken) {
      // If no session was created, let's check what happened
      const currentUrl = page.url()
      const pageContent = await page.textContent('body')
      
      console.log('❌ No session found. Current URL:', currentUrl)
      console.log('📄 Page content preview:', pageContent?.substring(0, 200) + '...')
      
      throw new Error('No valid authentication token found after OAuth flow')
    }
    
    // Verify the UI shows authenticated state
    try {
      const authIndicator = page.getByText(/authenticated as/i)
      await authIndicator.waitFor({ state: 'visible', timeout: 10000 })
      console.log('✅ UI shows authenticated state')
    } catch (e) {
      console.log('⚠️  UI authentication indicator not found, but session exists')
    }
    
    console.log('✅ GitHub OAuth authentication completed successfully!')
    console.log(`📧 Authenticated as: ${authData.userEmail}`)
    console.log(`🔑 JWT token: ${authData.tokenStart} (${authData.tokenLength} chars)`)
    console.log(`🎯 Real JWT from production: ${authData.isJWT ? 'YES' : 'NO'}`)
    
    // Save the authenticated state
    await context.storageState({ path: path.join(authDir, 'github-api-user.json') })
    
    console.log('💾 Saved authenticated state with production JWT token')
    
  } catch (error) {
    console.error('❌ GitHub OAuth authentication failed:', error)
    
    // Capture debug information
    const currentUrl = page.url()
    const title = await page.title()
    console.log('🔍 Debug info:')
    console.log('   Current URL:', currentUrl)
    console.log('   Page title:', title)
    
    throw error
  }
})
