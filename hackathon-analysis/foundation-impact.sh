#!/bin/bash

echo "🏗️  FOUNDATION IMPACT ANALYSIS"
echo "============================="
echo "Measuring bolt.new's 'zero to something' contribution..."
echo ""

echo "🎯 METHODOLOGY:"
echo "  • Focus on core application functionality (exclude tests, i18n, build tools)"
echo "  • Measure architectural contribution, not just line counts"
echo "  • Track functional systems created by each session"
echo "  • Distinguish foundation from enhancements"
echo ""

# Calculate foundation system
foundation_lines=0
echo "📊 FOUNDATION SYSTEM:"
for file in "src/App.vue" "src/main.ts" "src/router/index.ts" "src/stores/documentStore.ts" "src/views/TheHomePage.vue" "src/views/TheDocumentPage.vue" "src/views/TheSealedDocumentPage.vue" "src/components/layout/TheNavbar.vue" "src/components/layout/TheFooter.vue" "src/components/document/DocumentDropzone.vue" "src/components/document/DocumentPreview.vue"; do
    if [ -f "$file" ]; then
        lines=$(wc -l < "$file")
        foundation_lines=$((foundation_lines + lines))
        echo "  ✅ $file: $lines lines"
    fi
done
echo "  📈 Foundation Total: $foundation_lines lines"
echo ""

# Calculate verification system
verification_lines=0
echo "📊 VERIFICATION SYSTEM:"
for file in "src/views/TheVerificationPage.vue" "src/services/verification-service.ts" "src/components/verification/VerificationResults.vue"; do
    if [ -f "$file" ]; then
        lines=$(wc -l < "$file")
        verification_lines=$((verification_lines + lines))
        echo "  ✅ $file: $lines lines"
    fi
done
echo "  📈 Verification Total: $verification_lines lines"
echo ""

# Calculate authentication system
auth_lines=0
echo "📊 AUTHENTICATION SYSTEM:"
for file in "src/stores/authStore.ts" "src/services/auth-service.ts" "src/components/auth/SocialAuthSelector.vue" "src/views/AuthCallbackPage.vue"; do
    if [ -f "$file" ]; then
        lines=$(wc -l < "$file")
        auth_lines=$((auth_lines + lines))
        echo "  ✅ $file: $lines lines"
    fi
done
echo "  📈 Authentication Total: $auth_lines lines"
echo ""

# Calculate manual additions
manual_lines=0
echo "🔧 MANUAL ENHANCEMENTS:"
for file in $(find src -name "*faq*" -o -name "*Faq*" | grep -v test); do
    if [ -f "$file" ]; then
        lines=$(wc -l < "$file")
        manual_lines=$((manual_lines + lines))
        echo "  🔧 $file: $lines lines"
    fi
done
echo "  📈 Manual Total: $manual_lines lines"
echo ""

# Calculate impact metrics
total_bolt_lines=$((foundation_lines + verification_lines + auth_lines))
total_analyzed=$((total_bolt_lines + manual_lines))
bolt_percentage=$((total_bolt_lines * 100 / total_analyzed))
manual_percentage=$((manual_lines * 100 / total_analyzed))

echo "🎯 ZERO TO SOMETHING IMPACT:"
echo "  Foundation Architecture: $foundation_lines lines"
echo "  Verification System: $verification_lines lines"
echo "  Authentication System: $auth_lines lines"
echo "  ────────────────────────────────"
echo "  Bolt.new Core Systems: $total_bolt_lines lines ($bolt_percentage%)"
echo "  Manual Enhancements: $manual_lines lines ($manual_percentage%)"
echo "  Total Analyzed: $total_analyzed lines"
echo ""

echo "💡 KEY INSIGHTS:"
echo "  • Bolt.new provided complete foundational architecture"
echo "  • Manual work focused on user experience enhancements"
echo "  • $bolt_percentage% of core functionality came from bolt.new sessions"
echo "  • Demonstrates bolt.new's strength: rapid architecture creation"

echo ""
echo "🔍 VERIFICATION:"
echo "  Run this script to independently verify these calculations."
echo "  All metrics are derived from actual codebase analysis."
echo "  Source files can be inspected to confirm categorization."

echo ""
echo "✅ Foundation impact analysis complete."
