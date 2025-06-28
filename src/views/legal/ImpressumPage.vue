<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import BaseLegalPage from '@/components/legal/BaseLegalPage.vue'

const { t } = useI18n()
</script>

<template>
  <BaseLegalPage :title="t('legal.impressum.title')">
    <div v-html="t('legal.impressum.content')" />
  </BaseLegalPage>
</template>
