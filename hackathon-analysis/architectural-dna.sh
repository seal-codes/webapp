#!/bin/bash

# Architectural DNA Analysis - JSON Output Only
# Returns machine-readable statistics about code origins

# Helper function to calculate lines for a list of files
calculate_files() {
    local files="$1"
    local file_list=()
    local total_lines=0
    local file_count=0
    
    for file in $files; do
        if [ -f "$file" ]; then
            lines=$(wc -l < "$file")
            total_lines=$((total_lines + lines))
            file_count=$((file_count + 1))
            file_list+=("\"$file\": $lines")
        fi
    done
    
    echo "{\"files\": {$(IFS=,; echo "${file_list[*]}")}, \"total_lines\": $total_lines, \"file_count\": $file_count}"
}

# Get bolt.new commit information
bolt_commits=$(git log --grep="bolt.new" -i --pretty=format:'{"hash": "%H", "message": "%s", "date": "%ad", "author": "%an"}' --date=short | jq -s '.')

# Define file categories
foundation_files="src/App.vue src/main.ts src/router/index.ts src/stores/documentStore.ts src/views/TheHomePage.vue src/views/TheDocumentPage.vue src/views/TheSealedDocumentPage.vue src/views/NotFoundPage.vue src/components/layout/TheNavbar.vue src/components/layout/TheFooter.vue src/components/document/DocumentDropzone.vue src/components/document/DocumentPreview.vue src/components/document/HowItWorks.vue src/components/common/WaxSealButton.vue src/components/common/IconifiedStepDescription.vue src/types/auth.ts"

verification_files="src/views/TheVerificationPage.vue src/services/verification-service.ts src/services/document-hash-service.ts src/services/qr-reader-hybrid.ts src/services/qrcode-service.ts src/services/qrcode-ui-calculator.ts src/components/verification/VerificationResults.vue src/components/verification/VerificationSidebar.vue src/components/verification/VerificationDocumentPreview.vue src/components/verification/VerificationSealInfo.vue src/components/verification/EnhancedVerificationResult.vue src/components/verification/VerificationContent.vue src/components/verification/VerificationUploadPrompt.vue src/components/verification/VerificationHeader.vue src/components/verification/VerificationActions.vue src/components/verification/ExclusionZoneOverlay.vue src/components/common/LabeledText.vue src/composables/useVerificationMessages.ts src/stores/verificationStore.ts src/services/debug-verification.ts"

auth_files="src/stores/authStore.ts src/services/auth-service.ts src/services/auth-providers-service.ts src/services/signing-service.ts src/services/supabase-client.ts src/components/auth/SocialAuthSelector.vue src/views/AuthCallbackPage.vue src/composables/useToast.ts src/components/common/ToastComponent.vue src/components/common/ToastContainer.vue"

signature_files="src/services/signature-verification-service.ts"

ui_files="src/components/common/GradientText.vue src/components/common/HackathonBadge.vue src/plugins/mediaQueries.ts"

manual_files="src/types/faq.ts src/components/faq/FaqPopover.vue src/components/faq/FaqLink.vue src/components/faq/FaqEntry.vue src/components/faq/SmartText.vue src/views/FaqPage.vue src/services/faqService.ts"

# Calculate statistics for each category
foundation_stats=$(calculate_files "$foundation_files")
verification_stats=$(calculate_files "$verification_files")
auth_stats=$(calculate_files "$auth_files")
signature_stats=$(calculate_files "$signature_files")
ui_stats=$(calculate_files "$ui_files")
manual_stats=$(calculate_files "$manual_files")

# Calculate totals
foundation_total=$(echo "$foundation_stats" | jq '.total_lines')
verification_total=$(echo "$verification_stats" | jq '.total_lines')
auth_total=$(echo "$auth_stats" | jq '.total_lines')
signature_total=$(echo "$signature_stats" | jq '.total_lines')
ui_total=$(echo "$ui_stats" | jq '.total_lines')
manual_total=$(echo "$manual_stats" | jq '.total_lines')

bolt_total=$((foundation_total + verification_total + auth_total + signature_total + ui_total))
grand_total=$((bolt_total + manual_total))

# Calculate coverage
all_files_count=$(find src -name "*.vue" -o -name "*.ts" -o -name "*.js" | grep -v test | grep -v spec | grep -v i18n | wc -l)
all_lines_count=$(find src -name "*.vue" -o -name "*.ts" -o -name "*.js" | grep -v test | grep -v spec | grep -v i18n | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')

analyzed_files=$(($(echo "$foundation_stats" | jq '.file_count') + $(echo "$verification_stats" | jq '.file_count') + $(echo "$auth_stats" | jq '.file_count') + $(echo "$signature_stats" | jq '.file_count') + $(echo "$ui_stats" | jq '.file_count') + $(echo "$manual_stats" | jq '.file_count')))

# Output JSON
cat << JSON
{
  "analysis_type": "architectural_dna",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "git_commit": "$(git rev-parse --short HEAD)",
  "git_branch": "$(git branch --show-current)",
  "bolt_sessions": $bolt_commits,
  "categories": {
    "foundation": $foundation_stats,
    "verification": $verification_stats,
    "authentication": $auth_stats,
    "signature": $signature_stats,
    "ui": $ui_stats,
    "manual": $manual_stats
  },
  "totals": {
    "bolt_lines": $bolt_total,
    "manual_lines": $manual_total,
    "analyzed_lines": $grand_total,
    "analyzed_files": $analyzed_files
  },
  "coverage": {
    "total_codebase_files": $all_files_count,
    "total_codebase_lines": $all_lines_count,
    "file_coverage_percent": $((analyzed_files * 100 / all_files_count)),
    "line_coverage_percent": $((grand_total * 100 / all_lines_count))
  },
  "impact": {
    "bolt_percentage": $((bolt_total * 100 / grand_total)),
    "manual_percentage": $((manual_total * 100 / grand_total))
  }
}
JSON
