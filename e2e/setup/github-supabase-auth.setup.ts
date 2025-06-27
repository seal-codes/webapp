/**
 * GitHub to Supabase authentication setup for Playwright tests
 * Uses GitHub PAT to authenticate, then gets real Supabase JWT through OAuth flow
 */

import { test as setup, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test.local' });

// Ensure auth directory exists
const authDir = path.join(process.cwd(), 'playwright/.auth');
if (!fs.existsSync(authDir)) {
  fs.mkdirSync(authDir, { recursive: true });
}

// Check if we have the required test credentials
const requiredEnvVars = [
  'GITHUB_TEST_PAT',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.warn(`⚠️  Missing test environment variables: ${missingVars.join(', ')}`);
  console.warn('GitHub to Supabase authentication tests will be skipped.');
}

setup('authenticate GitHub and get Supabase JWT', async ({ page, context }) => {
  // Skip if we don't have required credentials
  if (missingVars.length > 0) {
    console.log('Skipping GitHub to Supabase auth setup - missing credentials');
    return;
  }

  console.log('🔐 Starting GitHub to Supabase authentication flow...');
  console.log(`🌐 Supabase URL: ${process.env.VITE_SUPABASE_URL}`);

  try {
    // Step 1: Verify GitHub PAT works
    console.log('🔑 Verifying GitHub PAT...');
    
    const githubAuth = await page.evaluate(async (token) => {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'seal-codes-supabase-auth'
        }
      });
      
      const data = await response.json();
      return {
        success: response.ok,
        user: response.ok ? data : null,
        error: response.ok ? null : data.message
      };
    }, process.env.GITHUB_TEST_PAT);

    expect(githubAuth.success).toBe(true);
    console.log(`✅ GitHub PAT verified for user: ${githubAuth.user.login}`);

    // Step 2: Navigate to your app and start OAuth flow
    console.log('🚀 Starting OAuth flow in your application...');
    
    await page.goto('http://localhost:5173/document');
    await page.waitForLoadState('networkidle');
    
    // Upload a document to trigger the authentication flow
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('e2e/fixtures/images/valid-image.png');
    await page.waitForTimeout(2000);
    
    // Click the GitHub authentication button
    const githubButton = page.getByRole('button', { name: /github/i });
    await githubButton.waitFor({ state: 'visible', timeout: 10000 });
    
    console.log('🔗 Clicking GitHub OAuth button...');
    await githubButton.click();
    
    // Step 3: Handle GitHub OAuth flow
    console.log('⏳ Waiting for GitHub OAuth redirect...');
    await page.waitForURL('**/github.com/**', { timeout: 30000 });
    
    console.log('🌐 On GitHub OAuth page');
    
    // Since we have a valid PAT, we should be able to authorize automatically
    // Look for authorization elements
    const authElements = [
      page.getByRole('button', { name: /authorize/i }),
      page.locator('input[type="submit"][value*="Authorize"]'),
      page.locator('button:has-text("Authorize")'),
      page.locator('.btn-primary:has-text("Authorize")')
    ];
    
    let authorized = false;
    for (const element of authElements) {
      if (await element.isVisible({ timeout: 5000 })) {
        console.log('✅ Found authorization element, clicking...');
        await element.click();
        authorized = true;
        break;
      }
    }
    
    if (!authorized) {
      console.log('ℹ️  No authorization needed - app may already be authorized');
    }
    
    // Step 4: Wait for redirect back to your app
    console.log('⏳ Waiting for OAuth callback redirect...');
    await page.waitForURL('**/localhost:5173/**', { timeout: 30000 });
    
    // Step 5: Wait for Supabase to process the authentication
    console.log('🔄 Processing Supabase authentication...');
    await page.waitForTimeout(5000);
    
    // Step 6: Extract the real Supabase JWT
    const supabaseAuth = await page.evaluate(() => {
      const supabaseKey = 'sb-ciabpodgryewgkhxepwb-auth-token';
      const authDataStr = localStorage.getItem(supabaseKey);
      
      if (authDataStr) {
        try {
          const authData = JSON.parse(authDataStr);
          return {
            hasToken: !!authData.access_token,
            tokenLength: authData.access_token?.length || 0,
            userEmail: authData.user?.email || 'unknown',
            userId: authData.user?.id || 'unknown',
            tokenStart: authData.access_token?.substring(0, 30) + '...',
            isJWT: authData.access_token?.includes('.'), // JWTs contain dots
            fullAuthData: authData // Store complete auth data
          };
        } catch (e) {
          return { error: 'Failed to parse auth data', details: e.message };
        }
      }
      return { error: 'No auth data found' };
    });
    
    console.log('🔍 Supabase auth data check:', {
      hasToken: supabaseAuth.hasToken,
      tokenLength: supabaseAuth.tokenLength,
      userEmail: supabaseAuth.userEmail,
      isJWT: supabaseAuth.isJWT
    });
    
    if (!supabaseAuth.hasToken) {
      const currentUrl = page.url();
      const pageContent = await page.textContent('body');
      
      console.log('❌ No Supabase session found. Current URL:', currentUrl);
      console.log('📄 Page content preview:', pageContent?.substring(0, 200) + '...');
      
      throw new Error('No valid Supabase JWT token found after OAuth flow');
    }
    
    // Step 7: Verify the UI shows authenticated state
    try {
      const authIndicator = page.getByText(/authenticated as/i);
      await authIndicator.waitFor({ state: 'visible', timeout: 10000 });
      console.log('✅ UI shows authenticated state');
    } catch (e) {
      console.log('⚠️  UI authentication indicator not found, but JWT exists');
    }
    
    // Step 8: Create comprehensive auth state
    const authState = {
      github: {
        pat: process.env.GITHUB_TEST_PAT,
        user: githubAuth.user
      },
      supabase: {
        url: process.env.VITE_SUPABASE_URL,
        anonKey: process.env.VITE_SUPABASE_ANON_KEY,
        jwt: supabaseAuth.fullAuthData.access_token,
        refreshToken: supabaseAuth.fullAuthData.refresh_token,
        user: supabaseAuth.fullAuthData.user,
        expiresAt: supabaseAuth.fullAuthData.expires_at
      },
      timestamp: Date.now()
    };
    
    // Step 9: Save authentication states
    const authStatePath = path.join(authDir, 'github-supabase-auth.json');
    fs.writeFileSync(authStatePath, JSON.stringify(authState, null, 2));
    
    // Save browser storage state with the real Supabase session
    await context.storageState({ path: path.join(authDir, 'github-supabase-storage.json') });
    
    console.log('✅ GitHub to Supabase authentication completed successfully!');
    console.log(`📧 Authenticated as: ${supabaseAuth.userEmail}`);
    console.log(`🔑 Supabase JWT: ${supabaseAuth.tokenStart} (${supabaseAuth.tokenLength} chars)`);
    console.log(`🎯 Real JWT from Supabase: ${supabaseAuth.isJWT ? 'YES' : 'NO'}`);
    console.log(`💾 Auth state saved to: ${authStatePath}`);
    
    // Step 10: Verify the JWT works with Supabase
    const jwtVerification = await page.evaluate(async ({ supabaseUrl, jwt }) => {
      try {
        const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'apikey': process.env.VITE_SUPABASE_ANON_KEY
          }
        });
        
        const userData = await response.json();
        return {
          success: response.ok,
          user: response.ok ? userData : null,
          error: response.ok ? null : userData.message
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    }, { 
      supabaseUrl: process.env.VITE_SUPABASE_URL, 
      jwt: supabaseAuth.fullAuthData.access_token 
    });
    
    if (jwtVerification.success) {
      console.log('✅ Supabase JWT verification successful');
      console.log(`👤 Supabase user: ${jwtVerification.user.email}`);
    } else {
      console.log('⚠️  Supabase JWT verification failed:', jwtVerification.error);
    }
    
  } catch (error) {
    console.error('❌ GitHub to Supabase authentication failed:', error);
    
    // Capture debug information
    const currentUrl = page.url();
    const title = await page.title();
    console.log('🔍 Debug info:');
    console.log('   Current URL:', currentUrl);
    console.log('   Page title:', title);
    
    throw error;
  }
});
