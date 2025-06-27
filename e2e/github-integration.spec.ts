/**
 * GitHub Integration Tests
 * 
 * Tests that verify GitHub PAT integration works correctly in the e2e environment
 */
import { test, expect } from '@playwright/test';
import { createGitHubHelper, waitForRepositoryAccess } from './utils/github-api';

test.describe('GitHub Integration', () => {
  
  test('should verify GitHub PAT setup is working', async ({ page }) => {
    const githubHelper = createGitHubHelper();
    
    console.log('🔍 Testing GitHub PAT integration...');
    
    // Test 1: Basic authentication
    const userInfo = await githubHelper.getUserInfo(page);
    expect(userInfo.success).toBe(true);
    expect(userInfo.data.login).toBe('mrsimpson');
    
    console.log(`✅ User authentication: ${userInfo.data.login} (ID: ${userInfo.data.id})`);
    
    // Test 2: Repository access
    const repos = await githubHelper.getUserRepositories(page, { per_page: 3 });
    expect(repos.success).toBe(true);
    expect(repos.data.length).toBeGreaterThan(0);
    
    console.log(`✅ Repository access: ${repos.data.length} repositories found`);
    repos.data.forEach(repo => {
      console.log(`   - ${repo.full_name} (${repo.private ? 'private' : 'public'})`);
    });
    
    // Test 3: Organization access
    const orgInfo = await githubHelper.getOrganization(page, 'seal-codes');
    expect(orgInfo.success).toBe(true);
    
    console.log(`✅ Organization access: ${orgInfo.data.login} (${orgInfo.data.public_repos} public repos)`);
    
    // Test 4: Content access (using first available repository)
    if (repos.data.length > 0) {
      const testRepo = repos.data[0];
      const contents = await githubHelper.getRepositoryContents(page, testRepo.owner.login, testRepo.name);
      
      if (contents.success) {
        console.log(`✅ Content access: ${testRepo.full_name} has ${contents.data.length} items`);
        
        // Try to read a file if available
        const readmeResult = await githubHelper.getReadmeContent(page, testRepo.owner.login, testRepo.name);
        if (readmeResult.exists) {
          console.log(`✅ File reading: README.md (${readmeResult.content?.length} chars)`);
          expect(readmeResult.content).toBeDefined();
        } else {
          console.log(`ℹ️  No README.md in ${testRepo.full_name}`);
        }
      } else {
        console.log(`⚠️  Content access failed for ${testRepo.full_name}: ${contents.error}`);
      }
    }
    
    console.log('🎉 GitHub PAT integration test completed successfully!');
  });
  
  test('should demonstrate repository creation workflow', async ({ page }) => {
    const githubHelper = createGitHubHelper();
    
    console.log('📚 Testing repository workflow for seal-codes/webapp...');
    
    // Check if seal-codes/webapp exists
    const webappExists = await githubHelper.repositoryExists(page, 'seal-codes', 'webapp');
    
    if (webappExists) {
      console.log('✅ seal-codes/webapp repository exists and is accessible');
      
      // Get repository info
      const repoInfo = await githubHelper.getRepository(page, 'seal-codes', 'webapp');
      expect(repoInfo.success).toBe(true);
      
      console.log(`📋 Repository info:`);
      console.log(`   Name: ${repoInfo.data.name}`);
      console.log(`   Private: ${repoInfo.data.private}`);
      console.log(`   Description: ${repoInfo.data.description || 'No description'}`);
      
      // Try to get README
      const readmeResult = await githubHelper.getReadmeContent(page, 'seal-codes', 'webapp');
      if (readmeResult.exists) {
        console.log(`✅ README.md accessible (${readmeResult.content?.length} characters)`);
        expect(readmeResult.content).toContain('seal.codes');
      }
      
    } else {
      console.log('ℹ️  seal-codes/webapp repository does not exist yet');
      console.log('   This is expected if the repository hasn\'t been created');
      console.log('   Once created, this test will verify full access');
      
      // Verify we can at least access the organization
      const orgAccess = await githubHelper.getOrganization(page, 'seal-codes');
      expect(orgAccess.success).toBe(true);
      console.log(`✅ seal-codes organization is accessible`);
      
      // List organization repositories
      const orgRepos = await githubHelper.getOrganizationRepositories(page, 'seal-codes');
      expect(orgRepos.success).toBe(true);
      console.log(`📚 seal-codes has ${orgRepos.data.length} repositories`);
    }
  });
  
  test('should provide working examples for application integration', async ({ page }) => {
    console.log('💡 Demonstrating GitHub API patterns for application use...');
    
    // This test shows how to integrate GitHub API calls into your application
    const examples = await page.evaluate(async (pat) => {
      const results = [];
      
      // Example 1: Check if user has access to a repository
      const checkRepoAccess = async (owner, repo) => {
        try {
          const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
            headers: {
              'Authorization': `Bearer ${pat}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'seal-codes-app'
            }
          });
          
          return {
            accessible: response.ok,
            status: response.status,
            data: response.ok ? await response.json() : null
          };
        } catch (error) {
          return { accessible: false, error: error.message };
        }
      };
      
      // Example 2: Get user's GitHub profile for display
      const getUserProfile = async () => {
        try {
          const response = await fetch('https://api.github.com/user', {
            headers: {
              'Authorization': `Bearer ${pat}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'seal-codes-app'
            }
          });
          
          const data = await response.json();
          return {
            success: response.ok,
            profile: response.ok ? {
              username: data.login,
              name: data.name,
              avatar: data.avatar_url,
              email: data.email
            } : null
          };
        } catch (error) {
          return { success: false, error: error.message };
        }
      };
      
      // Run examples
      results.push({
        example: 'Repository Access Check',
        result: await checkRepoAccess('seal-codes', 'webapp')
      });
      
      results.push({
        example: 'User Profile',
        result: await getUserProfile()
      });
      
      return results;
    }, process.env.GITHUB_TEST_PAT);
    
    console.log('\n🛠️  Application Integration Examples:');
    examples.forEach((example, index) => {
      console.log(`\n${index + 1}. ${example.example}:`);
      console.log(JSON.stringify(example.result, null, 2));
    });
    
    // Verify at least the user profile works
    const userProfileExample = examples.find(e => e.example === 'User Profile');
    expect(userProfileExample.result.success).toBe(true);
    expect(userProfileExample.result.profile.username).toBe('mrsimpson');
    
    console.log('\n✅ Application integration examples completed successfully!');
  });
});
