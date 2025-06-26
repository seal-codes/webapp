#!/bin/bash

# Setup script for real authentication testing
# This script helps you configure the necessary credentials for integration tests

echo "🔐 Setting up real authentication for integration tests"
echo "=================================================="

# Check if .env.test.local exists
if [ -f ".env.test.local" ]; then
    echo "✅ .env.test.local already exists"
    echo "📝 Please review and update the values as needed"
else
    echo "📝 Creating .env.test.local from template..."
    cp .env.test .env.test.local
    echo "✅ Created .env.test.local"
fi

echo ""
echo "🔧 Required setup steps:"
echo ""

echo "1. GitHub Personal Access Token (PAT):"
echo "   - Go to: https://github.com/settings/tokens"
echo "   - Click 'Generate new token (classic)'"
echo "   - Select scopes: read:user, user:email"
echo "   - Copy the token and add it to GITHUB_TEST_PAT in .env.test.local"
echo ""

echo "2. Your GitHub credentials:"
echo "   - Add your GitHub username to TEST_GITHUB_USERNAME"
echo "   - Add your GitHub email to TEST_GITHUB_EMAIL"
echo ""

echo "3. Supabase credentials (same as your main app):"
echo "   - Copy VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from your .env file"
echo ""

echo "4. Optional - GitHub OAuth App (for full OAuth flow testing):"
echo "   - Go to: https://github.com/settings/applications/new"
echo "   - Application name: seal.codes Test App"
echo "   - Homepage URL: http://localhost:5173"
echo "   - Authorization callback URL: http://localhost:5173/auth/callback"
echo "   - Copy Client ID and Client Secret to .env.test.local"
echo ""

echo "📋 Example .env.test.local content:"
echo "GITHUB_TEST_PAT=ghp_your_token_here"
echo "TEST_GITHUB_USERNAME=your_username"
echo "TEST_GITHUB_EMAIL=your_email@example.com"
echo "VITE_SUPABASE_URL=your_supabase_url"
echo "VITE_SUPABASE_ANON_KEY=your_supabase_anon_key"
echo ""

echo "🚀 After setup, run integration tests with:"
echo "npm run test:e2e -- --project=chromium-integration"
echo ""

echo "⚠️  Security note:"
echo "- Never commit .env.test.local to version control"
echo "- The PAT should have minimal required permissions"
echo "- Consider using a dedicated test GitHub account"
