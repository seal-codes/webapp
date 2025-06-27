# GitHub PAT in Browser Environment - Analysis & Solutions

## Summary

We successfully analyzed how to use GitHub Personal Access Tokens (PAT) in a browser environment with Playwright tests. This document summarizes our findings, working patterns, and limitations.

## Key Findings

### ✅ What Works

1. **Repository Metadata Access**: PAT can access basic repository information
2. **User Authentication**: PAT can authenticate and get user information
3. **API-based Requests**: Using `fetch()` with Authorization header works in browser context
4. **Repository Existence Verification**: Can verify if private repositories exist

### ❌ What Doesn't Work

1. **Repository Contents Access**: Fine-grained PAT cannot read file contents
2. **Direct Browser Navigation**: Cannot access private GitHub repository pages directly
3. **Custom Headers for GitHub.com**: Setting Authorization headers doesn't work for GitHub web pages
4. **Organization Access**: Current PAT has lifetime restrictions for organization access

## Root Cause Analysis

The main issues identified:

1. **Fine-grained PAT Limitations**: The current PAT lacks "Contents" permission scope
2. **Organization Policy**: seal-codes organization forbids PATs with lifetime > 366 days
3. **Repository Location**: Repository is at `mrsimpson/seal.codes.webapp`, not `seal-codes/webapp`
4. **Browser Security**: GitHub.com doesn't accept Authorization headers for web page access

## Working Pattern

Here's the minimal working pattern for accessing GitHub repositories with PAT in Playwright:

```typescript
// ✅ This works - API access with PAT
const result = await page.evaluate(async (token) => {
  const response = await fetch('https://api.github.com/repos/mrsimpson/seal.codes.webapp', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'your-app-name'
    }
  });
  
  return response.ok ? await response.json() : null;
}, pat);
```

## Solutions & Recommendations

### Immediate Solutions

1. **Use Classic PAT**: Replace fine-grained PAT with classic PAT for broader permissions
2. **Adjust PAT Scopes**: Ensure PAT has `repo` scope for private repository access
3. **Reduce PAT Lifetime**: Set lifetime < 366 days for organization access
4. **Use Correct Repository Path**: `mrsimpson/seal.codes.webapp` not `seal-codes/webapp`

### Long-term Solutions

1. **OAuth App Flow**: Implement proper OAuth flow for full GitHub access
2. **GitHub App**: Consider using GitHub App instead of PAT for organization-level access
3. **Repository Migration**: Move repository to organization with proper PAT policies

### For Playwright Tests

```typescript
// Recommended pattern for Playwright tests
test('should access GitHub repository via API', async ({ page }) => {
  const pat = process.env.GITHUB_TEST_PAT;
  
  const repoData = await page.evaluate(async (token) => {
    const response = await fetch('https://api.github.com/repos/owner/repo', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'playwright-test'
      }
    });
    
    return response.ok ? await response.json() : { error: response.status };
  }, pat);
  
  expect(repoData.name).toBe('expected-repo-name');
  expect(repoData.private).toBe(true);
});
```

## Test Files Created

1. **`github-pat-diagnostic.spec.ts`**: Comprehensive diagnostic test
2. **`github-pat-working.spec.ts`**: Working examples with correct repository
3. **`github-pat-minimal.spec.ts`**: Minimal working pattern demonstration

## Next Steps

1. **Update PAT Configuration**: 
   - Create classic PAT with `repo` scope
   - Set lifetime < 366 days
   - Update `.env.test.local`

2. **Implement OAuth Flow**: For full GitHub web access in tests

3. **Repository Access**: Verify repository permissions and location

## Conclusion

The GitHub PAT works for API access but has limitations for content access due to fine-grained permissions. The working pattern is to use the GitHub API via `fetch()` calls within `page.evaluate()` in Playwright tests, rather than trying to navigate to GitHub web pages directly.
