#!/bin/bash

# Development Timeline Analysis - JSON Output Only
# Returns machine-readable statistics about development progression

# Get bolt.new sessions in chronological order
sessions=()
cumulative_files=0
cumulative_lines=0
session_number=0

while IFS='|' read -r hash subject date author; do
    session_number=$((session_number + 1))
    
    # Get file changes for this commit
    files_changed=$(git show --stat "$hash" | tail -1 | grep -o '[0-9]\+ files\? changed' | grep -o '[0-9]\+' || echo "0")
    insertions=$(git show --stat "$hash" | tail -1 | grep -o '[0-9]\+ insertions\?' | grep -o '[0-9]\+' || echo "0")
    deletions=$(git show --stat "$hash" | tail -1 | grep -o '[0-9]\+ deletions\?' | grep -o '[0-9]\+' || echo "0")
    
    cumulative_files=$((cumulative_files + files_changed))
    cumulative_lines=$((cumulative_lines + insertions))
    
    # Get key files created/modified
    key_files=$(git show --name-status "$hash" | grep "^[AM]" | grep "^[AM].*src/" | head -5 | jq -R -s 'split("\n") | map(select(length > 0)) | map(split("\t")) | map({"status": .[0], "file": .[1]})')
    
    # Clean up subject to extract session name
    session_name=$(echo "$subject" | sed 's/bolt\.new session [0-9]*: //' | sed 's/What bolt\.new had done/Documentation/')
    
    sessions+=("{
        \"session_number\": $session_number,
        \"hash\": \"$hash\",
        \"subject\": \"$subject\",
        \"session_name\": \"$session_name\",
        \"date\": \"$date\",
        \"author\": \"$author\",
        \"files_changed\": $files_changed,
        \"lines_added\": $insertions,
        \"lines_removed\": $deletions,
        \"cumulative_files\": $cumulative_files,
        \"cumulative_lines\": $cumulative_lines,
        \"key_files\": $key_files
    }")
    
done < <(git log --grep="bolt.new" -i --reverse --pretty=format:"%h|%s|%ad|%an" --date=short)

# Calculate velocity metrics
total_sessions=$session_number
avg_files_per_session=$((cumulative_files / total_sessions))
avg_lines_per_session=$((cumulative_lines / total_sessions))

# Output JSON
cat << JSON
{
  "analysis_type": "development_timeline",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "git_commit": "$(git rev-parse --short HEAD)",
  "git_branch": "$(git branch --show-current)",
  "sessions": [$(IFS=,; echo "${sessions[*]}")],
  "velocity_metrics": {
    "total_sessions": $total_sessions,
    "total_files_created": $cumulative_files,
    "total_lines_added": $cumulative_lines,
    "avg_files_per_session": $avg_files_per_session,
    "avg_lines_per_session": $avg_lines_per_session
  },
  "development_model": {
    "approach": "incremental_architecture",
    "pattern": "foundation_first",
    "complexity_progression": "structure_to_features_to_polish"
  }
}
JSON
