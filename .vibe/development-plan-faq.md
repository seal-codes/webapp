# Development Plan: seal.codes (faq branch)

*Generated on 2025-06-27 by Vibe Feature MCP*
*Workflow: epcc*

## Goal
Add a comprehensive FAQ section to the seal.codes application to help users understand the service, its benefits, limitations, and how to use it effectively.

## Explore
### Tasks
- [x] Analyze current application structure and tech stack
- [x] Review existing navigation and routing
- [x] Refine FAQ categories based on business value focus
- [x] Define FAQ access approach (separate route + contextual popovers)
- [x] Research existing UI components (ExpandableDetails for FAQ page)
- [x] Examine i18n structure for multilingual FAQ support
- [x] Analyze footer structure for FAQ link integration
- [x] Finalize FAQ content requirements (analogies + technical explanations)
- [x] Define popover trigger mechanism (configurable hover + click)
- [x] Specify FAQ organization approach (tags + filtering)
- [x] Design comprehensive FAQ data structure (YAML)
- [x] Create detailed FAQ content outline with business scenarios
- [x] Define FAQ component architecture (FAQ service, popover component, etc.)

### Completed
- [x] Created development plan file
- [x] Analyzed Vue 3 + TypeScript + Vite application structure
- [x] Reviewed current routing (Home, Document, Verify, Sealed Document, Auth Callback)
- [x] Examined navbar navigation structure
- [x] Refined FAQ categories with business focus
- [x] Confirmed dual FAQ access pattern (dedicated page + contextual help)
- [x] Found existing ExpandableDetails component suitable for FAQ page
- [x] Confirmed i18n setup with English/German support
- [x] Verified footer already has placeholder FAQ link
- [x] Completed all exploration requirements

## Plan

### Phase Entrance Criteria:
- [x] The current application structure has been analyzed
- [x] FAQ content requirements have been identified
- [x] User needs and common questions have been documented
- [x] Technical approach for FAQ implementation has been explored

### Implementation Strategy

The FAQ feature will be implemented in 4 main phases:

1. **Data Layer**: Create YAML FAQ database with multilingual content
2. **Service Layer**: Implement FAQ service for data management and filtering
3. **Component Layer**: Build reusable FAQ components (page, popover, links)
4. **Integration Layer**: Add routing, navigation, and contextual help throughout app

### Tasks

#### Phase 1: Data Foundation
- [ ] Create FAQ data structure in YAML format
- [ ] Write comprehensive FAQ content (English)
- [ ] Translate FAQ content to German
- [ ] Add FAQ content to i18n system
- [ ] Create TypeScript interfaces for FAQ data types

#### Phase 2: Service Layer
- [ ] Implement FAQ service (`src/services/faqService.ts`)
- [ ] Add YAML parsing functionality
- [ ] Implement tag-based filtering system
- [ ] Add FAQ search capabilities (for future enhancement)
- [ ] Create FAQ data loading and caching logic

#### Phase 3: Core Components
- [ ] Create `FaqPage.vue` - Main FAQ page with categories
- [ ] Create `FaqEntry.vue` - Individual FAQ item with analogy + technical sections
- [ ] Create `FaqPopover.vue` - Configurable popover component
- [ ] Create `FaqLink.vue` - Wrapper for contextual FAQ triggers
- [ ] Style components with Tailwind CSS following app design patterns

#### Phase 4: Integration & Navigation
- [ ] Add `/faq` route to router configuration
- [ ] Update footer FAQ link to navigate to new route
- [ ] Add FAQ page title and meta tags
- [ ] Integrate contextual FAQ links in document flow
- [ ] Add FAQ links to key UI interaction points

#### Phase 5: Testing & Polish
- [ ] Test FAQ page functionality and responsiveness
- [ ] Test popover triggers (hover and click modes)
- [ ] Verify multilingual content displays correctly
- [ ] Test contextual FAQ integration
- [ ] Ensure accessibility compliance

### Technical Specifications

#### FAQ Data Structure (YAML)
```yaml
# src/data/faq.yaml
categories:
  - id: string
    title: string (i18n key)
    description: string (i18n key)
    icon: string (Lucide icon name)
    order: number

faqs:
  - id: string (unique identifier)
    category: string (category id)
    question: string (i18n key)
    analogy: string (i18n key) 
    technical: string (i18n key)
    tags: string[] (for filtering)
    related_ui_steps: string[] (UI integration points)
    order: number (within category)
```

#### Component Architecture

