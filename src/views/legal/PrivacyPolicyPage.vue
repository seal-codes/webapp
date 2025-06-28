<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import BaseLegalPage from '@/components/legal/BaseLegalPage.vue'

const { t } = useI18n()
</script>

<template>
  <BaseLegalPage :title="t('legal.privacy.title')" :last-updated="t('legal.privacy.lastUpdated')">
    <h2>Data Controller</h2>
    <p>Oliver Jägle<br>Am Wiesenteich 10<br>64653 Lorsch<br>Germany<br>Email: seal.codes.legal@beimir.net</p>
    <h2>What We Do</h2>
    <p>seal.codes is a free service that helps you add QR code attestations to your documents. We prioritize your
      privacy - your documents never leave your device.</p>
    <h2>Data We Collect</h2>
    <h3>Social Authentication Data</h3>
    <p>When you sign in with a social provider (Google, GitHub, etc.), we temporarily receive:</p>
    <ul>
      <li>Your verified identity information (name, email)</li>
      <li>Authentication tokens (JWT) for verification</li>
    </ul>
    <p><strong>Important:</strong> This data is only stored temporarily during your session and is deleted when you sign
      out.</p>
    <h3>Document Processing</h3>
    <p>We process:</p>
    <ul>
      <li>Cryptographic hashes (fingerprints) of your documents</li>
      <li>QR code generation data</li>
    </ul>
    <p><strong>Your actual documents never leave your device.</strong> We only work with mathematical fingerprints.</p>
    <h3>Usage Analytics</h3>
    <p>We collect anonymous usage statistics via PostHog to understand how the service is used:</p>
    <ul>
      <li>Page views and user interactions</li>
      <li>Error reports and performance metrics</li>
      <li>No personal identification data</li>
    </ul>
    <h3>Local Storage</h3>
    <p>We store app settings in your browser's local storage (no personal data).</p>
    <h2>Social Authentication Providers</h2>
    <p>When you use social sign-in, you're also subject to the privacy policies of those providers:</p>
    <ul>
      <li>Google: <a href='https://policies.google.com/privacy'>Google Privacy Policy</a></li>
      <li>GitHub: <a href='https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement'>GitHub
          Privacy Statement</a></li>
      <li>Other providers: Please review their respective privacy policies</li>
    </ul>
    <p>We only use these services for authentication - there's no deep integration or additional data sharing.</p>
    <h2>Legal Basis (GDPR)</h2>
    <ul>
      <li><strong>Social Authentication:</strong> Your consent (Art. 6(1)(a) GDPR)</li>
      <li><strong>Service Provision:</strong> Legitimate interest (Art. 6(1)(f) GDPR)</li>
      <li><strong>Analytics:</strong> Legitimate interest for service improvement</li>
    </ul>
    <h2>Data Retention</h2>
    <ul>
      <li><strong>User Data:</strong> Deleted when you sign out</li>
      <li><strong>Document Hashes:</strong> Not stored permanently</li>
      <li><strong>Analytics:</strong> Anonymized, retained for service improvement</li>
    </ul>
    <h2>Your Rights (GDPR)</h2>
    <p>You have the right to:</p>
    <ul>
      <li>Access your data</li>
      <li>Rectify incorrect data</li>
      <li>Erase your data</li>
      <li>Data portability</li>
      <li>Object to processing</li>
      <li>Lodge a complaint with supervisory authorities</li>
    </ul>
    <h2>Data Security</h2>
    <p>We use industry-standard security measures:</p>
    <ul>
      <li>HTTPS encryption</li>
      <li>EU-based hosting (EU-Central region)</li>
      <li>Minimal data collection</li>
      <li>Regular security updates</li>
    </ul>
    <h2>International Transfers</h2>
    <p>
      Your data is processed within the EU (EU-Central hosting region). No international transfers outside the EU occur.
    </p>
    <h2>Contact</h2>
    <p>For privacy concerns or to exercise your rights:<br>Email: seal.codes.legal@beimir.net</p>
    <h2>Changes to This Policy</h2>
    <p>We may update this privacy policy. Significant changes will be communicated through the service.</p>
  </BaseLegalPage>
</template>
