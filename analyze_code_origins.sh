#!/bin/bash

# Get list of bolt.new commit hashes
BOLT_COMMITS=$(git log --grep="bolt.new" -i --pretty=format:"%H")

echo "=== CODE ORIGIN ANALYSIS ==="
echo "Bolt.new commits:"
echo "$BOLT_COMMITS"
echo ""

total_lines=0
bolt_origin_lines=0

# Analyze each source file
for file in $(find src -name "*.vue" -o -name "*.ts" -o -name "*.js" 2>/dev/null); do
    if [ -f "$file" ]; then
        echo "Analyzing: $file"
        
        # Get blame info for the file
        file_total=0
        file_bolt=0
        
        while IFS= read -r line; do
            if [ -n "$line" ]; then
                commit_hash=$(echo "$line" | awk '{print $1}')
                # Check if this commit hash is in our bolt.new commits
                if echo "$BOLT_COMMITS" | grep -q "$commit_hash"; then
                    ((file_bolt++))
                fi
                ((file_total++))
            fi
        done < <(git blame --porcelain "$file" 2>/dev/null | grep "^[0-9a-f]\{40\}")
        
        if [ $file_total -gt 0 ]; then
            percentage=$((file_bolt * 100 / file_total))
            echo "  $file_bolt/$file_total lines from bolt.new ($percentage%)"
            total_lines=$((total_lines + file_total))
            bolt_origin_lines=$((bolt_origin_lines + file_bolt))
        fi
    fi
done

echo ""
echo "=== SUMMARY ==="
if [ $total_lines -gt 0 ]; then
    overall_percentage=$((bolt_origin_lines * 100 / total_lines))
    echo "Total lines analyzed: $total_lines"
    echo "Lines originating from bolt.new: $bolt_origin_lines"
    echo "Actual bolt.new origin percentage: $overall_percentage%"
else
    echo "No lines analyzed"
fi