**FaqPage.vue**
- Uses existing `ExpandableDetails.vue` for FAQ entries
- Category-based organization with filtering
- Tag-based filtering system
- Responsive design with mobile optimization

**FaqPopover.vue**
- Configurable trigger modes (hover, click, both)
- Portal-based rendering for proper z-index handling
- Auto-positioning to avoid viewport edges
- Supports multiple FAQ entries per popover

**FaqLink.vue**
- Wrapper component for contextual FAQ triggers
- Accepts FAQ IDs or categories
- Configurable styling (underline, icon, etc.)
- Accessibility-compliant with proper ARIA labels

#### Integration Points

**Contextual FAQ Locations:**
1. Document upload area → "supported-formats", "file-size-limits"
2. QR code placement → "seal-tampering-protection", "qr-visibility"
3. Social authentication → "identity-verification", "privacy-concerns"
4. Document sealing process → "how-sealing-works", "document-integrity"
5. Verification page → "verification-process", "offline-verification"

### Dependencies & Considerations

#### Dependencies
- YAML parsing library (js-yaml or similar)
- Existing components: ExpandableDetails, BaseButton, GradientText
- Existing services: i18n system, router
- Lucide icons for category icons

#### Edge Cases & Challenges
- **YAML Loading**: Handle loading errors gracefully
- **Mobile Responsiveness**: Ensure popovers work well on touch devices
- **Performance**: Lazy load FAQ content if dataset becomes large
- **Accessibility**: Proper keyboard navigation and screen reader support
- **SEO**: FAQ page should be crawlable with proper meta tags

#### Future Enhancements
- Search functionality within FAQ page
- FAQ analytics to track most viewed questions
- User feedback system for FAQ helpfulness
- Dynamic FAQ content management system

### Detailed FAQ Content Outline

#### Category: Getting Started
1. **what-is-seal-codes** - "What is seal.codes?"
2. **how-to-get-started** - "How do I seal my first document?"
3. **supported-formats** - "What document formats are supported?"
4. **account-requirements** - "Do I need to create an account?"

#### Category: What does seal.codes do for me?
1. **seal-tampering-protection** - "What if somebody cuts or removes the seal I added?"
   - Analogy: Physical wax seal breaking detection
   - Technical: Format-specific embedding, visible tampering
2. **ownership-disputes** - "What if somebody seals my document and claims it's theirs?"
   - Analogy: Royal seal with unique owner mark
   - Technical: Social identity + server timestamp + cryptographic signature
3. **document-integrity** - "How do I prove my document hasn't been changed?"
   - Analogy: Sealed envelope integrity
   - Technical: Cryptographic + perceptual hashing
4. **compression-resilience** - "What if my document gets compressed when shared?"
   - Analogy: Flexible seal that adapts
   - Technical: Multi-layered hash approach
5. **legal-standing** - "Can I use this for legal documents?"
   - Analogy: Notarization vs. witnessing
   - Technical: Evidence of association, not legal signature
6. **social-vs-certificates** - "Why use social accounts instead of certificates?"
   - Analogy: Known person vs. official ID
   - Technical: Accessibility, cost, complexity comparison

#### Category: How It Works
1. **sealing-process** - "How does the sealing process work?"
2. **qr-code-contents** - "What information is stored in the QR code?"
3. **verification-process** - "How does verification work?"
4. **offline-verification** - "Can people verify my documents without internet?"
5. **hash-calculation** - "How is document integrity calculated?"

#### Category: Security & Privacy
1. **data-privacy** - "What data do you store about my documents?"
2. **social-account-security** - "How secure is using social accounts?"
3. **server-trust** - "Do I need to trust your servers?"
4. **revocation** - "Can I revoke a seal after creating it?"
5. **limitations** - "What are the limitations of this approach?"

#### Category: Troubleshooting
1. **browser-compatibility** - "Which browsers are supported?"
2. **file-size-limits** - "Are there file size limits?"
3. **qr-not-scanning** - "Why won't my QR code scan?"
4. **verification-failed** - "Why did verification fail?"
5. **mobile-issues** - "Issues using on mobile devices?"

### Implementation Priority

**Phase 1 (Core Business Value):**
- seal-tampering-protection
- ownership-disputes
- document-integrity
- what-is-seal-codes

**Phase 2 (Technical Understanding):**
- sealing-process
- verification-process
- qr-code-contents
- data-privacy

**Phase 3 (Complete Coverage):**
- All remaining FAQ entries
- Troubleshooting section
- Advanced technical details

