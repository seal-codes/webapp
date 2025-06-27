/**
 * GitHub PAT authentication setup for Playwright tests
 * Uses the proven GitHub API approach with classic PAT
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
  console.warn('GitHub PAT authentication tests will be skipped.');
}

// GitHub PAT authentication setup using proven API approach
setup('verify GitHub PAT authentication', async ({ page, context }) => {
  // Skip if we don't have required credentials
  if (missingVars.length > 0) {
    console.log('Skipping GitHub PAT auth setup - missing credentials');
    return;
  }

  console.log('🔐 Setting up GitHub PAT authentication...');
  console.log(`🔑 PAT type: ${process.env.GITHUB_TEST_PAT?.startsWith('ghp_') ? 'Classic' : 'Fine-grained'}`);

  try {
    // Verify GitHub PAT works using the proven API approach
    const githubAuth = await page.evaluate(async (token) => {
      // Helper function for GitHub API calls
      const callGitHubAPI = async (endpoint) => {
        const response = await fetch(`https://api.github.com${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'seal-codes-e2e-test'
          }
        });
        
        const data = await response.json();
        return {
          success: response.ok,
          status: response.status,
          data: response.ok ? data : null,
          error: response.ok ? null : data.message
        };
      };

      // Test 1: Verify user authentication
      const userInfo = await callGitHubAPI('/user');
      
      // Test 2: Check rate limits
      const rateLimit = await callGitHubAPI('/rate_limit');
      
      // Test 3: List user repositories (to verify content access)
      const userRepos = await callGitHubAPI('/user/repos?per_page=3');
      
      // Test 4: Check organization access
      const orgAccess = await callGitHubAPI('/orgs/seal-codes');

      return {
        userAuth: userInfo,
        rateLimit: rateLimit,
        repoAccess: userRepos,
        orgAccess: orgAccess,
        // Store the working API helper for tests
        apiHelper: callGitHubAPI.toString()
      };
    }, process.env.GITHUB_TEST_PAT);

    // Verify authentication results
    console.log('🔍 GitHub PAT Verification Results:');
    console.log(`   User Authentication: ${githubAuth.userAuth.success ? '✅' : '❌'}`);
    console.log(`   Rate Limit Check: ${githubAuth.rateLimit.success ? '✅' : '❌'}`);
    console.log(`   Repository Access: ${githubAuth.repoAccess.success ? '✅' : '❌'}`);
    console.log(`   Organization Access: ${githubAuth.orgAccess.success ? '✅' : '❌'}`);

    if (githubAuth.userAuth.success) {
      console.log(`📧 Authenticated as: ${githubAuth.userAuth.data.login}`);
      console.log(`🆔 User ID: ${githubAuth.userAuth.data.id}`);
    }

    if (githubAuth.rateLimit.success) {
      console.log(`⏱️  Rate Limit: ${githubAuth.rateLimit.data.rate.remaining}/${githubAuth.rateLimit.data.rate.limit}`);
    }

    if (githubAuth.repoAccess.success) {
      console.log(`📚 Repository Access: ${githubAuth.repoAccess.data.length} repos accessible`);
    }

    // Ensure basic authentication works
    expect(githubAuth.userAuth.success).toBe(true);
    expect(githubAuth.userAuth.data.login).toBe('mrsimpson');

    // Create authentication state with GitHub PAT info
    const authState = {
      github: {
        pat: process.env.GITHUB_TEST_PAT,
        user: githubAuth.userAuth.data,
        capabilities: {
          userAuth: githubAuth.userAuth.success,
          repoAccess: githubAuth.repoAccess.success,
          orgAccess: githubAuth.orgAccess.success
        },
        rateLimit: githubAuth.rateLimit.data?.rate
      },
      supabase: {
        url: process.env.VITE_SUPABASE_URL,
        anonKey: process.env.VITE_SUPABASE_ANON_KEY
      }
    };

    // Save authentication state to file
    const authStatePath = path.join(authDir, 'github-pat-auth.json');
    fs.writeFileSync(authStatePath, JSON.stringify(authState, null, 2));

    // Also save browser storage state (empty but valid)
    await context.storageState({ path: path.join(authDir, 'github-pat-storage.json') });

    console.log('✅ GitHub PAT authentication setup completed successfully!');
    console.log(`💾 Auth state saved to: ${authStatePath}`);

  } catch (error) {
    console.error('❌ GitHub PAT authentication setup failed:', error);
    throw error;
  }
});

// Export helper function for use in tests
export const createGitHubAPIHelper = (pat: string) => {
  return async (page: any) => {
    return await page.evaluate(async (token: string) => {
      const callGitHubAPI = async (endpoint: string, options: any = {}) => {
        const response = await fetch(`https://api.github.com${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'seal-codes-e2e-test',
            ...options.headers
          },
          ...options
        });
        
        const data = await response.json();
        return {
          success: response.ok,
          status: response.status,
          data: response.ok ? data : null,
          error: response.ok ? null : data.message
        };
      };

      return { callGitHubAPI };
    }, token);
  };
};
