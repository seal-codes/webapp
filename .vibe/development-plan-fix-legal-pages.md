# Development Plan: seal.codes-2 (fix-legal-pages branch)

*Generated on 2025-06-28 by Vibe Feature MCP*
*Workflow: bugfix*

## Goal
Fix syntax error in legal pages (e.g., /legal/terms) that occurs only in the build version but not in dev server. Error shows: "SyntaxError: 10" in the console and prevents content from displaying.

## Reproduce
### Phase Entrance Criteria:
- [x] Bug report received with clear description
- [x] Build version is available for testing (http://localhost:4173/)

### Tasks
- [x] Access the build version at http://localhost:4173/
- [x] Navigate to legal pages (/legal/terms, /legal/privacy, etc.)
- [x] Reproduce the syntax error in browser console
- [x] Compare behavior with dev server
- [x] Document exact error message and stack trace
- [x] Identify which legal pages are affected
- [x] Test dev server to confirm it works there
- [x] Analyze console messages in both environments

### Completed
- [x] Created development plan file
- [x] Successfully reproduced the bug on /legal/terms and /legal/privacy
- [x] Confirmed main content area is empty on legal pages in build version
- [x] Documented exact error: "SyntaxError: 10" with full stack trace
- [x] Confirmed dev server works correctly but shows i18n warnings
- [x] Identified root cause: Vue i18n parsing HTML content as i18n syntax

## Analyze
### Phase Entrance Criteria:
- [x] Bug has been reliably reproduced
- [x] Error conditions and affected pages are documented
- [x] Difference between dev and build behavior is confirmed

### Tasks
- [x] Identify root cause: Vue i18n parsing HTML as i18n syntax
- [x] Examine i18n configuration to understand parsing behavior
- [x] Research Vue i18n options to disable HTML parsing
- [x] Evaluate different solution approaches
- [x] Document recommended solution approach

### Completed
- [x] Root cause identified: Vue i18n HTML parsing issue
- [x] Examined i18n configuration - standard setup with no special parsing options
- [x] Researched potential solutions
- [x] Evaluated pros/cons of each approach

## Fix
### Phase Entrance Criteria:
- [x] Root cause has been identified
- [x] Solution approach is documented
- [x] Impact of fix is understood

### Tasks
- [x] Replace @ symbols with &#64; in German JSON file legal content
- [x] Replace @ symbols with &#64; in English JSON file legal content
- [x] Test fix in development environment
- [x] Build and test in production environment
- [x] Verify all legal pages render correctly

### Completed
- [x] Fixed all @ symbols in German JSON file (impressum, privacy, terms, disclaimer)
- [x] Fixed all @ symbols in English JSON file (impressum, privacy, terms, disclaimer)
- [x] Tested in dev environment - no more i18n parsing errors
- [x] Built and tested production version - fix works perfectly
- [x] Verified legal pages render correctly with full content visible

## Verify
### Phase Entrance Criteria:
- [x] Fix has been implemented
- [x] Code changes are complete
- [x] Ready for testing

### Tasks
- [x] Test all legal pages in production build (/legal/terms, /legal/privacy)
- [x] Test remaining legal pages (/legal/impressum, /legal/disclaimer)
- [x] Verify email addresses display correctly in all pages
- [x] Confirm no console errors in production build
- [x] Test in both German and English languages
- [x] Verify no regressions in other parts of the application

### Completed
- [x] Verified /legal/terms renders correctly with full content
- [x] Verified /legal/privacy renders correctly with full content
- [x] Confirmed no "SyntaxError: 10" errors in console
- [x] Verified /legal/impressum renders correctly with email address
- [x] Verified /legal/disclaimer renders correctly with email address
- [x] Tested language switching - both German and English work perfectly
- [x] Confirmed email addresses display correctly as seal.codes.legal@beimir.net in all pages
- [x] No console errors in production build - only normal application logs
- [x] All legal pages render complete content with proper HTML structure

## Key Decisions
**Recommended Solution: Option 2 - Escape Problematic Characters**

After analysis, the best approach is to escape the @ symbols in email addresses within the JSON files. This is because:

1. **Minimal Impact**: Only affects the specific problematic characters
2. **Preserves Structure**: Keeps existing i18n structure intact
3. **Targeted Fix**: Addresses the root cause without global changes
4. **Maintains Functionality**: Preserves all i18n features for other content
5. **Simple Implementation**: Replace `@` with `&#64;` in JSON files

**Implementation Plan:**
1. Replace `@` symbols with `&#64;` HTML entity in legal content JSON
2. Test in both dev and build environments
3. Verify all legal pages render correctly

**Alternative Considered:**
Option 1 (disable message compilation) was considered but rejected because it would disable i18n features globally, which might be needed for other content in the future.

## Notes
## Notes
**Bug Reproduction Results:**
- Error occurs consistently on legal pages: /legal/terms, /legal/privacy
- Error message: "SyntaxError: 10" 
- Stack trace points to parsing function in minified bundle (index-a0lU9ZLy.js)
- Main content area renders empty (just `<main>` tag with no content)
- Header and footer render correctly
- Error appears to be in a parsing function (Object.C [as parse])
- The error suggests something is trying to parse content and failing

**Root Cause Identified:**
Vue i18n is attempting to parse HTML content in legal pages as if it contains i18n linked message syntax. The HTML content contains characters (especially email addresses like `seal.codes.legal@beimir.net`) that are being interpreted as i18n syntax tokens.

**Dev vs Build Behavior:**
- Dev server: Shows warnings but content renders correctly
  - `Message compilation error: Invalid linked format`
  - `Message compilation error: Unexpected lexical analysis in token: 'beimir.ne…'`
  - `Message compilation error: Unexpected empty linked key`
- Build version: Throws fatal "SyntaxError: 10" and fails to render content

**Technical Details:**
The issue occurs because:
1. Legal pages use `<div v-html="t('legal.terms.content')" />` to render HTML content
2. Vue i18n tries to compile the HTML string as if it contains i18n syntax
3. Email addresses and other characters trigger the i18n parser
4. In production build, the minified i18n parser is stricter and throws fatal errors
5. In dev mode, it shows warnings but continues rendering

**Solution Analysis:**

**Option 1: Disable Message Compilation (Recommended)**
- Add `compileMessages: false` to i18n configuration
- Pros: Simple, preserves existing structure, minimal changes
- Cons: Disables i18n features globally (but legal content doesn't need them)

**Option 2: Escape Problematic Characters**
- Replace @ symbols with HTML entities in JSON files
- Pros: Targeted fix, preserves i18n functionality
- Cons: Makes content harder to read/maintain, may miss other problematic chars

**Option 3: Raw HTML Approach**
- Store legal content as separate HTML files or use different storage method
- Pros: Clean separation, no i18n parsing issues
- Cons: Requires restructuring, more complex implementation

**Option 4: Use v-text with HTML entities**
- Convert HTML to plain text with proper formatting
- Pros: Avoids HTML parsing entirely
- Cons: Loses HTML formatting, major content restructuring needed

## FINAL RESULT: ✅ BUG SUCCESSFULLY FIXED

**Fix Applied:** Option 2 - Escaped @ symbols with HTML entities (&#64;)

**Files Modified:**
- `/src/i18n/locales/de.json` - Fixed all @ symbols in legal content
- `/src/i18n/locales/en.json` - Fixed all @ symbols in legal content

**Verification Results:**
- ✅ All legal pages render correctly in production build
- ✅ No "SyntaxError: 10" errors in console
- ✅ Email addresses display correctly as seal.codes.legal@beimir.net
- ✅ Both German and English languages work perfectly
- ✅ No regressions in other parts of the application
- ✅ Dev and production environments both work correctly

**Pages Tested:**
- /legal/terms (German & English)
- /legal/privacy (German & English)  
- /legal/impressum (German & English)
- /legal/disclaimer (German & English)

The bug is completely resolved and the application is working as expected.

---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
