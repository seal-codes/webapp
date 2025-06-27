#!/bin/bash

echo "🔬 COMPREHENSIVE HACKATHON ANALYSIS"
echo "==================================="
echo "Generating machine-readable statistics and human interpretation..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check for required tools
if ! command -v jq &> /dev/null; then
    echo "❌ Error: jq is required for JSON processing"
    echo "   Install with: brew install jq (macOS) or apt-get install jq (Linux)"
    exit 1
fi

echo "📊 COLLECTING MACHINE-READABLE STATISTICS..."
echo ""

# Run analyses and capture JSON output
echo "🧬 Analyzing architectural DNA..."
dna_json=$(./hackathon-analysis/architectural-dna.sh)
if [ $? -ne 0 ]; then
    echo "❌ Error running architectural DNA analysis"
    exit 1
fi

echo "⏱️  Analyzing development timeline..."
timeline_json=$(./hackathon-analysis/development-timeline.sh)
if [ $? -ne 0 ]; then
    echo "❌ Error running development timeline analysis"
    exit 1
fi

echo ""
echo "📋 INTERPRETING RESULTS..."
echo "========================="

# Extract key metrics from DNA analysis
bolt_lines=$(echo "$dna_json" | jq '.totals.bolt_lines')
manual_lines=$(echo "$dna_json" | jq '.totals.manual_lines')
analyzed_lines=$(echo "$dna_json" | jq '.totals.analyzed_lines')
analyzed_files=$(echo "$dna_json" | jq '.totals.analyzed_files')
file_coverage=$(echo "$dna_json" | jq '.coverage.file_coverage_percent')
line_coverage=$(echo "$dna_json" | jq '.coverage.line_coverage_percent')
bolt_percentage=$(echo "$dna_json" | jq '.impact.bolt_percentage')
manual_percentage=$(echo "$dna_json" | jq '.impact.manual_percentage')

# Extract timeline metrics
total_sessions=$(echo "$timeline_json" | jq '.velocity_metrics.total_sessions')
total_files_created=$(echo "$timeline_json" | jq '.velocity_metrics.total_files_created')
total_lines_added=$(echo "$timeline_json" | jq '.velocity_metrics.total_lines_added')

echo "🏗️  ARCHITECTURAL DNA FINDINGS:"
echo "  Foundation Architecture: $(echo "$dna_json" | jq '.categories.foundation.total_lines') lines ($(echo "$dna_json" | jq '.categories.foundation.file_count') files)"
echo "  Verification System: $(echo "$dna_json" | jq '.categories.verification.total_lines') lines ($(echo "$dna_json" | jq '.categories.verification.file_count') files)"
echo "  Authentication & Backend: $(echo "$dna_json" | jq '.categories.authentication.total_lines') lines ($(echo "$dna_json" | jq '.categories.authentication.file_count') files)"
echo "  Signature Verification: $(echo "$dna_json" | jq '.categories.signature.total_lines') lines ($(echo "$dna_json" | jq '.categories.signature.file_count') files)"
echo "  UI Polishing: $(echo "$dna_json" | jq '.categories.ui.total_lines') lines ($(echo "$dna_json" | jq '.categories.ui.file_count') files)"
echo "  Manual Enhancements: $(echo "$dna_json" | jq '.categories.manual.total_lines') lines ($(echo "$dna_json" | jq '.categories.manual.file_count') files)"
echo ""

echo "⏱️  DEVELOPMENT TIMELINE FINDINGS:"
echo "  Total Sessions: $total_sessions focused development sessions"
echo "  Files Created: $total_files_created files across all sessions"
echo "  Lines Added: $total_lines_added lines of code"
echo "  Development Model: $(echo "$timeline_json" | jq -r '.development_model.approach') with $(echo "$timeline_json" | jq -r '.development_model.pattern') strategy"
echo ""

echo "🎯 KEY INSIGHTS:"
echo "  • Bolt.new provided $bolt_percentage% of analyzed code ($bolt_lines lines)"
echo "  • Manual work added $manual_percentage% enhancements ($manual_lines lines)"
echo "  • Analysis covers $line_coverage% of codebase ($file_coverage% of files)"
echo "  • $total_sessions sessions took project from zero to production-ready"
echo ""

echo "📊 COVERAGE VALIDATION:"
echo "  Files analyzed: $analyzed_files files"
echo "  Lines analyzed: $analyzed_lines lines"
echo "  Coverage quality: $([ $line_coverage -gt 80 ] && echo "✅ Excellent" || echo "⚠️  Needs improvement")"
echo ""

echo "🏆 HACKATHON STORY:"
echo "  Bolt.new's superpower demonstrated: architectural foundation creation."
echo "  Each session built upon previous decisions, maintaining consistency."
echo "  Manual work focused on user experience (FAQ system, polish)."
echo "  Result: Production-ready application with solid architectural base."
echo ""

echo "🔍 VERIFICATION DATA:"
echo "  Analysis timestamp: $(echo "$dna_json" | jq -r '.timestamp')"
echo "  Git commit: $(echo "$dna_json" | jq -r '.git_commit')"
echo "  Git branch: $(echo "$dna_json" | jq -r '.git_branch')"
echo ""

echo "📁 RAW DATA ACCESS:"
echo "  Architectural DNA JSON: ./hackathon-analysis/architectural-dna.sh"
echo "  Development Timeline JSON: ./hackathon-analysis/development-timeline.sh"
echo "  All data is machine-readable and can be consumed by web interfaces"
echo ""

echo "✅ COMPREHENSIVE ANALYSIS COMPLETE"
echo "All metrics are reproducible and verifiable by running individual scripts."
