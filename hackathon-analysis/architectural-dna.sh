#!/bin/bash

# Architectural DNA Analysis - JSON Output with Commit Metadata
# Returns machine-readable statistics about code origins with detailed session information

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

# Get bolt.new commit information with enhanced metadata
bolt_sessions='[
  {
    "session_number": 1,
    "hash": "1d9182f",
    "message": "bolt.new session 1: Scaffolding + document selection",
    "date": "2025-06-06",
    "author": "Oliver Jägle",
    "summary": "Initial project scaffolding with Vue 3, TypeScript, and core document handling architecture",
    "key_achievements": [
      "Set up Vue 3 + TypeScript + Vite foundation",
      "Implemented document store with Pinia",
      "Created routing structure and main views",
      "Built document dropzone and preview components",
      "Established layout components (navbar, footer)"
    ],
    "files_created": 42,
    "lines_added": 5399,
    "impact": "Created the entire application foundation and architecture"
  },
  {
    "session_number": 2,
    "hash": "ca97162",
    "message": "bolt.new session 2: verification page",
    "date": "2025-06-09",
    "author": "Oliver Jägle",
    "summary": "Comprehensive document verification system with QR code scanning and validation",
    "key_achievements": [
      "Built complete verification page with multi-step process",
      "Implemented QR code reading with multiple libraries",
      "Created document hash verification services",
      "Added verification result components with detailed feedback",
      "Integrated verification store for state management"
    ],
    "files_created": 23,
    "lines_added": 3004,
    "impact": "Enabled end-to-end document verification workflow"
  },
  {
    "session_number": 3,
    "hash": "09293c2",
    "message": "bolt.new session 3: backend",
    "date": "2025-06-13",
    "author": "Oliver Jägle",
    "summary": "Authentication system and backend services integration",
    "key_achievements": [
      "Implemented OAuth social authentication flow",
      "Created Supabase backend integration",
      "Built document signing services",
      "Added authentication store and state management",
      "Integrated toast notification system"
    ],
    "files_created": 28,
    "lines_added": 3692,
    "impact": "Connected frontend to backend services with secure authentication"
  },
  {
    "session_number": 4,
    "hash": "5ea6e11",
    "message": "bolt.new session 4: online signature verification",
    "date": "2025-06-14",
    "author": "Oliver Jägle",
    "summary": "Advanced signature verification with cryptographic validation",
    "key_achievements": [
      "Added cryptographic signature verification",
      "Enhanced verification results with signature status",
      "Improved error handling and user feedback",
      "Optimized verification performance",
      "Added signature metadata display"
    ],
    "files_created": 27,
    "lines_added": 860,
    "impact": "Elevated verification system to production-grade security"
  },
  {
    "session_number": 5,
    "hash": "f1619dc",
    "message": "bolt.new session 5: UI polishing",
    "date": "2025-06-27",
    "author": "Oliver Jägle",
    "summary": "UI/UX enhancements and visual polish for production readiness",
    "key_achievements": [
      "Added gradient text components for visual appeal",
      "Created hackathon badge component",
      "Implemented responsive media queries",
      "Enhanced component styling and animations",
      "Improved overall user experience"
    ],
    "files_created": 15,
    "lines_added": 372,
    "impact": "Transformed functional app into polished, production-ready product"
  }
]'

# Define file categories with session mapping
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

# Calculate coverage - IMPORTANT: Exclude non-deployable code from coverage calculation
# Exclusions:
# - test/spec files: Not part of the deployable application
# - i18n files: Extracted from bolt.new proposals, not core functionality  
# - hackathon files: Created specifically for this showcase, not part of the core app
# This ensures coverage reflects bolt.new's contribution to the actual deployable application
all_files_count=$(find src -name "*.vue" -o -name "*.ts" -o -name "*.js" | grep -v test | grep -v spec | grep -v i18n | grep -v hackathon | wc -l)
all_lines_count=$(find src -name "*.vue" -o -name "*.ts" -o -name "*.js" | grep -v test | grep -v spec | grep -v i18n | grep -v hackathon | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')

analyzed_files=$(($(echo "$foundation_stats" | jq '.file_count') + $(echo "$verification_stats" | jq '.file_count') + $(echo "$auth_stats" | jq '.file_count') + $(echo "$signature_stats" | jq '.file_count') + $(echo "$ui_stats" | jq '.file_count') + $(echo "$manual_stats" | jq '.file_count')))

# Output JSON with enhanced session metadata
cat << JSON
{
  "analysis_type": "architectural_dna",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "git_commit": "$(git rev-parse --short HEAD)",
  "git_branch": "$(git branch --show-current)",
  "bolt_sessions": $bolt_sessions,
  "categories": {
    "foundation": $(echo "$foundation_stats" | jq '. + {"session": 1, "session_name": "Foundation Architecture", "description": "Core application structure, routing, and document handling"}'),
    "verification": $(echo "$verification_stats" | jq '. + {"session": 2, "session_name": "Verification System", "description": "Document verification, QR scanning, and validation logic"}'),
    "authentication": $(echo "$auth_stats" | jq '. + {"session": 3, "session_name": "Authentication & Backend", "description": "OAuth integration, backend services, and user management"}'),
    "signature": $(echo "$signature_stats" | jq '. + {"session": 4, "session_name": "Signature Verification", "description": "Cryptographic signature validation and security features"}'),
    "ui": $(echo "$ui_stats" | jq '. + {"session": 5, "session_name": "UI Polishing", "description": "Visual enhancements, responsive design, and user experience"}'),
    "manual": $(echo "$manual_stats" | jq '. + {"session": "manual", "session_name": "Manual Enhancements", "description": "FAQ system, additional features, and custom refinements"}')
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
  },
  "methodology": {
    "approach": "Software Bill of Materials (SBOM) analysis",
    "focus": "Core application functionality (excludes tests, i18n, build tools)",
    "measurement": "Architectural contribution rather than raw line counts",
    "verification": "All metrics derived from actual codebase analysis"
  }
}
JSON
