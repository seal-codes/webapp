# seal.codes

## The Digital Seal for the Modern Age

Since ancient times, humans have used visible marks of authenticity—like royal seals pressed into wax—to establish trust in documents. These seals instantly communicated who stood behind a document and protected against unauthorized modifications.

In our digital world, we've developed far more sophisticated authentication technologies, yet ironically, we rarely use them in everyday communications. Most digital content is shared without any verification of its source or integrity, eroding trust in our digital interactions.

Despite the importance of establishing document authenticity, traditional digital signatures remain underutilized due to significant barriers:

1. **Technical Complexity**: They require understanding cryptographic concepts that most people don't have
2. **Infrastructure Burden**: Users must maintain private keys or certificates
3. **Cost Barriers**: Many solutions require paid subscriptions or specialized hardware
4. **Fragmented Ecosystem**: Different document formats use different signing mechanisms
5. **Accessibility Issues**: Not everyone has access to formal digital signature tools

As a result, most people continue to share documents without proper authentication, leading to potential disputes over document origin, ownership, and integrity.

seal.codes brings back the concept of the visible seal for the digital age. Like a royal seal that was immediately recognizable and difficult to forge, our QR code attestations provide a visible mark of authenticity that connects digital content to your established online identity.

And just as a royal seal maker never needed to read the contents of a private document to authenticate it, seal.codes prioritizes privacy—your documents never leave your device. We only process the document's unique fingerprint, ensuring your sensitive information remains private while still providing robust verification.

Unlike traditional digital signatures that remain invisible and technical, seal.codes creates a prominent visual element that says, "This is mine. I created this." And like ancient seals that could be verified by examining their unique patterns, our QR codes can be easily scanned to verify authenticity.

## Solution: Social Authentication-Based Document Attestation

seal.codes provides a simple, accessible way for anyone to prove ownership of digital content by leveraging existing social identities. Rather than implementing complex cryptographic signatures, we create a verifiable attestation that links:

1. A specific document (via multiple hash methods)
2. A user's established social identity
3. A specific point in time

This attestation is encoded in a QR code that becomes an integral part of the document itself through a specialized embedding process. The embedding method varies by document type to ensure both the integrity of the original content and the verifiability of the attestation.

## How It's Different from Traditional Digital Signatures

| Feature | Traditional Digital Signatures | seal.codes |
|---------|--------------------------------|------------|
| **Trust Model** | Based on certificate authorities and PKI | Based on social identity providers |
| **User Requirements** | Private key management | Existing social account |
| **Technical Knowledge** | Requires understanding of certificates | Minimal technical knowledge needed |
| **Verification Process** | Cryptographic verification | Social identity verification |
| **Security Level** | High cryptographic security | Social account security |
| **Revocation** | Certificate revocation lists | Based on social account access |
| **Legal Standing** | Often legally recognized | Provides evidence of association |
| **Cost** | Often requires paid services | Free or low-cost |
| **Complexity** | High | Low |

## Target Use Cases

seal.codes is designed to fill the gap between no verification at all and complex legal-grade digital signatures. Here are detailed use cases where this solution provides real value:

### Creative Content Protection

- **Digital Artists**: Add attestation to artwork before posting online, establishing a timestamp of ownership and deterring unauthorized use
- **Photographers**: Embed attestation in photos before sharing with clients or on social media platforms
- **Writers and Bloggers**: Establish ownership of written content before publication or submission
- **Graphic Designers**: Protect design concepts and mockups when sharing with potential clients
- **Musicians**: Attest original compositions / scores before distribution

### Educational Applications

- **Student Assignments**: Students can attest their work before submission, reducing plagiarism disputes
- **Teaching Materials**: Educators can verify authorship of original content shared with students
- **Research Drafts**: Researchers can establish priority on ideas before formal publication
- **Academic Collaborations**: Document contributions from multiple authors with clear attribution
- **Portfolio Work**: Students can build verifiable portfolios of their academic achievements

### Business Communications

- **Proposals and Quotes**: Small businesses can send proposals with simple verification of origin
- **Freelance Deliverables**: Freelancers can attest work before sending to clients
- **Design Mockups**: Designers can protect concept work shared during pitches
- **Informal Agreements**: Add a layer of verification to agreements that don't require legal signatures
- **Digital Receipts**: Businesses can provide verifiable proof of transactions

### Community and Social Contexts

- **Community Documents**: Verify who created shared resources and when
- **Social Media Content**: Add verification to content before it potentially goes viral
- **Digital Collectibles**: Add provenance information to digital collectibles

### Online Transactions

- **Marketplace Listings**: Sellers can attest to ownership of items being sold online
- **Product Documentation**: Verify authenticity of product information and manuals
- **Condition Reports**: Document the condition of items at a specific point in time
- **Transfer of Ownership**: Create simple records when transferring digital assets
- **Proof of Sending**: Document that specific information was shared at a certain time

