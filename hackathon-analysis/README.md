# Hackathon Analysis Suite

This directory contains the analysis scripts used to generate the metrics shown in the `/hackathon` route.

## Scripts

1. `architectural-dna.sh` - Analyzes which files originated from bolt.new sessions (SBOM approach)
2. `development-timeline.sh` - Analyzes the development progression session by session
3. `foundation-impact.sh` - Calculates the "zero to something" impact metrics
4. `verify-all.sh` - Runs all analyses and generates a comprehensive report

## Usage

```bash
# Run individual analyses
./architectural-dna.sh
./development-timeline.sh  
./foundation-impact.sh

# Or run everything
./verify-all.sh
```

## Methodology

Our analysis focuses on:
- **Core application files only** (excludes tests, i18n, build scripts)
- **Architectural contribution** rather than raw line counts
- **Functional systems** created by each bolt.new session
- **Transparent, reproducible metrics** that judges can verify

The goal is to show bolt.new's true superpower: **taking projects from zero to functional architecture** rapidly.