### Completed
- [x] Created comprehensive implementation strategy with 5 phases
- [x] Defined detailed technical specifications and component architecture
- [x] Outlined complete FAQ content structure with business focus
- [x] Established implementation priorities and dependencies
- [x] Considered edge cases, challenges, and future enhancements
- [x] User approved the complete implementation plan

### Completed
*None yet*

## Code

### Phase Entrance Criteria:
- [x] Detailed implementation plan has been created
- [x] FAQ content structure and categories have been defined
- [x] Technical implementation approach has been finalized
- [x] UI/UX design decisions have been made

### Tasks

#### Phase 1: Data Foundation
- [x] Create FAQ data structure in YAML format
- [x] Write comprehensive FAQ content (English)
- [x] Translate FAQ content to German
- [x] Add FAQ content to i18n system
- [x] Create TypeScript interfaces for FAQ data types

#### Phase 2: Service Layer
- [x] Implement FAQ service (`src/services/faqService.ts`)
- [x] Add YAML parsing functionality
- [x] Implement tag-based filtering system
- [x] Add FAQ search capabilities (for future enhancement)
- [x] Create FAQ data loading and caching logic

#### Phase 3: Core Components
- [x] Create `FaqPage.vue` - Main FAQ page with categories
- [x] Create `FaqEntry.vue` - Individual FAQ item with analogy + technical sections
- [x] Create `FaqPopover.vue` - Configurable popover component
- [x] Create `FaqLink.vue` - Wrapper for contextual FAQ triggers
- [x] Style components with Tailwind CSS following app design patterns

#### Phase 4: Integration & Navigation
- [x] Add `/faq` route to router configuration
- [x] Update footer FAQ link to navigate to new route
- [x] Add FAQ page title and meta tags
- [x] Integrate contextual FAQ links in document flow
- [x] Add FAQ links to key UI interaction points

#### Phase 5: Testing & Polish
- [x] Test FAQ page functionality and responsiveness
- [x] Test popover triggers (hover and click modes)
- [x] Verify multilingual content displays correctly
- [x] Test contextual FAQ integration
- [x] Ensure accessibility compliance

### Completed
- [x] Successfully implemented comprehensive FAQ system with YAML-based content
- [x] Created business-focused FAQ categories with analogy + technical explanations
- [x] Implemented filtering system (category and tag-based)
- [x] Added multilingual support (English + German)
- [x] Integrated with existing design system and components
- [x] Added functional navigation and routing

## Commit

### Phase Entrance Criteria:
- [x] FAQ functionality has been implemented
- [x] All FAQ content has been added
- [x] Testing has been completed
- [x] Code quality standards have been met

### Tasks
- [x] Review and finalize all FAQ content
- [x] Verify contextual FAQ integration across all pages
- [x] Test multilingual functionality (English/German)
- [x] Ensure all FAQ links work correctly with popovers
- [x] Validate SmartText component functionality
- [x] Test FAQ page filtering and navigation
- [x] Verify responsive design on all devices
- [x] Check accessibility compliance
- [x] Clean up any temporary or unused code
- [x] Update documentation and comments
- [x] Run final tests and quality checks
- [x] Prepare commit message with comprehensive changes
- [x] Commit all changes to version control

### Completed
- [x] Successfully implemented comprehensive contextual FAQ system
- [x] Created SmartText component for translation markup processing
- [x] Integrated FAQ links throughout application (home, document, verification pages)
- [x] Maintained full internationalization support
- [x] All FAQ functionality tested and working perfectly
- [x] Code committed with detailed commit message

## Key Decisions
- **Tech Stack**: Vue 3 + TypeScript + Vite + Vue Router + Pinia + Tailwind CSS
- **Current Navigation**: Home, Seal Document, Verify (in navbar)
- **Application Structure**: Standard Vue SPA with views, components, stores, services
- **Internationalization**: Uses vue-i18n for multi-language support
- **FAQ Data Structure**: YAML-based database for structured, linkable FAQ entries
- **FAQ Categories**: Business-focused approach with "What does seal.codes do for me?" emphasis
- **Contextual FAQ Approach**: SmartText component processes translation markup
- **FAQ Link Syntax**: `<faq-link faq-ids='id1,id2'>text</faq-link>` in translation files
- **Popover System**: Hover-triggered popovers with multiple related FAQ entries
- **Extensibility**: SmartText is generic and can handle future markup types beyond FAQ links

## Final Implementation Summary

