# Hackathon Analysis Suite

This directory contains the analysis scripts used to generate metrics for the `/hackathon` route.

## Architecture

**Clean separation of concerns:**
- **Individual scripts** → Pure data extraction (JSON output)
- **Verify script** → Human interpretation and presentation  
- **Web interface** → Can consume JSON directly for interactive features

## Scripts

1. `architectural-dna.sh` - Returns JSON with SBOM analysis (81% codebase coverage)
2. `development-timeline.sh` - Returns JSON with session-by-session progression data
3. `verify-all.sh` - Interprets JSON data and provides human-readable analysis

## Usage

```bash
# Get raw JSON data
./architectural-dna.sh | jq '.'
./development-timeline.sh | jq '.velocity_metrics'

# Get human-readable interpretation
./verify-all.sh
```

## JSON Schema Examples

### Architectural DNA Output
```json
{
  "analysis_type": "architectural_dna",
  "totals": {
    "bolt_lines": 8287,
    "manual_lines": 1073,
    "analyzed_lines": 9360
  },
  "impact": {
    "bolt_percentage": 88,
    "manual_percentage": 12
  },
  "coverage": {
    "line_coverage_percent": 81,
    "file_coverage_percent": 82
  }
}
```

### Development Timeline Output
```json
{
  "analysis_type": "development_timeline",
  "velocity_metrics": {
    "total_sessions": 5,
    "total_files_created": 121,
    "total_lines_added": 12982
  },
  "sessions": [...]
}
```

## Key Findings

- **88% of analyzed code** originated from bolt.new sessions
- **12% manual enhancements** (FAQ system, UI polish)
- **81% codebase coverage** ensures credible analysis
- **5 focused sessions** from zero to production-ready

## Benefits of JSON Architecture

1. **Machine-readable** - Web interfaces can consume data directly
2. **Verifiable** - Judges can inspect raw data and interpretation separately
3. **Flexible** - Same data can power multiple visualizations
4. **Professional** - Clean separation of data and presentation

## The Story

Bolt.new's superpower: **architectural foundation creation**. Our analysis demonstrates how bolt.new takes developers from zero to production-ready applications through focused development sessions, providing a solid base for enhancement and customization.
