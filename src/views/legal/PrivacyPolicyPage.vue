<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import BaseLegalPage from '@/components/legal/BaseLegalPage.vue'

const { t } = useI18n()
</script>

<template>
  <BaseLegalPage :title="t('legal.privacy.title')" :last-updated="t('legal.privacy.lastUpdated')">
    <div v-html="t('legal.privacy.content')" />
  </BaseLegalPage>
</template>
