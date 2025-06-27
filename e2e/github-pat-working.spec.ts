/**
 * Working GitHub PAT access test using the correct repository
 * Based on diagnostic results: mrsimpson/seal.codes.webapp
 */

import { test, expect } from '@playwright/test'
import dotenv from 'dotenv'

// Load test environment variables
dotenv.config({ path: '.env.test.local' })

test.describe('GitHub PAT Working Access Tests', () => {
  
  test('should successfully access private repository with correct name', async ({ page }) => {
    const pat = process.env.GITHUB_TEST_PAT
    
    if (!pat) {
      test.skip('GITHUB_TEST_PAT not found in environment')
    }

    console.log('🎯 Testing access to the correct repository: mrsimpson/seal.codes.webapp')

    const results = await page.evaluate(async (token) => {
      const testResults = []
      
      // Test 1: Access the correct repository
      try {
        const response = await fetch('https://api.github.com/repos/mrsimpson/seal.codes.webapp', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'seal-codes-working-test',
          },
        })
        
        const data = await response.json()
        testResults.push({
          test: 'Repository Access',
          success: response.ok,
          data: response.ok ? {
            name: data.name,
            fullName: data.full_name,
            private: data.private,
            description: data.description,
            owner: data.owner.login,
          } : { error: data.message, status: response.status },
        })
      } catch (error) {
        testResults.push({
          test: 'Repository Access',
          success: false,
          data: { error: error.message },
        })
      }

      // Test 2: Get README content
      try {
        const response = await fetch('https://api.github.com/repos/mrsimpson/seal.codes.webapp/contents/README.md', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'seal-codes-working-test',
          },
        })
        
        const data = await response.json()
        if (response.ok) {
          const content = atob(data.content)
          testResults.push({
            test: 'README Content',
            success: true,
            data: {
              size: data.size,
              encoding: data.encoding,
              contentLength: content.length,
              contentPreview: content.substring(0, 200) + '...',
              sha: data.sha,
            },
          })
        } else {
          testResults.push({
            test: 'README Content',
            success: false,
            data: { error: data.message, status: response.status },
          })
        }
      } catch (error) {
        testResults.push({
          test: 'README Content',
          success: false,
          data: { error: error.message },
        })
      }

      // Test 3: List repository contents
      try {
        const response = await fetch('https://api.github.com/repos/mrsimpson/seal.codes.webapp/contents', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'seal-codes-working-test',
          },
        })
        
        const data = await response.json()
        if (response.ok) {
          testResults.push({
            test: 'Repository Contents',
            success: true,
            data: {
              itemCount: data.length,
              items: data.map(item => ({
                name: item.name,
                type: item.type,
                size: item.size,
              })),
            },
          })
        } else {
          testResults.push({
            test: 'Repository Contents',
            success: false,
            data: { error: data.message, status: response.status },
          })
        }
      } catch (error) {
        testResults.push({
          test: 'Repository Contents',
          success: false,
          data: { error: error.message },
        })
      }

      // Test 4: Get specific file content (if it exists)
      try {
        const response = await fetch('https://api.github.com/repos/mrsimpson/seal.codes.webapp/contents/package.json', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'seal-codes-working-test',
          },
        })
        
        const data = await response.json()
        if (response.ok) {
          const content = atob(data.content)
          let parsedContent = null
          try {
            parsedContent = JSON.parse(content)
          } catch (e) {
            // Not JSON, that's fine
          }
          
          testResults.push({
            test: 'Package.json Content',
            success: true,
            data: {
              size: data.size,
              contentLength: content.length,
              projectName: parsedContent?.name,
              projectVersion: parsedContent?.version,
              hasScripts: !!parsedContent?.scripts,
            },
          })
        } else {
          testResults.push({
            test: 'Package.json Content',
            success: false,
            data: { error: data.message, status: response.status },
          })
        }
      } catch (error) {
        testResults.push({
          test: 'Package.json Content',
          success: false,
          data: { error: error.message },
        })
      }

      return testResults
    }, pat)

    // Display results
    console.log('\n📊 TEST RESULTS:')
    console.log('='.repeat(50))
    
    results.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.test}:`)
      console.log(`   Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`)
      console.log('   Data:', JSON.stringify(result.data, null, 4))
    })

    const successCount = results.filter(r => r.success).length
    console.log(`\n📈 Success Rate: ${successCount}/${results.length}`)

    // Verify we can access the repository
    expect(results[0].success).toBe(true)
    expect(results[0].data.name).toBe('seal.codes.webapp')
    expect(results[0].data.private).toBe(true)

    // At least repository access should work
    expect(successCount).toBeGreaterThan(0)
  })

  test('should demonstrate browser-based GitHub repository access patterns', async ({ page }) => {
    const pat = process.env.GITHUB_TEST_PAT
    
    if (!pat) {
      test.skip('GITHUB_TEST_PAT not found in environment')
    }

    console.log('🌐 Testing browser-based access patterns...')

    // Test 1: Try to access the GitHub repository page directly
    console.log('\n1. Direct GitHub page access...')
    
    await page.goto('https://github.com/mrsimpson/seal.codes.webapp')
    
    const pageTitle = await page.title()
    const currentUrl = page.url()
    
    console.log('📍 Current URL:', currentUrl)
    console.log('📄 Page title:', pageTitle)
    
    // Check what we can see
    const isLoginPage = currentUrl.includes('login') || pageTitle.includes('Sign in')
    const isNotFound = pageTitle.includes('Page not found') || pageTitle.includes('404')
    const hasReadme = await page.locator('[data-testid="readme"]').isVisible({ timeout: 5000 })
    const isPrivateMessage = await page.locator('text=This repository is private').isVisible({ timeout: 2000 })
    
    console.log('🔍 Page Analysis:')
    console.log('   - Redirected to login:', isLoginPage)
    console.log('   - Shows 404/Not Found:', isNotFound)
    console.log('   - Has README visible:', hasReadme)
    console.log('   - Shows private repository message:', isPrivateMessage)

    // Test 2: Try with authentication headers
    console.log('\n2. Testing with custom headers...')
    
    await page.setExtraHTTPHeaders({
      'Authorization': `Bearer ${pat}`,
    })
    
    await page.goto('https://github.com/mrsimpson/seal.codes.webapp', { 
      waitUntil: 'networkidle', 
    })
    
    const hasReadmeWithHeaders = await page.locator('[data-testid="readme"]').isVisible({ timeout: 5000 })
    console.log('   - README visible with headers:', hasReadmeWithHeaders)

    // Test 3: Demonstrate the working API approach in browser context
    console.log('\n3. API-based approach (recommended)...')
    
    const apiDemo = await page.evaluate(async (token) => {
      // This is the pattern that works reliably
      try {
        const response = await fetch('https://api.github.com/repos/mrsimpson/seal.codes.webapp/contents/README.md', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'seal-codes-browser-demo',
          },
        })
        
        if (response.ok) {
          const data = await response.json()
          const content = atob(data.content)
          
          return {
            success: true,
            method: 'GitHub API',
            contentLength: content.length,
            firstLine: content.split('\n')[0],
            canAccessPrivateRepo: true,
          }
        } else {
          return {
            success: false,
            method: 'GitHub API',
            error: `HTTP ${response.status}`,
            canAccessPrivateRepo: false,
          }
        }
      } catch (error) {
        return {
          success: false,
          method: 'GitHub API',
          error: error.message,
          canAccessPrivateRepo: false,
        }
      }
    }, pat)

    console.log('   API Demo Result:', apiDemo)

    // Summary and recommendations
    console.log('\n📋 SUMMARY & RECOMMENDATIONS:')
    console.log('='.repeat(50))
    console.log('✅ WORKING APPROACH: Use GitHub API with PAT in Authorization header')
    console.log('❌ NOT WORKING: Direct browser navigation to private GitHub repositories')
    console.log('❌ NOT WORKING: Custom headers for GitHub.com pages')
    console.log('')
    console.log('💡 RECOMMENDED PATTERN FOR PLAYWRIGHT TESTS:')
    console.log('   1. Use page.evaluate() to make fetch() calls with PAT')
    console.log('   2. Access GitHub API endpoints instead of web pages')
    console.log('   3. Parse API responses to get repository content')
    console.log('   4. Use this data to verify repository access in tests')

    // The test should pass if we can access via API
    expect(apiDemo.success).toBe(true)
  })
})
