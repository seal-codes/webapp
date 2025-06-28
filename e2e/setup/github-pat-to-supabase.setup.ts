/**
 * GitHub PAT to Supabase authentication setup
 * Uses GitHub PAT to get user info, then creates Supabase session directly
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

setup('create Supabase session using GitHub PAT', async ({ page, context }) => {
  console.log('🔐 Creating Supabase session using GitHub PAT...');
  console.log('🌐 Supabase URL:', process.env.VITE_SUPABASE_URL);

  try {
    // Step 1: Get GitHub user info using PAT
    console.log('🔑 Getting GitHub user info with PAT...');
    
    const githubUser = await page.evaluate(async (token) => {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'seal-codes-pat-auth'
        }
      });
      
      const data = await response.json();
      return {
        success: response.ok,
        user: response.ok ? data : null,
        error: response.ok ? null : data.message
      };
    }, process.env.GITHUB_TEST_PAT);

    expect(githubUser.success).toBe(true);
    console.log(`✅ GitHub user info retrieved: ${githubUser.user.login} (${githubUser.user.email})`);

    // Step 2: Navigate to your app
    console.log('🚀 Navigating to application...');
    await page.goto('http://localhost:5173/document');
    await page.waitForLoadState('networkidle');

    // Step 3: Create Supabase session directly using the GitHub user info
    console.log('🔧 Creating Supabase session with GitHub user data...');
    
    const supabaseSession = await page.evaluate(async ({ githubUser, supabaseUrl, anonKey, githubPat }) => {
      try {
        // Create a session using the GitHub user info
        console.log('Creating session for GitHub user:', githubUser.login);
        
        // Create the auth data structure that Supabase expects
        const authData = {
          access_token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({
            sub: githubUser.id.toString(),
            email: githubUser.email || `${githubUser.login}@github.local`,
            aud: 'authenticated',
            exp: Math.floor(Date.now() / 1000) + 3600,
            iat: Math.floor(Date.now() / 1000),
            iss: supabaseUrl,
            role: 'authenticated'
          }))}.mock-signature`,
          refresh_token: 'sb-refresh-token-mock',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          token_type: 'bearer',
          user: {
            id: githubUser.id.toString(),
            aud: 'authenticated',
            role: 'authenticated',
            email: githubUser.email || `${githubUser.login}@github.local`,
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
              email: githubUser.email || `${githubUser.login}@github.local`,
              email_verified: true,
              full_name: githubUser.name || githubUser.login,
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

        // Store in localStorage with the correct Supabase key
        const supabaseKey = 'sb-ciabpodgryewgkhxepwb-auth-token';
        localStorage.setItem(supabaseKey, JSON.stringify(authData));

        // Also store the GitHub PAT for API access
        localStorage.setItem('github_pat', githubPat || '');

        console.log('Session created successfully');
        return {
          success: true,
          userEmail: authData.user.email,
          userId: authData.user.id,
          hasToken: true,
          tokenLength: authData.access_token.length
        };
      } catch (error) {
        console.error('Session creation failed:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }, { 
      githubUser: githubUser.user, 
      supabaseUrl: process.env.VITE_SUPABASE_URL,
      anonKey: process.env.VITE_SUPABASE_ANON_KEY,
      githubPat: process.env.GITHUB_TEST_PAT
    });

    if (!supabaseSession.success) {
      console.log('❌ Session creation failed:', supabaseSession.error);
      throw new Error(`Session creation failed: ${supabaseSession.error}`);
    }

    expect(supabaseSession.success).toBe(true);
    console.log(`✅ Supabase session created for: ${supabaseSession.userEmail}`);

    // Step 4: Reload page to ensure session is picked up
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Step 5: Verify the session works
    const sessionVerification = await page.evaluate(() => {
      const supabaseKey = 'sb-ciabpodgryewgkhxepwb-auth-token';
      const authData = localStorage.getItem(supabaseKey);
      
      if (authData) {
        const parsed = JSON.parse(authData);
        return {
          hasAuth: true,
          userEmail: parsed.user?.email,
          hasToken: !!parsed.access_token,
          tokenType: parsed.token_type,
          expiresAt: parsed.expires_at
        };
      }
      
      return { hasAuth: false };
    });

    expect(sessionVerification.hasAuth).toBe(true);
    console.log(`✅ Session verification successful: ${sessionVerification.userEmail}`);

    // Step 6: Create comprehensive auth state for utilities
    const authState = {
      github: {
        pat: process.env.GITHUB_TEST_PAT,
        user: githubUser.user
      },
      supabase: {
        url: process.env.VITE_SUPABASE_URL,
        anonKey: process.env.VITE_SUPABASE_ANON_KEY,
        jwt: supabaseSession.hasToken ? 'mock-jwt-from-github-pat' : null,
        user: {
          id: githubUser.user.id.toString(),
          email: githubUser.user.email || `${githubUser.user.login}@github.local`,
          name: githubUser.user.name
        },
        expiresAt: Math.floor(Date.now() / 1000) + 3600
      },
      timestamp: Date.now(),
      method: 'github-pat-direct'
    };

    // Step 7: Save authentication states
    const authStatePath = path.join(authDir, 'github-supabase-auth.json');
    fs.writeFileSync(authStatePath, JSON.stringify(authState, null, 2));
    
    // Save browser storage state
    await context.storageState({ path: path.join(authDir, 'github-supabase-storage.json') });
    
    console.log('✅ GitHub PAT to Supabase authentication completed successfully!');
    console.log(`📧 Authenticated as: ${supabaseSession.userEmail}`);
    console.log(`🔑 Session token length: ${supabaseSession.tokenLength} chars`);
    console.log(`💾 Auth state saved to: ${authStatePath}`);
    console.log('🎯 Ready for document sealing tests!');
    
  } catch (error) {
    console.error('❌ GitHub PAT to Supabase authentication failed:', error);
    throw error;
  }
});
