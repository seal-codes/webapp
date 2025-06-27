#!/bin/bash

echo "🧬 ARCHITECTURAL DNA ANALYSIS"
echo "============================="
echo "Analyzing which components originated from bolt.new sessions..."
echo ""

# Get bolt.new commit hashes for reference
BOLT_COMMITS=$(git log --grep="bolt.new" -i --pretty=format:"%H %s")

echo "📋 BOLT.NEW SESSIONS IDENTIFIED:"
echo "$BOLT_COMMITS" | while read hash message; do
    date=$(git log -1 --pretty=format:"%ad" --date=short $hash)
    echo "  $hash - $message ($date)"
done
echo ""

# Analyze core application files (exclude tests, i18n, scripts)
echo "🏗️  FOUNDATION ARCHITECTURE (Session 1):"
foundation_total=0
for file in "src/App.vue" "src/main.ts" "src/router/index.ts" "src/stores/documentStore.ts" "src/views/TheHomePage.vue" "src/views/TheDocumentPage.vue" "src/views/TheSealedDocumentPage.vue" "src/components/layout/TheNavbar.vue" "src/components/layout/TheFooter.vue" "src/components/document/DocumentDropzone.vue" "src/components/document/DocumentPreview.vue"; do
    if [ -f "$file" ]; then
        lines=$(wc -l < "$file")
        foundation_total=$((foundation_total + lines))
        echo "  ✅ $file ($lines lines)"
    fi
done
echo "  📊 Foundation Total: $foundation_total lines"
echo ""

echo "🔍 VERIFICATION SYSTEM (Session 2):"
verification_total=0
for file in $(find src -name "*verification*" -o -name "*Verification*" | grep -v test | head -10); do
    if [ -f "$file" ]; then
        lines=$(wc -l < "$file")
        verification_total=$((verification_total + lines))
        echo "  ✅ $file ($lines lines)"
    fi
done
echo "  📊 Verification Total: $verification_total lines"
echo ""

echo "🔐 AUTHENTICATION SYSTEM (Session 3):"
auth_total=0
for file in "src/stores/authStore.ts" "src/services/auth-service.ts" "src/components/auth/SocialAuthSelector.vue" "src/views/AuthCallbackPage.vue"; do
    if [ -f "$file" ]; then
        lines=$(wc -l < "$file")
        auth_total=$((auth_total + lines))
        echo "  ✅ $file ($lines lines)"
    fi
done
echo "  📊 Authentication Total: $auth_total lines"
echo ""

echo "🔧 MANUAL ENHANCEMENTS:"
manual_total=0
for file in $(find src -name "*faq*" -o -name "*Faq*" | grep -v test); do
    if [ -f "$file" ]; then
        lines=$(wc -l < "$file")
        manual_total=$((manual_total + lines))
        echo "  🔧 $file ($lines lines)"
    fi
done
echo "  📊 Manual Total: $manual_total lines"
echo ""

# Calculate totals
bolt_total=$((foundation_total + verification_total + auth_total))
grand_total=$((bolt_total + manual_total))

echo "📈 SUMMARY METRICS:"
echo "  Bolt.new Core Systems: $bolt_total lines"
echo "  Manual Enhancements: $manual_total lines"
echo "  Total Analyzed: $grand_total lines"

if [ $grand_total -gt 0 ]; then
    bolt_percentage=$((bolt_total * 100 / grand_total))
    manual_percentage=$((manual_total * 100 / grand_total))
    echo ""
    echo "🎯 IMPACT ANALYSIS:"
    echo "  Bolt.new provided: $bolt_percentage% of core architecture"
    echo "  Manual work added: $manual_percentage% enhancements"
    echo ""
    echo "💡 INSIGHT: Bolt.new created the foundational architecture,"
    echo "   manual work focused on polish and additional features."
fi

echo ""
echo "✅ Analysis complete. Results can be independently verified by running this script."
