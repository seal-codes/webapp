#!/bin/bash

echo "=== ZERO TO SOMETHING ANALYSIS ==="
echo ""

# Core architectural files (the "something" bolt.new created)
foundation_files=(
    "src/App.vue"
    "src/main.ts" 
    "src/router/index.ts"
    "src/stores/documentStore.ts"
    "src/views/TheHomePage.vue"
    "src/views/TheDocumentPage.vue"
    "src/views/TheSealedDocumentPage.vue"
    "src/components/layout/TheNavbar.vue"
    "src/components/layout/TheFooter.vue"
    "src/components/document/DocumentDropzone.vue"
    "src/components/document/DocumentPreview.vue"
)

verification_files=(
    "src/views/TheVerificationPage.vue"
    "src/services/verification-service.ts"
    "src/components/verification/VerificationResults.vue"
)

auth_files=(
    "src/stores/authStore.ts"
    "src/services/auth-service.ts"
    "src/components/auth/SocialAuthSelector.vue"
    "src/views/AuthCallbackPage.vue"
)

foundation_lines=0
verification_lines=0
auth_lines=0
manual_lines=0

echo "🏗️  FOUNDATION ARCHITECTURE (Session 1):"
for file in "${foundation_files[@]}"; do
    if [ -f "$file" ]; then
        lines=$(wc -l < "$file")
        foundation_lines=$((foundation_lines + lines))
        echo "  $file: $lines lines"
    fi
done

echo ""
echo "🔍 VERIFICATION SYSTEM (Session 2):"
for file in "${verification_files[@]}"; do
    if [ -f "$file" ]; then
        lines=$(wc -l < "$file")
        verification_lines=$((verification_lines + lines))
        echo "  $file: $lines lines"
    fi
done

echo ""
echo "🔐 AUTHENTICATION SYSTEM (Session 3):"
for file in "${auth_files[@]}"; do
    if [ -f "$file" ]; then
        lines=$(wc -l < "$file")
        auth_lines=$((auth_lines + lines))
        echo "  $file: $lines lines"
    fi
done

echo ""
echo "🔧 MANUAL ENHANCEMENTS:"
for file in $(find src -name "*faq*" -o -name "*Faq*" | grep -v test); do
    if [ -f "$file" ]; then
        lines=$(wc -l < "$file")
        manual_lines=$((manual_lines + lines))
        echo "  $file: $lines lines"
    fi
done

total_core=$((foundation_lines + verification_lines + auth_lines))
total_analyzed=$((total_core + manual_lines))

echo ""
echo "=== SUMMARY ==="
echo "Foundation Architecture: $foundation_lines lines"
echo "Verification System: $verification_lines lines" 
echo "Authentication System: $auth_lines lines"
echo "Manual Enhancements: $manual_lines lines"
echo ""
echo "BOLT.NEW CORE SYSTEMS: $total_core lines"
echo "MANUAL ADDITIONS: $manual_lines lines"
echo "TOTAL ANALYZED: $total_analyzed lines"

if [ $total_analyzed -gt 0 ]; then
    core_percentage=$((total_core * 100 / total_analyzed))
    echo ""
    echo "🎯 BOLT.NEW PROVIDED THE CORE: $core_percentage% of analyzed code"
    echo "🔧 MANUAL WORK WAS ENHANCEMENTS: $((100 - core_percentage))% of analyzed code"
fi

