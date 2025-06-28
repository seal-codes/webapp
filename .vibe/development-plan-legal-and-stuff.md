# Development Plan: seal.codes (legal-and-stuff branch)

*Generated on 2025-06-28 by Vibe Feature MCP*
*Workflow: epcc*

## Goal
Make the seal.codes webapp production ready by adding mandatory compliance pages including terms of use, privacy policy, responsibility disclaimers, and other legal requirements.

## Explore
### Tasks
- [x] Research legal compliance requirements for document sealing services
- [x] Identify specific pages needed (Terms of Service, Privacy Policy, etc.)
- [x] Analyze current webapp structure and routing system
- [x] Research content requirements for each legal page
- [x] Determine footer navigation structure for legal links
- [x] Consider GDPR, CCPA, and other privacy regulations
- [x] Research liability and disclaimer requirements for document attestation services
- [x] Define specific legal pages needed for Germany-based worldwide service
- [x] Research German Impressum requirements (mandatory for German websites)
- [x] Research GDPR-specific privacy policy requirements
- [x] Define content structure for each legal page with relaxed tone
- [x] Consider cookie consent requirements (not needed - no cookies used)
- [x] Finalize exact content requirements for each legal page
- [x] Determine URL structure for legal pages (/legal/privacy, /legal/terms, etc.)
- [x] Confirm footer structure change (Features → Legal section)
- [x] Define social auth privacy as dedicated section
- [x] Confirm multilingual requirement (German + English)

### Completed
- [x] Created development plan file
- [x] Analyzed current webapp structure (Vue 3 + Vue Router + Tailwind CSS)
- [x] Reviewed existing routing configuration (8 current routes)
- [x] Examined footer structure (currently has Features and Resources columns)
- [x] Confirmed tech stack: Vue 3, TypeScript, Vue Router, Tailwind CSS, i18n support
- [x] Gathered key legal requirements information from user
- [x] Identified Germany-based service with worldwide usage (GDPR compliance required)
- [x] Confirmed technical details: PostHog analytics, no cookies, localStorage settings, JWT auth
- [x] Confirmed data handling: no document storage, temporary user data, EU-central hosting

## Plan

### Phase Entrance Criteria:
- [x] Legal requirements and compliance needs have been thoroughly researched
- [x] Current webapp structure and routing system is understood
- [x] Required pages and content have been identified
- [x] Legal text requirements and templates have been evaluated
- [x] Technical implementation approach is clear

### Tasks
- [x] Create detailed implementation strategy for legal pages
- [x] Define Vue component structure for legal pages
- [x] Plan internationalization (i18n) extension for German/English
- [x] Design footer modification strategy (Features → Legal)
- [x] Plan routing structure for legal pages
- [x] Define content organization and templates
- [x] Consider responsive design for legal pages
- [x] Plan testing strategy for legal pages
- [x] Define deployment and integration approach
- [ ] Review implementation plan with user for approval

### Completed
*None yet*

## Code

### Phase Entrance Criteria:
- [ ] Implementation plan is complete and detailed
- [ ] Required legal content is prepared or sourced
- [ ] Technical approach for page creation and routing is defined
- [ ] UI/UX design decisions for legal pages are made
- [ ] Integration points with existing webapp are identified

### Tasks
- [x] Create BaseLegalPage.vue component with consistent layout
- [x] Create individual legal page components (Impressum, Privacy, Terms, Disclaimer)
- [x] Add legal routes to router/index.ts
- [x] Extend i18n configuration for German/English legal content
- [x] Create legal.json files for both languages with all legal text
- [x] Modify TheFooter.vue to replace Features with Legal section
- [x] Add proper meta tags and SEO for legal pages
- [x] Implement responsive design for legal pages
- [x] Add navigation between legal pages
- [x] Test all legal pages and links
- [x] Verify i18n language switching works correctly
- [x] Test mobile responsiveness
- [x] Validate legal content completeness and accuracy
- [x] Fix typography and spacing issues (improved headings, paragraphs, lists)
- [x] Remove redundant "Other Legal Pages" navigation box
- [x] Improve overall visual design and readability
- [x] Significantly increase spacing around h2 and h3 headings (mt-16/mb-8 for h2, mt-12/mb-6 for h3)
- [x] Fix CSS specificity issues with v-html content (global styles with !important)
- [x] Convert German legal content to informal language (Du instead of Sie)

### Completed
*None yet*

## Commit

### Phase Entrance Criteria:
- [x] All required legal pages are implemented and functional
- [x] Pages are properly integrated into the webapp navigation
- [x] Content is reviewed for completeness and accuracy
- [x] Testing is complete and pages work correctly
- [x] Code quality meets standards

### Tasks
- [x] Final code review and cleanup
- [x] Run final tests to ensure no regressions
- [x] Update documentation if needed
- [x] Prepare summary of changes for delivery
- [x] Commit changes with proper commit message
- [x] Verify all legal pages work correctly in production build

### Completed
- [x] Legal compliance implementation completed successfully
- [x] All required pages implemented and tested  
- [x] Code committed with comprehensive commit message (commit 5aeef96)
- [x] Ready for production deployment

## Key Decisions
- **Tech Stack Confirmed**: Vue 3 with TypeScript, Vue Router for routing, Tailwind CSS for styling
- **Current Architecture**: Single-page application with 8 existing routes, footer with Features/Resources columns
- **Service Nature**: Document attestation service using social authentication, client-side processing
- **Privacy Focus**: Documents never leave user's device, only hashes are processed server-side
- **Legal Jurisdiction**: Germany-based (Oliver Jägle, Lorsch), worldwide usage - requires GDPR compliance
- **Business Model**: Free service targeting individuals
- **Data Collection**: Anonymous usage metrics only
- **Social Auth**: Multiple providers, sign-in only (not deeply integrated)
- **Tone**: Relaxed, individual-friendly (not corporate)
- **Contact Email**: seal.codes.legal@beimir.net
- **Analytics**: PostHog for anonymous usage metrics
- **Data Storage**: No cookies, localStorage for app settings only, JWT-based temporary auth
- **Data Retention**: No document data stored, user data deleted on sign-out
- **Hosting**: EU-central (GDPR-friendly)
- **Footer Structure**: Replace Features section with Legal section
- **Social Auth Privacy**: Dedicated section in privacy policy
- **Languages**: German and English versions needed
- **UI/UX**: Improved typography with proper spacing, removed redundant navigation, clean design

## Notes
**Current Webapp Structure:**
- Vue 3 SPA with Vue Router
- Existing routes: home, document, faq, auth-callback, sealed-document, verification, hackathon, not-found
- Footer has Features and Resources columns with placeholder links
- Internationalization support with vue-i18n
- Client-side document processing with privacy focus

**Service Characteristics:**
- Social authentication-based document attestation
- QR code generation for document verification
- No traditional PKI/certificate-based signatures
- Privacy-first approach (client-side processing)
- Targets gap between no verification and legal-grade signatures

**Final Legal Requirements:**
- **Required Pages**: Impressum, Privacy Policy, Terms of Service, Disclaimer
- **URL Structure**: /legal/impressum, /legal/privacy, /legal/terms, /legal/disclaimer
- **Languages**: German (primary) and English
- **Footer**: Replace "Features" section with "Legal" section
- **Privacy Policy**: Dedicated section for social auth provider privacy
- **No Cookie Banner**: Not needed (no cookies used)
- **Tone**: Relaxed, individual-friendly (not corporate)

---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
