# Testing Guide for seal.codes

This document explains the testing strategy and setup for seal.codes, including both mock-based unit tests and real integration tests with actual authentication.

## Testing Strategy

We use a dual testing approach:

1. **Mock-based tests** - Fast, isolated tests using mocked authentication
2. **Integration tests** - Slower, comprehensive tests using real GitHub OAuth

## Test Types

### Mock-based Tests (Default)
- Fast execution
- No external dependencies
- Good for development and CI/CD
- Located in: `*.spec.ts` files
- Run with: `npm run test:e2e`

### Integration Tests
- Real authentication with GitHub
- End-to-end testing of OAuth flow
- Requires actual credentials
- Located in: `*.integration.spec.ts` files
- Run with: `npm run test:e2e -- --project=chromium-integration`

## Setting Up Integration Tests

### Prerequisites
1. GitHub account
2. GitHub Personal Access Token (PAT)
3. Supabase project credentials

### Setup Steps

1. **Run the setup script:**
   ```bash
   ./scripts/setup-test-auth.sh
   ```

2. **Create GitHub Personal Access Token:**
   - Go to [GitHub Settings > Tokens](https://github.com/settings/tokens)
   - Click "Generate new token (classic)"
   - Select scopes: `read:user`, `user:email`
   - Copy the token

3. **Configure test credentials:**
   Edit `.env.test.local` (created by setup script):
   ```env
   GITHUB_TEST_PAT=ghp_your_token_here
   TEST_GITHUB_USERNAME=your_github_username
   TEST_GITHUB_EMAIL=your_email@example.com
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Optional - GitHub OAuth App (for full OAuth flow):**
   - Go to [GitHub Settings > Developer settings > OAuth Apps](https://github.com/settings/applications/new)
   - Create new OAuth App:
     - Application name: `seal.codes Test App`
     - Homepage URL: `http://localhost:5173`
     - Authorization callback URL: `http://localhost:5173/auth/callback`
   - Add Client ID and Secret to `.env.test.local`

## Running Tests

### Development (Mock-based)
```bash
# Run all mock-based tests
npm run test:e2e

# Run specific test file
npm run test:e2e authentication.spec.ts

# Run with specific browser
npm run test:e2e -- --project=chromium-mock
```

### Integration Testing (Real Auth)
```bash
# Run all integration tests
npm run test:e2e -- --project=chromium-integration

# Run specific integration test
npm run test:e2e authentication.integration.spec.ts

# Run with headed browser (see what's happening)
npm run test:e2e -- --project=chromium-integration --headed
```

### Debug Mode
```bash
# Run tests in debug mode
npm run test:e2e -- --debug

# Generate test report
npm run test:e2e -- --reporter=html
```

## Test Configuration

### Playwright Projects
- `chromium-mock` - Fast tests with mocked auth
- `chromium-integration` - Integration tests with real auth
- `firefox` - Cross-browser testing (mock auth)
- `webkit` - Safari testing (mock auth)

### Authentication Setup Files
- `e2e/setup/auth.setup.ts` - Mock authentication setup
- `e2e/setup/real-auth.setup.ts` - Real authentication setup

## Writing Tests

### Mock-based Test Example
```typescript
import { test, expect } from '@playwright/test';
import { DocumentPage } from './pages/document-page';

test.describe('Authentication', () => {
  test.use({ storageState: 'playwright/.auth/google-user.json' });
  
  test('should authenticate with mocked Google', async ({ page }) => {
    const documentPage = new DocumentPage(page);
    await documentPage.goto();
    // ... test logic
  });
});
```

### Integration Test Example
```typescript
import { test, expect } from '@playwright/test';
import { DocumentPage } from './pages/document-page';

test.describe('Real Authentication Integration', () => {
  test.use({ storageState: 'playwright/.auth/github-api-user.json' });
  
  test('should authenticate with real GitHub', async ({ page }) => {
    const documentPage = new DocumentPage(page);
    await documentPage.goto();
    // ... test logic with real auth
  });
});
```

## Security Considerations

### Credential Management
- Never commit `.env.test.local` to version control
- Use minimal required permissions for PAT
- Consider using a dedicated test GitHub account
- Rotate tokens regularly

### CI/CD Integration
- Use GitHub Secrets for CI credentials
- Separate test environments from production
- Consider using GitHub Actions with OIDC for secure authentication

## Troubleshooting

### Common Issues

1. **"Missing test environment variables"**
   - Ensure `.env.test.local` exists and has required values
   - Run `./scripts/setup-test-auth.sh` to create template

2. **Authentication timeout**
   - Check if GitHub is accessible
   - Verify PAT has correct permissions
   - Ensure Supabase credentials are correct

3. **Tests fail in CI**
   - Add credentials to CI environment variables
   - Consider using mock tests for CI, integration tests locally

4. **OAuth redirect issues**
   - Verify callback URL in GitHub OAuth App settings
   - Check that dev server is running on correct port

### Debug Tips
- Use `--headed` flag to see browser interactions
- Check browser console for authentication errors
- Verify network requests in browser dev tools
- Use `page.pause()` to inspect test state

## Best Practices

1. **Test Isolation**
   - Each test should be independent
   - Clean up authentication state between tests
   - Use fresh browser contexts

2. **Performance**
   - Use mock tests for fast feedback
   - Reserve integration tests for critical paths
   - Run integration tests less frequently

3. **Reliability**
   - Handle network timeouts gracefully
   - Retry flaky tests appropriately
   - Use explicit waits instead of fixed delays

4. **Maintenance**
   - Keep test credentials up to date
   - Review and update tests when auth flow changes
   - Monitor test execution times
