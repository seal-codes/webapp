#!/bin/bash

echo "=== ARCHITECTURAL DNA ANALYSIS ==="
echo ""

# Files created by bolt.new session 1 (Foundation)
echo "🏗️  FOUNDATION (Session 1 - Scaffolding):"
echo "Core architecture files that still exist:"
for file in "src/App.vue" "src/main.ts" "src/router/index.ts" "src/stores/documentStore.ts" "src/views/TheHomePage.vue" "src/views/TheDocumentPage.vue" "src/views/TheSealedDocumentPage.vue" "src/components/layout/TheNavbar.vue" "src/components/layout/TheFooter.vue" "src/components/document/DocumentDropzone.vue" "src/components/document/DocumentPreview.vue"; do
    if [ -f "$file" ]; then
        lines=$(wc -l < "$file")
        echo "  ✅ $file ($lines lines)"
    fi
done

echo ""
echo "🔍 VERIFICATION SYSTEM (Session 2):"
echo "Files that implement verification functionality:"
for file in $(find src -name "*verification*" -o -name "*Verification*" | grep -v test); do
    if [ -f "$file" ]; then
        lines=$(wc -l < "$file")
        echo "  ✅ $file ($lines lines)"
    fi
done

echo ""
echo "🔐 AUTHENTICATION & BACKEND (Session 3):"
echo "Auth and backend service files:"
for file in $(find src -name "*auth*" -o -name "*Auth*" -o -name "*service*" -o -name "*Store*" | grep -v test | grep -v faq); do
    if [ -f "$file" ]; then
        lines=$(wc -l < "$file")
        echo "  ✅ $file ($lines lines)"
    fi
done

echo ""
echo "🎨 UI COMPONENTS (Session 5):"
echo "UI enhancement components:"
for file in "src/components/common/GradientText.vue" "src/components/common/HackathonBadge.vue" "src/plugins/mediaQueries.ts"; do
    if [ -f "$file" ]; then
        lines=$(wc -l < "$file")
        echo "  ✅ $file ($lines lines)"
    fi
done

echo ""
echo "📊 MANUAL ADDITIONS (Non-bolt.new):"
echo "Major features added manually:"
for file in $(find src -name "*faq*" -o -name "*Faq*" | grep -v test); do
    if [ -f "$file" ]; then
        lines=$(wc -l < "$file")
        echo "  🔧 $file ($lines lines) - Manual addition"
    fi
done

