/**
 * Mock Supabase authentication setup for testing document sealing
 * Creates a minimal auth state to test sealing functionality
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

setup('create mock Supabase authentication for sealing tests', async ({ page, context }) => {
  console.log('🔧 Setting up mock Supabase authentication for sealing tests...');

  try {
    // Navigate to your app
    await page.goto('http://localhost:5173/document');
    await page.waitForLoadState('networkidle');

    // Inject mock Supabase authentication directly into localStorage
    const mockAuthSetup = await page.evaluate(({ supabaseUrl, anonKey, githubPat }) => {
      // Create a mock JWT-like token (this is just for testing UI behavior)
      const mockJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk5OTk5OTk5OTksImVtYWlsIjoibXJzaW1wc29uQGV4YW1wbGUuY29tIn0.mock_signature';
      
      const mockAuthData = {
        access_token: mockJWT,
        refresh_token: 'mock_refresh_token',
        expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        token_type: 'bearer',
        user: {
          id: 'mock-user-id-12345',
          email: 'mrsimpson@example.com',
          user_metadata: {
            name: 'Oliver Jägle',
            avatar_url: 'https://avatars.githubusercontent.com/u/17176678?v=4'
          },
          app_metadata: {
            provider: 'github',
            providers: ['github']
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      };

      // Store in localStorage with the correct Supabase key
      const supabaseKey = 'sb-ciabpodgryewgkhxepwb-auth-token';
      localStorage.setItem(supabaseKey, JSON.stringify(mockAuthData));

      // Also set some additional mock data that your app might expect
      localStorage.setItem('github_pat', githubPat || '');
      
      return {
        success: true,
        userEmail: mockAuthData.user.email,
        hasToken: true
      };
    }, {
      supabaseUrl: process.env.VITE_SUPABASE_URL,
      anonKey: process.env.VITE_SUPABASE_ANON_KEY,
      githubPat: process.env.GITHUB_TEST_PAT
    });

    expect(mockAuthSetup.success).toBe(true);
    console.log(`✅ Mock authentication created for: ${mockAuthSetup.userEmail}`);

    // Reload the page to ensure the auth state is picked up
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify the mock auth is working by checking localStorage
    const authVerification = await page.evaluate(() => {
      const supabaseKey = 'sb-ciabpodgryewgkhxepwb-auth-token';
      const authData = localStorage.getItem(supabaseKey);
      
      if (authData) {
        const parsed = JSON.parse(authData);
        return {
          hasAuth: true,
          userEmail: parsed.user?.email,
          hasToken: !!parsed.access_token
        };
      }
      
      return { hasAuth: false };
    });

    expect(authVerification.hasAuth).toBe(true);
    console.log(`✅ Mock authentication verified: ${authVerification.userEmail}`);

    // Save the browser state with mock authentication
    await context.storageState({ path: path.join(authDir, 'mock-supabase-storage.json') });

    // Create a mock auth state file for utilities
    const mockAuthState = {
      github: {
        pat: process.env.GITHUB_TEST_PAT,
        user: {
          login: 'mrsimpson',
          id: 17176678,
          email: 'mrsimpson@example.com'
        }
      },
      supabase: {
        url: process.env.VITE_SUPABASE_URL,
        anonKey: process.env.VITE_SUPABASE_ANON_KEY,
        jwt: 'mock_jwt_token_for_testing',
        refreshToken: 'mock_refresh_token',
        user: {
          id: 'mock-user-id-12345',
          email: 'mrsimpson@example.com',
          name: 'Oliver Jägle'
        },
        expiresAt: Math.floor(Date.now() / 1000) + 3600
      },
      timestamp: Date.now(),
      isMock: true
    };

    const authStatePath = path.join(authDir, 'mock-supabase-auth.json');
    fs.writeFileSync(authStatePath, JSON.stringify(mockAuthState, null, 2));

    console.log('✅ Mock Supabase authentication setup completed!');
    console.log(`💾 Mock auth state saved to: ${authStatePath}`);
    console.log('🔧 This is a mock setup for testing UI behavior - backend calls may fail');

  } catch (error) {
    console.error('❌ Mock Supabase authentication setup failed:', error);
    throw error;
  }
});