### Personal Documentation

- **Important Records**: Add attestation to copies of important personal documents
- **Travel Documents**: Add a layer of verification to copies of travel documents
- **Portfolio Materials**: Create verifiable portfolios of work and achievements
- **Digital Legacy**: Establish ownership of digital assets for estate planning
- **Event Documentation**: Verify the authenticity of event records and memorabilia

## Key Benefits

- **Zero Learning Curve**: If you can log in to a social account, you can use seal.codes
- **No New Accounts**: Uses existing social identities rather than creating new credentials
- **Self-Contained Verification**: QR codes contain all necessary verification data
- **Offline Verification**: Basic verification can be performed without internet access
- **Transparent**: Clear indication of what is being verified (social identity, not legal identity)
- **Extensible**: Framework allows for adding stronger identity providers in the future
- **Resilient to Compression**: Multi-layered hash approach handles image compression

## How It Works

1. **Upload**: User uploads a document to the seal.codes web application
2. **Authenticate**: User logs in with their preferred social identity provider
3. **Process**: The system prepares the document for attestation using format-specific methods
4. **Generate**: The system creates a QR code containing:
   - A cryptographic hash of the document
   - A perceptual hash for compression resilience
   - The user's verified social identity information
   - A timestamp
   - A cryptographic signature from seal.codes
   - optionally a URL provided by the signee (e. g. Instragram profile)
5. **Embed**: The QR code is embedded into the document using format-specific techniques. It is supposed to be visible
6. **Verify**: Anyone can scan the QR code to verify the document's integrity and associated social identity

## Document Integration Techniques

The integration of the attestation QR code with the document is a critical aspect of seal.codes. We use different techniques based on document type to ensure the attestation is inseparable from the content it verifies:

### PDF Documents

For PDF documents, we use a layered approach:

1. **Two-Phase Process**:
   - First, we calculate the hash of the original PDF
   - Then, we add a new layer containing the QR code attestation

2. **Layer Separation**:
   - The QR code exists on a separate layer from the document content
   - This allows verification software to temporarily hide the QR layer during hash verification

3. **Verification Process**:
   - The verification tool extracts the attestation data from the QR code
   - It temporarily hides the QR code layer
   - It calculates the hash of the remaining document content
   - It compares this hash with the one stored in the attestation

### Images and Photos

For images, we use an "exclusion zone" approach:

1. **Deterministic Modification**:
   - The user selects where to place the QR code (typically a corner)
   - The system records the exact coordinates and dimensions of this area
   - The system fills this area with a solid color
   - The hash is calculated on this modified image (with the solid-color area)
   - The QR code is then placed in this area

2. **Metadata Storage**:
   - The coordinates, dimensions, and fill color are stored in the image metadata
   - The attestation data is also stored in the metadata as a backup

3. **Verification Process**:
   - The verification tool reads the QR code
   - It replaces the QR code area with the same solid color used during signing
   - It calculates the hash of this modified image
   - It compares with the hash in the attestation

For images that support layers (PSD, TIFF, etc.), we also offer a layer-based approach similar to PDFs.

### Other Document Types

For other document formats:

1. **Conversion Option**:
   - Convert to PDF for attestation
   - This provides a stable format for verification

2. **Format-Specific Techniques** (Ideas):
   - For text documents: Append the QR code with clear demarcation
   - For presentations: Add the QR code on a dedicated slide
   - For spreadsheets: Place the QR code in a designated cell area

### Technical Considerations

1. **Hash Calculation Consistency**:
   - The system uses deterministic methods to ensure hash calculation is consistent between signing and verification
   - Format-specific normalization is applied before hashing

2. **Multi-Layered Hash Approach**:
   - Cryptographic hash (SHA-256) for exact verification
   - Perceptual hash for resilience against compression and minor modifications
   - Verification can succeed even if the document has been compressed

3. **QR Code Placement**:
   - Users can choose where to place the QR code
   - Default placements are optimized for each document type

4. **Verification Tools**:
   - Web-based verification tool works across all formats
   - Mobile app allows for quick verification via camera
   - Offline verification is possible with downloaded verification tools, verifying the hash but not the signature when offline

## Future Extensions

While the initial implementation focuses on social authentication, the framework is designed to accommodate stronger identity verification methods in the future, such as:

- Government-issued digital IDs (like German Bund-ID)
- Professional credentials and certifications
- Organizational identity systems

## Limitations and Considerations

seal.codes is transparent about what it does and doesn't provide:

- It verifies access to a social account at a specific time, not legal identity
- The level of trust depends on the recipient's assessment of the social identity
- It does not replace legally-binding signature requirements for formal contracts
- Security is tied to the security of the underlying social accounts

## Getting Started

[Instructions for using the service will be added here]
