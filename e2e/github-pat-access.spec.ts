/**
 * Minimal test to verify GitHub PAT access to private repository
 * Tests different approaches to use PAT in browser environment
 */

import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test.local' });

test.describe('GitHub PAT Access Tests', () => {
  
  test('should access private repository using PAT via GitHub API', async ({ page }) => {
    const pat = process.env.GITHUB_TEST_PAT;
    
    if (!pat) {
      test.skip('GITHUB_TEST_PAT not found in environment');
    }

    console.log('🔑 Testing GitHub PAT access to private repository...');
    console.log('📝 PAT preview:', pat?.substring(0, 20) + '...');

    // Test 1: Direct API access via fetch in browser context
    console.log('\n📡 Test 1: Direct GitHub API access via browser fetch...');
    
    const apiResult = await page.evaluate(async (token) => {
      try {
        const response = await fetch('https://api.github.com/repos/seal-codes/webapp', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'seal-codes-test'
          }
        });
        
        const data = await response.json();
        
        return {
          success: response.ok,
          status: response.status,
          hasReadme: !!data.description,
          repoName: data.name,
          isPrivate: data.private,
          error: response.ok ? null : data.message
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    }, pat);

    console.log('📊 API Result:', apiResult);
    
    if (apiResult.success) {
      expect(apiResult.repoName).toBe('webapp');
      expect(apiResult.isPrivate).toBe(true);
      console.log('✅ Successfully accessed private repository via API');
    } else {
      console.log('❌ API access failed:', apiResult.error);
    }

    // Test 2: Try to access repository README via GitHub API
    console.log('\n📄 Test 2: Accessing README.md via GitHub API...');
    
    const readmeResult = await page.evaluate(async (token) => {
      try {
        const response = await fetch('https://api.github.com/repos/seal-codes/webapp/readme', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'seal-codes-test'
          }
        });
        
        const data = await response.json();
        
        if (response.ok) {
          // Decode base64 content
          const content = atob(data.content);
          return {
            success: true,
            contentLength: content.length,
            contentPreview: content.substring(0, 100) + '...',
            encoding: data.encoding
          };
        } else {
          return {
            success: false,
            error: data.message,
            status: response.status
          };
        }
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    }, pat);

    console.log('📄 README Result:', readmeResult);
    
    if (readmeResult.success) {
      expect(readmeResult.contentLength).toBeGreaterThan(0);
      console.log('✅ Successfully accessed README.md content');
      console.log('📝 Content preview:', readmeResult.contentPreview);
    } else {
      console.log('❌ README access failed:', readmeResult.error);
    }

    // Test 3: Try to navigate to GitHub repository page with PAT
    console.log('\n🌐 Test 3: Attempting to access GitHub repository page...');
    
    // First, let's try to set up authentication cookies/headers
    await page.goto('https://github.com');
    
    // Try to inject authentication
    await page.evaluate((token) => {
      // Store PAT for potential use
      localStorage.setItem('github_pat', token);
      sessionStorage.setItem('github_pat', token);
    }, pat);

    // Navigate to the private repository
    console.log('🔗 Navigating to https://github.com/seal-codes/webapp...');
    
    try {
      await page.goto('https://github.com/seal-codes/webapp', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      const pageTitle = await page.title();
      const currentUrl = page.url();
      
      console.log('📍 Current URL:', currentUrl);
      console.log('📄 Page title:', pageTitle);
      
      // Check if we can see the repository content
      const isPrivateRepo = await page.locator('text=This repository is private').isVisible({ timeout: 5000 });
      const hasReadme = await page.locator('[data-testid="readme"]').isVisible({ timeout: 5000 });
      const needsLogin = currentUrl.includes('login') || pageTitle.includes('Sign in');
      
      console.log('🔍 Page analysis:');
      console.log('   - Shows private repository message:', isPrivateRepo);
      console.log('   - Has README visible:', hasReadme);
      console.log('   - Redirected to login:', needsLogin);
      
      if (needsLogin) {
        console.log('⚠️  Redirected to login page - PAT injection didn\'t work');
      } else if (isPrivateRepo) {
        console.log('⚠️  Can see repository but marked as private - partial access');
      } else if (hasReadme) {
        console.log('✅ Full repository access - can see README');
      } else {
        console.log('❓ Unknown state - analyzing page content...');
        const bodyText = await page.locator('body').textContent();
        console.log('📄 Page content preview:', bodyText?.substring(0, 200) + '...');
      }
      
    } catch (error) {
      console.log('❌ Failed to navigate to repository:', error.message);
    }

    // Test 4: Alternative approach - use PAT in request headers
    console.log('\n🔧 Test 4: Setting custom headers with PAT...');
    
    await page.setExtraHTTPHeaders({
      'Authorization': `Bearer ${pat}`
    });
    
    try {
      await page.goto('https://github.com/seal-codes/webapp', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      const hasReadmeWithHeaders = await page.locator('[data-testid="readme"]').isVisible({ timeout: 5000 });
      const currentUrlWithHeaders = page.url();
      
      console.log('🔧 With custom headers:');
      console.log('   - Current URL:', currentUrlWithHeaders);
      console.log('   - Has README visible:', hasReadmeWithHeaders);
      
      if (hasReadmeWithHeaders) {
        console.log('✅ Custom headers approach worked!');
      } else {
        console.log('❌ Custom headers approach didn\'t work');
      }
      
    } catch (error) {
      console.log('❌ Custom headers approach failed:', error.message);
    }

    // Summary
    console.log('\n📋 Test Summary:');
    console.log('   - API access:', apiResult.success ? '✅' : '❌');
    console.log('   - README access:', readmeResult.success ? '✅' : '❌');
    console.log('   - Direct navigation: Tested various approaches');
    
    // At least one method should work
    expect(apiResult.success || readmeResult.success).toBe(true);
  });

  test('should demonstrate working PAT authentication pattern', async ({ page }) => {
    const pat = process.env.GITHUB_TEST_PAT;
    
    if (!pat) {
      test.skip('GITHUB_TEST_PAT not found in environment');
    }

    console.log('🎯 Demonstrating the working PAT pattern...');

    // The most reliable approach: Use GitHub API directly
    const workingExample = await page.evaluate(async (token) => {
      const results = [];
      
      // 1. Get repository information
      try {
        const repoResponse = await fetch('https://api.github.com/repos/seal-codes/webapp', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'seal-codes-playwright-test'
          }
        });
        
        if (repoResponse.ok) {
          const repoData = await repoResponse.json();
          results.push({
            test: 'Repository Info',
            success: true,
            data: {
              name: repoData.name,
              private: repoData.private,
              description: repoData.description
            }
          });
        } else {
          results.push({
            test: 'Repository Info',
            success: false,
            error: `HTTP ${repoResponse.status}`
          });
        }
      } catch (error) {
        results.push({
          test: 'Repository Info',
          success: false,
          error: error.message
        });
      }

      // 2. Get README content
      try {
        const readmeResponse = await fetch('https://api.github.com/repos/seal-codes/webapp/contents/README.md', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'seal-codes-playwright-test'
          }
        });
        
        if (readmeResponse.ok) {
          const readmeData = await readmeResponse.json();
          const content = atob(readmeData.content);
          results.push({
            test: 'README Content',
            success: true,
            data: {
              size: readmeData.size,
              contentPreview: content.substring(0, 150) + '...'
            }
          });
        } else {
          results.push({
            test: 'README Content',
            success: false,
            error: `HTTP ${readmeResponse.status}`
          });
        }
      } catch (error) {
        results.push({
          test: 'README Content',
          success: false,
          error: error.message
        });
      }

      // 3. List repository contents
      try {
        const contentsResponse = await fetch('https://api.github.com/repos/seal-codes/webapp/contents', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'seal-codes-playwright-test'
          }
        });
        
        if (contentsResponse.ok) {
          const contentsData = await contentsResponse.json();
          results.push({
            test: 'Repository Contents',
            success: true,
            data: {
              fileCount: contentsData.length,
              files: contentsData.map(item => ({ name: item.name, type: item.type }))
            }
          });
        } else {
          results.push({
            test: 'Repository Contents',
            success: false,
            error: `HTTP ${contentsResponse.status}`
          });
        }
      } catch (error) {
        results.push({
          test: 'Repository Contents',
          success: false,
          error: error.message
        });
      }

      return results;
    }, pat);

    console.log('\n📊 Working Example Results:');
    workingExample.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.test}:`);
      if (result.success) {
        console.log('   ✅ Success');
        console.log('   📄 Data:', JSON.stringify(result.data, null, 2));
      } else {
        console.log('   ❌ Failed:', result.error);
      }
    });

    // Verify at least some tests passed
    const successCount = workingExample.filter(r => r.success).length;
    console.log(`\n📈 Success rate: ${successCount}/${workingExample.length}`);
    
    expect(successCount).toBeGreaterThan(0);
  });
});
