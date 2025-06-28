/**
 * Test classic GitHub PAT with existing accessible repositories
 * This demonstrates the full capabilities of the classic PAT
 */

import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test.local' });

test.describe('Classic GitHub PAT Full Test', () => {
  
  test('should demonstrate full classic PAT capabilities', async ({ page }) => {
    const pat = process.env.GITHUB_TEST_PAT;
    
    if (!pat) {
      test.skip('GITHUB_TEST_PAT not found in environment');
    }

    console.log('🎯 Testing Classic PAT Full Capabilities');
    console.log('📝 PAT preview:', pat?.substring(0, 20) + '...');
    console.log('📏 PAT length:', pat?.length);
    console.log('🔧 PAT type:', pat?.startsWith('ghp_') ? 'Classic' : 'Fine-grained');

    const results = await page.evaluate(async (token) => {
      const testResults = [];
      
      // Test 1: Get user repositories to find an accessible one
      try {
        const reposResponse = await fetch('https://api.github.com/user/repos?per_page=5&sort=updated', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'seal-codes-classic-pat-test'
          }
        });
        
        const repos = await reposResponse.json();
        testResults.push({
          test: 'User Repositories',
          success: reposResponse.ok,
          data: reposResponse.ok ? {
            count: repos.length,
            repositories: repos.map(repo => ({
              name: repo.name,
              fullName: repo.full_name,
              private: repo.private,
              hasReadme: !!repo.has_readme
            }))
          } : { error: repos.message, status: reposResponse.status }
        });
        
        // Test 2: Try to access contents of the first accessible repository
        if (reposResponse.ok && repos.length > 0) {
          const testRepo = repos[0];
          
          try {
            const contentsResponse = await fetch(`https://api.github.com/repos/${testRepo.full_name}/contents`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'seal-codes-classic-pat-test'
              }
            });
            
            const contents = await contentsResponse.json();
            testResults.push({
              test: 'Repository Contents Access',
              success: contentsResponse.ok,
              data: contentsResponse.ok ? {
                repository: testRepo.full_name,
                itemCount: contents.length,
                items: contents.slice(0, 5).map(item => ({
                  name: item.name,
                  type: item.type,
                  size: item.size
                }))
              } : { 
                repository: testRepo.full_name,
                error: contents.message, 
                status: contentsResponse.status 
              }
            });
            
            // Test 3: Try to read a specific file (README.md if it exists)
            const readmeFile = contents.find(item => item.name.toLowerCase() === 'readme.md');
            if (contentsResponse.ok && readmeFile) {
              try {
                const readmeResponse = await fetch(`https://api.github.com/repos/${testRepo.full_name}/contents/README.md`, {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'seal-codes-classic-pat-test'
                  }
                });
                
                const readmeData = await readmeResponse.json();
                if (readmeResponse.ok) {
                  const content = atob(readmeData.content);
                  testResults.push({
                    test: 'File Content Access (README.md)',
                    success: true,
                    data: {
                      repository: testRepo.full_name,
                      fileName: 'README.md',
                      size: readmeData.size,
                      encoding: readmeData.encoding,
                      contentLength: content.length,
                      contentPreview: content.substring(0, 150) + '...',
                      sha: readmeData.sha
                    }
                  });
                } else {
                  testResults.push({
                    test: 'File Content Access (README.md)',
                    success: false,
                    data: {
                      repository: testRepo.full_name,
                      error: readmeData.message,
                      status: readmeResponse.status
                    }
                  });
                }
              } catch (error) {
                testResults.push({
                  test: 'File Content Access (README.md)',
                  success: false,
                  data: { error: error.message }
                });
              }
            }
          } catch (error) {
            testResults.push({
              test: 'Repository Contents Access',
              success: false,
              data: { error: error.message }
            });
          }
        }
      } catch (error) {
        testResults.push({
          test: 'User Repositories',
          success: false,
          data: { error: error.message }
        });
      }

      // Test 4: Organization access (seal-codes)
      try {
        const orgResponse = await fetch('https://api.github.com/orgs/seal-codes', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'seal-codes-classic-pat-test'
          }
        });
        
        const orgData = await orgResponse.json();
        testResults.push({
          test: 'Organization Access (seal-codes)',
          success: orgResponse.ok,
          data: orgResponse.ok ? {
            name: orgData.login,
            id: orgData.id,
            publicRepos: orgData.public_repos,
            totalPrivateRepos: orgData.total_private_repos,
            ownedPrivateRepos: orgData.owned_private_repos
          } : { error: orgData.message, status: orgResponse.status }
        });
        
        // Test 5: Organization repositories
        if (orgResponse.ok) {
          try {
            const orgReposResponse = await fetch('https://api.github.com/orgs/seal-codes/repos', {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'seal-codes-classic-pat-test'
              }
            });
            
            const orgRepos = await orgReposResponse.json();
            testResults.push({
              test: 'Organization Repositories',
              success: orgReposResponse.ok,
              data: orgReposResponse.ok ? {
                organization: 'seal-codes',
                repoCount: orgRepos.length,
                repositories: orgRepos.map(repo => ({
                  name: repo.name,
                  fullName: repo.full_name,
                  private: repo.private
                }))
              } : { error: orgRepos.message, status: orgReposResponse.status }
            });
          } catch (error) {
            testResults.push({
              test: 'Organization Repositories',
              success: false,
              data: { error: error.message }
            });
          }
        }
      } catch (error) {
        testResults.push({
          test: 'Organization Access (seal-codes)',
          success: false,
          data: { error: error.message }
        });
      }

      return testResults;
    }, pat);

    // Display comprehensive results
    console.log('\n📊 CLASSIC PAT TEST RESULTS:');
    console.log('='.repeat(60));
    
    results.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.test}:`);
      console.log(`   Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
      console.log(`   Details:`, JSON.stringify(result.data, null, 4));
    });

    const successCount = results.filter(r => r.success).length;
    console.log(`\n📈 Overall Success Rate: ${successCount}/${results.length} (${Math.round(successCount/results.length*100)}%)`);

    // Analysis
    console.log('\n🔍 CAPABILITY ANALYSIS:');
    console.log('='.repeat(60));
    
    const repoAccess = results.find(r => r.test === 'User Repositories');
    const contentsAccess = results.find(r => r.test === 'Repository Contents Access');
    const fileAccess = results.find(r => r.test.includes('File Content Access'));
    const orgAccess = results.find(r => r.test === 'Organization Access (seal-codes)');
    
    console.log(`Repository Listing: ${repoAccess?.success ? '✅' : '❌'}`);
    console.log(`Contents Access: ${contentsAccess?.success ? '✅' : '❌'}`);
    console.log(`File Reading: ${fileAccess?.success ? '✅' : '❌'}`);
    console.log(`Organization Access: ${orgAccess?.success ? '✅' : '❌'}`);

    if (contentsAccess?.success) {
      console.log('\n🎉 EXCELLENT! Classic PAT can access repository contents!');
      console.log('This resolves the "Resource not accessible by personal access token" issue.');
    }

    if (fileAccess?.success) {
      console.log('\n📄 FILE ACCESS CONFIRMED! Can read individual file contents.');
      console.log('This means you can now access README.md and other files in private repos.');
    }

    // Verify basic functionality works
    expect(repoAccess?.success).toBe(true);
    expect(successCount).toBeGreaterThan(0);
    
    console.log('\n✅ Classic PAT test completed successfully!');
  });

  test('should create a working example for accessing any GitHub repository', async ({ page }) => {
    const pat = process.env.GITHUB_TEST_PAT;
    
    if (!pat) {
      test.skip('GITHUB_TEST_PAT not found in environment');
    }

    console.log('📚 Creating reusable GitHub repository access pattern...');

    // This is the pattern you can use in your actual tests
    const githubApiHelper = await page.evaluate(async (token) => {
      // Helper function to make GitHub API calls
      const callGitHubAPI = async (endpoint, options = {}) => {
        const response = await fetch(`https://api.github.com${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'seal-codes-playwright-test',
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

      // Example usage patterns
      const examples = [];

      // 1. List user repositories
      const userRepos = await callGitHubAPI('/user/repos?per_page=3');
      examples.push({
        pattern: 'List User Repositories',
        endpoint: '/user/repos',
        success: userRepos.success,
        example: userRepos.success ? userRepos.data.map(r => r.full_name) : userRepos.error
      });

      // 2. Get repository info (using first repo as example)
      if (userRepos.success && userRepos.data.length > 0) {
        const repoName = userRepos.data[0].full_name;
        const repoInfo = await callGitHubAPI(`/repos/${repoName}`);
        examples.push({
          pattern: 'Get Repository Info',
          endpoint: `/repos/${repoName}`,
          success: repoInfo.success,
          example: repoInfo.success ? {
            name: repoInfo.data.name,
            private: repoInfo.data.private,
            description: repoInfo.data.description
          } : repoInfo.error
        });

        // 3. List repository contents
        const contents = await callGitHubAPI(`/repos/${repoName}/contents`);
        examples.push({
          pattern: 'List Repository Contents',
          endpoint: `/repos/${repoName}/contents`,
          success: contents.success,
          example: contents.success ? contents.data.map(item => ({
            name: item.name,
            type: item.type
          })) : contents.error
        });
      }

      // 4. Organization access
      const orgInfo = await callGitHubAPI('/orgs/seal-codes');
      examples.push({
        pattern: 'Get Organization Info',
        endpoint: '/orgs/seal-codes',
        success: orgInfo.success,
        example: orgInfo.success ? {
          name: orgInfo.data.login,
          publicRepos: orgInfo.data.public_repos
        } : orgInfo.error
      });

      return { examples, helper: callGitHubAPI.toString() };
    }, pat);

    console.log('\n🛠️  REUSABLE PATTERNS:');
    console.log('='.repeat(50));
    
    githubApiHelper.examples.forEach((example, index) => {
      console.log(`\n${index + 1}. ${example.pattern}:`);
      console.log(`   Endpoint: ${example.endpoint}`);
      console.log(`   Status: ${example.success ? '✅ Works' : '❌ Failed'}`);
      console.log(`   Result:`, JSON.stringify(example.example, null, 2));
    });

    console.log('\n💡 USAGE IN YOUR TESTS:');
    console.log('='.repeat(50));
    console.log(`
// Copy this pattern into your Playwright tests:
const result = await page.evaluate(async (token) => {
  const response = await fetch('https://api.github.com/repos/OWNER/REPO', {
    headers: {
      'Authorization': \`Bearer \${token}\`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'your-test-name'
    }
  });
  
  return response.ok ? await response.json() : null;
}, process.env.GITHUB_TEST_PAT);

// Then use the result in your assertions:
expect(result.name).toBe('expected-repo-name');
expect(result.private).toBe(true);
    `);

    // Verify at least some patterns work
    const workingPatterns = githubApiHelper.examples.filter(e => e.success).length;
    expect(workingPatterns).toBeGreaterThan(0);
    
    console.log(`\n✅ ${workingPatterns}/${githubApiHelper.examples.length} patterns working with classic PAT!`);
  });
});