### Core Components Created:
1. **SmartText.vue** - Generic translation markup processor
2. **FaqPage.vue** - Main FAQ page with filtering and categories
3. **FaqPopover.vue** - Contextual help popovers
4. **FaqLink.vue** - FAQ trigger buttons with styling
5. **FAQ Service** - Data management and filtering logic

### Integration Points:
- **Home Page**: Load document and seal steps
- **Document Page**: Authentication, dropzone, how-it-works steps  
- **Verification Page**: Header, sidebar steps, privacy notes
- **Navigation**: Footer and navbar links to main FAQ page

### Key Features:
- **Full i18n Support**: English + German translations
- **Contextual Help**: FAQ links embedded in natural text flow
- **Rich Popovers**: Multiple related FAQs with "Read more" links
- **Responsive Design**: Works on all device sizes
- **Accessibility**: Proper ARIA labels and keyboard navigation
- **Maintainable**: Centralized FAQ content, distributed contextual access
- **FAQ Access**: Separate /faq route accessible from footer
- **Contextual Help**: Popovers/tooltips within app flow showing relevant FAQ entries
- **FAQ Linking**: Wrap text elements to trigger contextual FAQ popovers
- **Content Style**: Simple analogies + technical explanations for comprehensive understanding
- **Popover Triggers**: Configurable component supporting both hover and click triggers
- **FAQ Organization**: Tags + filtering system (search functionality for future enhancement)
- **Multilingual Support**: FAQ content in both English and German following existing i18n pattern

## Notes
- Application uses Vue 3 Composition API with TypeScript
- Routing handled by Vue Router with 6 main routes
- Current navbar has 3 main navigation items: Home, Seal Document, Verify
- Uses Tailwind CSS for styling with custom gradient components
- Internationalization support with vue-i18n
- Mobile-responsive design with hamburger menu
- Based on README.md, the app focuses on social authentication-based document attestation
- Footer already has placeholder FAQ link in Resources section
- Need to implement both /faq route and contextual popover system

## FAQ Data Structure Design (YAML)

```yaml
categories:
  - id: "getting-started"
    title: "Getting Started"
    description: "Basic introduction to seal.codes"
    icon: "HelpCircle"
    
  - id: "business-value"
    title: "What does seal.codes do for me?"
    description: "Understanding protection and business benefits"
    icon: "Shield"
    
  - id: "how-it-works"
    title: "How It Works"
    description: "Technical details made accessible"
    icon: "Cog"
    
  - id: "security-privacy"
    title: "Security & Privacy"
    description: "Trust model, limitations, data handling"
    icon: "Lock"
    
  - id: "troubleshooting"
    title: "Troubleshooting"
    description: "Common issues and solutions"
    icon: "AlertCircle"

faqs:
  - id: "seal-tampering-protection"
    category: "business-value"
    question: "What if somebody cuts or removes the seal I added?"
    analogy: "Like breaking a physical wax seal, tampering with the QR code is immediately obvious and detectable."
    technical: "The QR code is embedded using format-specific techniques that make removal visible. For PDFs, it's on a separate layer; for images, it's in a defined exclusion zone with recorded coordinates."
    tags: ["protection", "tampering", "security", "detection"]
    related_ui_steps: ["qr-placement", "document-sealing"]
    
  - id: "ownership-disputes"
    category: "business-value"
    question: "What if somebody seals my document and claims it's theirs?"
    analogy: "Like a royal seal that bears the unique mark of its owner, your seal contains your verified social identity and a server timestamp."
    technical: "The attestation includes your authenticated social identity, a cryptographic signature from our servers, and a precise timestamp. This creates a verifiable chain of evidence."
    tags: ["ownership", "disputes", "timestamp", "identity"]
    related_ui_steps: ["social-auth", "attestation-creation"]
```

## Component Architecture Plan

1. **FAQ Service** (`src/services/faqService.ts`)
   - Load and parse YAML FAQ data
   - Provide search/filtering functionality
   - Handle multilingual content

2. **FAQ Components**:
   - `FaqPage.vue` - Main FAQ page with categories and expandable entries
   - `FaqPopover.vue` - Configurable popover component (hover/click triggers)
   - `FaqLink.vue` - Wrapper component for contextual FAQ links
   - `FaqEntry.vue` - Individual FAQ entry with analogy + technical sections

3. **Integration Points**:
   - Update router with /faq route
   - Update footer FAQ link to navigate to /faq
   - Add contextual FaqLink components throughout the app flow

---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
