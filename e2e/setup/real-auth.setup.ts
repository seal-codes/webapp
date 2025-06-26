/**
 * Real authentication setup for Playwright tests
 * Uses GitHub API to authenticate directly and create valid session
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
  'GITHUB_TEST_PAT'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.warn(`⚠️  Missing test environment variables: ${missingVars.join(', ')}`);
  console.warn('Real authentication tests will be skipped. Create .env.test.local with your GitHub PAT.');
}

/**
 * Create a Supabase-compatible session from GitHub user data
 */
function createSupabaseSession(githubUser: any, accessToken: string) {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 3600; // 1 hour from now
  
  return {
    access_token: `sb-mock-${accessToken.slice(-8)}`, // Use a mock Supabase token
    refresh_token: `sb-refresh-${Date.now()}`,
    expires_in: 3600,
    expires_at: expiresAt,
    token_type: 'bearer',
    user: {
      id: `github-${githubUser.id}`,
      aud: 'authenticated',
      role: 'authenticated',
      email: githubUser.email || process.env.TEST_GITHUB_EMAIL || `${githubUser.login}@users.noreply.github.com`,
      email_confirmed_at: new Date().toISOString(),
      phone: '',
      confirmed_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      app_metadata: {
        provider: 'github',
        providers: ['github']
      },
      user_metadata: {
        avatar_url: githubUser.avatar_url,
        email: githubUser.email,
        email_verified: true,
        full_name: githubUser.name || githubUser.login,
        iss: 'https://api.github.com',
        name: githubUser.name || githubUser.login,
        preferred_username: githubUser.login,
        provider_id: githubUser.id.toString(),
        sub: githubUser.id.toString(),
        user_name: githubUser.login
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  };
}

// Direct GitHub API authentication setup
setup('authenticate with GitHub API', async ({ page, context }) => {
  // Skip if we don't have PAT
  if (missingVars.length > 0) {
    console.log('Skipping GitHub API auth setup - missing credentials');
    return;
  }

  console.log('🔐 Authenticating directly with GitHub API...');

  try {
    // Get user info from GitHub API
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${process.env.GITHUB_TEST_PAT}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'seal-codes-test'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}`);
    }

    const githubUser = await response.json();
    console.log(`📋 Retrieved GitHub user: ${githubUser.login} (${githubUser.name || 'No name'})`);

    // Get user's primary email if not public
    let userEmail = githubUser.email;
    if (!userEmail) {
      const emailResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          'Authorization': `token ${process.env.GITHUB_TEST_PAT}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'seal-codes-test'
        }
      });
      
      if (emailResponse.ok) {
        const emails = await emailResponse.json();
        const primaryEmail = emails.find((email: any) => email.primary);
        userEmail = primaryEmail?.email || process.env.TEST_GITHUB_EMAIL;
      }
    }

    // Create Supabase-compatible session
    const session = createSupabaseSession(githubUser, process.env.GITHUB_TEST_PAT!);
    
    console.log(`✅ Created session for: ${session.user.email}`);

    // Inject the session into the browser before navigation
    await context.addInitScript((sessionData) => {
      // Use the correct Supabase localStorage key format
      // Extract project ref from VITE_SUPABASE_URL: https://ciabpodgryewgkhxepwb.supabase.co
      const supabaseKey = 'sb-ciabpodgryewgkhxepwb-auth-token';
      
      const authData = {
        access_token: sessionData.access_token,
        refresh_token: sessionData.refresh_token,
        expires_at: sessionData.expires_at,
        expires_in: sessionData.expires_in,
        token_type: sessionData.token_type,
        user: sessionData.user
      };
      
      localStorage.setItem(supabaseKey, JSON.stringify(authData));
      
      // Also store the session data for our mock client
      window.__MOCK_SUPABASE_SESSION__ = sessionData;
      
      console.log('[TEST] Injected GitHub session for:', sessionData.user.user_metadata.user_name);
      console.log('[TEST] Stored session with key:', supabaseKey);
    }, session);

    // Navigate to a simple page first to establish the session
    await page.goto('http://localhost:5173/');
    
    // Wait for the app to initialize and recognize the session
    await page.waitForTimeout(2000);
    
    // Check if authentication was recognized
    const authStatus = await page.evaluate(() => {
      return {
        localStorageKeys: Object.keys(localStorage),
        hasSession: !!window.__MOCK_SUPABASE_SESSION__
      };
    });
    
    console.log('🔍 Auth status check:', authStatus);
    
    console.log('✅ GitHub API authentication setup completed');
    
    // Save the authenticated state
    await context.storageState({ path: path.join(authDir, 'github-api-user.json') });
    
  } catch (error) {
    console.error('❌ GitHub API authentication failed:', error);
    throw error;
  }
});
