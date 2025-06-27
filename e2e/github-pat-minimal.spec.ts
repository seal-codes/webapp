/**
 * Minimal GitHub PAT test demonstrating what works and what doesn't
 * This test shows the current limitations and working patterns
 */

import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test.local' });

test.describe('GitHub PAT Minimal Working Example', () => {
  
  test('should demonstrate working PAT patterns and limitations', async ({ page }) => {
    const pat = process.env.GITHUB_TEST_PAT;
    
    if (!pat) {
      test.skip('GITHUB_TEST_PAT not found in environment');
    }

    console.log('🎯 Minimal GitHub PAT Test');
    console.log('📝 Repository: mrsimpson/seal.codes.webapp');

    const result = await page.evaluate(async (token) => {
      // Test what actually works with the current PAT
      try {
        // 1. Repository metadata access (THIS WORKS)
        const repoResponse = await fetch('https://api.github.com/repos/mrsimpson/seal.codes.webapp', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'seal-codes-minimal-test'
          }
        });
        
        const repoData = await repoResponse.json();
        
        // 2. User info access (THIS WORKS)
        const userResponse = await fetch('https://api.github.com/user', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'seal-codes-minimal-test'
          }
        });
        
        const userData = await userResponse.json();
        
        // 3. Repository contents access (THIS FAILS with fine-grained PAT)
        const contentsResponse = await fetch('https://api.github.com/repos/mrsimpson/seal.codes.webapp/contents', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'seal-codes-minimal-test'
          }
        });
        
        const contentsData = await contentsResponse.json();
        
        return {
          repositoryAccess: {
            success: repoResponse.ok,
            status: repoResponse.status,
            canSeeMetadata: repoResponse.ok,
            repoName: repoData.name,
            isPrivate: repoData.private,
            owner: repoData.owner?.login
          },
          userAccess: {
            success: userResponse.ok,
            status: userResponse.status,
            username: userData.login,
            userId: userData.id
          },
          contentsAccess: {
            success: contentsResponse.ok,
            status: contentsResponse.status,
            error: contentsData.message,
            canReadFiles: contentsResponse.ok
          }
        };
      } catch (error) {
        return {
          error: error.message
        };
      }
    }, pat);

    console.log('\n📊 RESULTS:');
    console.log('='.repeat(40));
    
    console.log('\n✅ WHAT WORKS:');
    console.log(`   Repository Metadata: ${result.repositoryAccess.success ? '✅' : '❌'}`);
    console.log(`   User Information: ${result.userAccess.success ? '✅' : '❌'}`);
    
    console.log('\n❌ WHAT DOESN\'T WORK:');
    console.log(`   Repository Contents: ${result.contentsAccess.success ? '✅' : '❌'}`);
    
    if (result.repositoryAccess.success) {
      console.log('\n📋 Repository Info:');
      console.log(`   Name: ${result.repositoryAccess.repoName}`);
      console.log(`   Owner: ${result.repositoryAccess.owner}`);
      console.log(`   Private: ${result.repositoryAccess.isPrivate}`);
    }
    
    if (result.userAccess.success) {
      console.log('\n👤 User Info:');
      console.log(`   Username: ${result.userAccess.username}`);
      console.log(`   User ID: ${result.userAccess.userId}`);
    }
    
    if (!result.contentsAccess.success) {
      console.log('\n⚠️  Contents Access Error:');
      console.log(`   Status: ${result.contentsAccess.status}`);
      console.log(`   Error: ${result.contentsAccess.error}`);
    }

    console.log('\n💡 ANALYSIS:');
    console.log('='.repeat(40));
    console.log('The current fine-grained PAT can:');
    console.log('  ✅ Authenticate with GitHub API');
    console.log('  ✅ Access repository metadata');
    console.log('  ✅ Verify repository exists and is private');
    console.log('  ❌ Read repository file contents');
    console.log('');
    console.log('This is likely due to:');
    console.log('  - Fine-grained PAT scope limitations');
    console.log('  - Repository permission settings');
    console.log('  - Organization policies (as seen in diagnostic)');

    console.log('\n🔧 SOLUTIONS:');
    console.log('='.repeat(40));
    console.log('1. Use classic PAT instead of fine-grained PAT');
    console.log('2. Adjust PAT scopes to include "Contents" permission');
    console.log('3. Reduce PAT lifetime to < 366 days for org access');
    console.log('4. Use OAuth App flow instead of PAT for full access');

    // Verify that at least basic authentication works
    expect(result.repositoryAccess.success).toBe(true);
    expect(result.userAccess.success).toBe(true);
    expect(result.repositoryAccess.repoName).toBe('seal.codes.webapp');
    expect(result.repositoryAccess.isPrivate).toBe(true);
    
    console.log('\n✅ Test completed - PAT authentication is working for metadata access');
  });

  test('should demonstrate browser navigation limitations', async ({ page }) => {
    console.log('🌐 Testing browser navigation to private GitHub repository...');
    
    // Navigate to the private repository
    await page.goto('https://github.com/mrsimpson/seal.codes.webapp');
    
    const pageTitle = await page.title();
    const currentUrl = page.url();
    
    console.log(`📍 URL: ${currentUrl}`);
    console.log(`📄 Title: ${pageTitle}`);
    
    // Check if we're seeing a 404 or login page
    const isNotFound = pageTitle.includes('Page not found') || pageTitle.includes('404');
    const needsLogin = currentUrl.includes('login') || pageTitle.includes('Sign in');
    
    console.log('\n📊 Navigation Result:');
    console.log(`   Shows 404: ${isNotFound}`);
    console.log(`   Needs Login: ${needsLogin}`);
    
    console.log('\n💡 Conclusion:');
    console.log('Direct browser navigation to private repositories requires:');
    console.log('  - Interactive GitHub login (OAuth flow)');
    console.log('  - Session cookies from GitHub.com');
    console.log('  - Cannot be achieved with PAT alone in browser context');
    
    // This test documents the limitation - we expect 404 or login redirect
    expect(isNotFound || needsLogin).toBe(true);
    
    console.log('\n✅ Browser limitation test completed');
  });
});
