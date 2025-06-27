<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ImageUp, MapPin, ShieldCheck } from 'lucide-vue-next'
import IconifiedStepDescription from '../components/common/IconifiedStepDescription.vue'
import WaxSealButton from '../components/common/WaxSealButton.vue'
import GradientText from '../components/common/GradientText.vue'
import SmartText from '../components/faq/SmartText.vue'

const router = useRouter()
const { t } = useI18n()

const startProcess = () => {
  router.push('/document')
}
</script>

<template>
  <div class="min-h-screen bg-white">
    <!-- Hero Section -->
    <main class="container mx-auto px-4 py-16 text-center">
      <h1 class="text-6xl font-bold mb-6 leading-normal">
        {{ t('home.hero.title.before') }}
        <gradient-text>{{ t('home.hero.title.seal') }}</gradient-text>
        {{ t('home.hero.title.after') }}
      </h1>
      
      <p class="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
        {{ t('home.hero.subtitle') }}
      </p>
      
      <WaxSealButton 
        :text="t('home.hero.cta')"
        @click="startProcess"
      />
      
      <!-- Process Steps -->
      <div class="grid md:grid-cols-3 gap-8 mt-24">
        <IconifiedStepDescription
          :icon="ImageUp"
          :title="t('home.steps.loadDocument.title')"
        >
          <SmartText translation-key="home.steps.loadDocument.description" />
        </IconifiedStepDescription>
        
        <IconifiedStepDescription
          :icon="MapPin"
          :title="t('home.steps.positionSeal.title')"
          :description="t('home.steps.positionSeal.description')"
        />
        
        <IconifiedStepDescription
          :icon="ShieldCheck"
          :title="t('home.steps.sealIt.title')"
        >
          <SmartText translation-key="home.steps.sealIt.description" />
        </IconifiedStepDescription>
      </div>
    </main>
  </div>
</template>