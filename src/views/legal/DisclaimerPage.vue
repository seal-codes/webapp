<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import BaseLegalPage from '@/components/legal/BaseLegalPage.vue'

const { t } = useI18n()
</script>

<template>
  <BaseLegalPage :title="t('legal.disclaimer.title')" :last-updated="t('legal.disclaimer.lastUpdated')">
    <h2>Service Disclaimer</h2>
    <p>seal.codes is provided 'as is' without any warranties or guarantees.</p>
    <h2>Not a Legal Signature</h2>
    <p><strong>Important:</strong> seal.codes attestations are NOT legal signatures and do not create legally binding
      obligations. They are simply a way to associate a document with a social identity at a point in time.</p>
    <h2>Technical Limitations</h2>
    <ul>
      <li>QR codes may not scan properly in all conditions</li>
      <li>Document compression may affect verification</li>
      <li>Social authentication depends on third-party services</li>
      <li>Internet connectivity is required for verification</li>
      <li>Technology may have bugs or limitations</li>
    </ul>
    <h2>No Warranty</h2>
    <p>We make no warranties about:</p>
    <ul>
      <li>Service availability or reliability</li>
      <li>Accuracy of attestations</li>
      <li>Compatibility with all devices or software</li>
      <li>Fitness for any particular purpose</li>
    </ul>
    <h2>Limitation of Liability</h2>
    <p>To the maximum extent permitted by law:</p>
    <ul>
      <li>We are not liable for any damages arising from use of the service</li>
      <li>You assume all risks associated with using the service</li>
      <li>Our liability is limited to the amount you paid (which is zero for this free service)</li>
    </ul>
    <h2>User Responsibility</h2>
    <ul>
      <li>You are solely responsible for your document content</li>
      <li>You must comply with applicable laws and regulations</li>
      <li>You should verify the suitability of the service for your needs</li>
      <li>You should maintain backups of important documents</li>
    </ul>
    <h2>Third-Party Services</h2>
    <p>We integrate with social authentication providers and other services. We are not responsible for their
      availability, policies, or actions.</p>
    <h2>Force Majeure</h2>
    <p>We are not liable for service interruptions due to circumstances beyond our control, including natural disasters,
      government actions, or technical failures.</p>
    <h2>Indemnification</h2>
    <p>You agree to indemnify us against claims arising from your use of the service or violation of these terms.</p>
    <h2>Contact</h2>
    <p>For questions about this disclaimer: seal.codes.legal@beimir.net</p>
  </BaseLegalPage>
</template>
