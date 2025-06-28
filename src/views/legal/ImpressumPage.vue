<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import BaseLegalPage from '@/components/legal/BaseLegalPage.vue'

const { t } = useI18n()
</script>

<template>
  <BaseLegalPage :title="t('legal.impressum.title')">
    <h2>Legal Information according to § 5 TMG</h2>
    <p><strong>Oliver Jägle</strong><br>Am Wiesenteich 10<br>64653 Lorsch<br>Germany</p>
    <h3>Contact</h3>
    <p>Email: seal.codes.legal@beimir.net</p>
    <h3>Responsible for content according to § 55 Abs. 2 RStV</h3>
    <p>Oliver Jägle<br>Am Wiesenteich 10<br>64653 Lorsch<br>Germany</p>
    <h3>Disclaimer</h3>
    <p>
      Despite careful content control, we assume no liability for the content of external links. The operators of the
      linked pages are solely responsible for their content.
    </p>
  </BaseLegalPage>
</template>
