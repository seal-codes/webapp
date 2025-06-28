<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import BaseLegalPage from '@/components/legal/BaseLegalPage.vue'

const { t } = useI18n()
</script>

<template>
  <BaseLegalPage 
    :title="t('legal.terms.title')" 
    :last-updated="t('legal.terms.lastUpdated')"
  >
    <div v-html="t('legal.terms.content')" />
  </BaseLegalPage>
</template>
