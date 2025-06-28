<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import BaseLegalPage from '@/components/legal/BaseLegalPage.vue'

const { t } = useI18n()
</script>

<template>
  <BaseLegalPage :title="t('legal.terms.title')" :last-updated="t('legal.terms.lastUpdated')">
    <h2>Welcome to seal.codes!</h2>
    <p>
      These terms explain what seal.codes does and what we expect from each other. We've tried to keep it simple and
      friendly.
    </p>
    <h2>What seal.codes Does</h2>
    <p>
      seal.codes helps you add QR code attestations to your documents. Think of it like a digital stamp that says 'this
      document was associated with this social identity at this time.'
    </p>
    <p>
      <strong>Important:</strong> This is NOT a legal signature. It's a way to add a layer of verification to your
      documents, but it doesn't replace legally binding signatures where required.
    </p>
    <h2>What You Can Expect From Us</h2>
    <ul>
      <li>A free service that respects your privacy</li>
      <li>Your documents stay on your device - we never see them</li>
      <li>We'll do our best to keep the service running smoothly</li>
      <li>Clear communication about what we do and don't do</li>
    </ul>
    <h2>What We Expect From You</h2>
    <ul>
      <li>Don't upload illegal content or use the service for illegal purposes</li>
      <li>Don't try to break or abuse the service</li>
      <li>Understand that this isn't a legal signature</li>
      <li>Take responsibility for your own document content</li>
    </ul>
    <h2>Service Limitations</h2>
    <p>We provide seal.codes 'as is' without guarantees:</p>
    <ul>
      <li>The service might be unavailable sometimes</li>
      <li>We can't guarantee perfect reliability</li>
      <li>Technology has limitations - QR codes might not work in all situations</li>
      <li>We're not responsible for how others interpret your attestations</li>
    </ul>
    <h2>Your Responsibility</h2>
    <ul>
      <li>You're responsible for the content of documents you process</li>
      <li>You decide how to use and share your sealed documents</li>
      <li>You understand the limitations of the service</li>
      <li>You comply with applicable laws in your jurisdiction</li>
    </ul>
    <h2>Liability Limitations</h2>
    <p>Since this is a free service with inherent limitations:</p>
    <ul>
      <li>We're not liable for damages from using the service</li>
      <li>You use the service at your own risk</li>
      <li>Our liability is limited to the maximum extent allowed by law</li>
      <li>We're not responsible for third-party actions or interpretations</li>
    </ul>
    <h2>Changes to the Service</h2>
    <p>We might need to:</p>
    <ul>
      <li>Update or change features</li>
      <li>Temporarily suspend the service for maintenance</li>
      <li>Modify these terms (we'll let you know about significant changes)</li>
    </ul>
    <h2>Termination</h2>
    <p>You can stop using the service anytime. We might need to suspend access if these terms are violated.</p>
    <h2>Governing Law</h2>
    <p>These terms are governed by German law. Any disputes will be resolved in German courts.</p>
    <h2>Contact</h2>
    <p>Questions about these terms? Email us at: seal.codes.legal@beimir.net</p>
    <p><em>Thanks for using seal.codes responsibly!</em></p>
  </BaseLegalPage>
</template>
