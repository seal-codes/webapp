/**
 * Diagnostic test to verify GitHub PAT functionality
 * This test helps identify the root cause of PAT access issues
 */

import { test, expect } from '@playwright/test'
import dotenv from 'dotenv'

// Load test environment variables
dotenv.config({ path: '.env.test.local' })

test.describe('GitHub PAT Diagnostic Tests', () => {
  
  test('should diagnose GitHub PAT issues step by step', async ({ page }) => {
    const pat = process.env.GITHUB_TEST_PAT
    
    if (!pat) {
      test.skip('GITHUB_TEST_PAT not found in environment')
    }

    console.log('🔍 Starting GitHub PAT diagnostic...')
    console.log('📝 PAT preview:', pat?.substring(0, 30) + '...')
    console.log('📏 PAT length:', pat?.length)

    const diagnosticResults = await page.evaluate(async (token) => {
      const results = []
      
      // Test 1: Verify PAT format
      results.push({
        test: 'PAT Format Check',
        success: token.startsWith('github_pat_') || token.startsWith('ghp_'),
        details: {
          startsWithPat: token.startsWith('github_pat_'),
          startsWithGhp: token.startsWith('ghp_'),
          length: token.length,
          preview: token.substring(0, 20) + '...',
        },
      })

      // Test 2: Check GitHub API connectivity
      try {
        const response = await fetch('https://api.github.com/rate_limit', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'seal-codes-diagnostic-test',
          },
        })
        
        const data = await response.json()
        results.push({
          test: 'GitHub API Connectivity',
          success: response.ok,
          details: {
            status: response.status,
            rateLimitRemaining: data.rate?.remaining,
            rateLimitLimit: data.rate?.limit,
            rateLimitReset: data.rate?.reset,
            message: data.message,
          },
        })
      } catch (error) {
        results.push({
          test: 'GitHub API Connectivity',
          success: false,
          details: { error: error.message },
        })
      }

      // Test 3: Check authenticated user info
      try {
        const response = await fetch('https://api.github.com/user', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'seal-codes-diagnostic-test',
          },
        })
        
        const data = await response.json()
        results.push({
          test: 'Authenticated User Info',
          success: response.ok,
          details: {
            status: response.status,
            username: data.login,
            userId: data.id,
            userType: data.type,
            message: data.message,
          },
        })
      } catch (error) {
        results.push({
          test: 'Authenticated User Info',
          success: false,
          details: { error: error.message },
        })
      }

      // Test 4: List user's repositories to see what we have access to
      try {
        const response = await fetch('https://api.github.com/user/repos?per_page=10&sort=updated', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'seal-codes-diagnostic-test',
          },
        })
        
        const data = await response.json()
        results.push({
          test: 'User Repositories',
          success: response.ok,
          details: {
            status: response.status,
            repoCount: Array.isArray(data) ? data.length : 0,
            repositories: Array.isArray(data) ? data.map(repo => ({
              name: repo.name,
              fullName: repo.full_name,
              private: repo.private,
              owner: repo.owner.login,
            })) : [],
            message: data.message,
          },
        })
      } catch (error) {
        results.push({
          test: 'User Repositories',
          success: false,
          details: { error: error.message },
        })
      }

      // Test 5: Check if seal-codes organization exists and is accessible
      try {
        const response = await fetch('https://api.github.com/orgs/seal-codes', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'seal-codes-diagnostic-test',
          },
        })
        
        const data = await response.json()
        results.push({
          test: 'seal-codes Organization',
          success: response.ok,
          details: {
            status: response.status,
            orgName: data.login,
            orgId: data.id,
            orgType: data.type,
            publicRepos: data.public_repos,
            message: data.message,
          },
        })
      } catch (error) {
        results.push({
          test: 'seal-codes Organization',
          success: false,
          details: { error: error.message },
        })
      }

      // Test 6: List seal-codes organization repositories
      try {
        const response = await fetch('https://api.github.com/orgs/seal-codes/repos', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'seal-codes-diagnostic-test',
          },
        })
        
        const data = await response.json()
        results.push({
          test: 'seal-codes Organization Repositories',
          success: response.ok,
          details: {
            status: response.status,
            repoCount: Array.isArray(data) ? data.length : 0,
            repositories: Array.isArray(data) ? data.map(repo => ({
              name: repo.name,
              fullName: repo.full_name,
              private: repo.private,
            })) : [],
            message: data.message,
          },
        })
      } catch (error) {
        results.push({
          test: 'seal-codes Organization Repositories',
          success: false,
          details: { error: error.message },
        })
      }

      // Test 7: Direct check for seal-codes/webapp repository
      try {
        const response = await fetch('https://api.github.com/repos/seal-codes/webapp', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'seal-codes-diagnostic-test',
          },
        })
        
        const data = await response.json()
        results.push({
          test: 'seal-codes/webapp Repository',
          success: response.ok,
          details: {
            status: response.status,
            repoName: data.name,
            fullName: data.full_name,
            private: data.private,
            owner: data.owner?.login,
            message: data.message,
            documentationUrl: data.documentation_url,
          },
        })
      } catch (error) {
        results.push({
          test: 'seal-codes/webapp Repository',
          success: false,
          details: { error: error.message },
        })
      }

      return results
    }, pat)

    // Display all diagnostic results
    console.log('\n🔍 DIAGNOSTIC RESULTS:')
    console.log('='.repeat(50))
    
    diagnosticResults.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.test}:`)
      console.log(`   Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`)
      console.log('   Details:', JSON.stringify(result.details, null, 4))
    })

    // Summary
    const successCount = diagnosticResults.filter(r => r.success).length
    const totalCount = diagnosticResults.length
    
    console.log('\n📊 DIAGNOSTIC SUMMARY:')
    console.log('='.repeat(50))
    console.log(`Success Rate: ${successCount}/${totalCount} (${Math.round(successCount/totalCount*100)}%)`)
    
    // Identify the specific issue
    const patFormatOk = diagnosticResults[0]?.success
    const apiConnectivityOk = diagnosticResults[1]?.success
    const userInfoOk = diagnosticResults[2]?.success
    const repoAccessOk = diagnosticResults[6]?.success // seal-codes/webapp check
    
    console.log('\n🎯 ISSUE ANALYSIS:')
    console.log('='.repeat(50))
    
    if (!patFormatOk) {
      console.log('❌ PAT FORMAT ISSUE: The token format appears invalid')
    } else if (!apiConnectivityOk) {
      console.log('❌ API CONNECTIVITY ISSUE: Cannot connect to GitHub API')
    } else if (!userInfoOk) {
      console.log('❌ AUTHENTICATION ISSUE: PAT is not valid or expired')
    } else if (!repoAccessOk) {
      console.log('❌ REPOSITORY ACCESS ISSUE: Cannot access seal-codes/webapp repository')
      console.log('   Possible causes:')
      console.log('   - Repository does not exist')
      console.log('   - PAT does not have access to this repository')
      console.log('   - Repository is in a different organization')
      console.log('   - PAT lacks required scopes (repo, read:org)')
    } else {
      console.log('✅ All checks passed - PAT should work correctly')
    }

    // Don't fail the test - this is diagnostic only
    console.log('\n✅ Diagnostic completed successfully')
  })
})
