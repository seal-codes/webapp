<template>
  <span>
    <template v-for="(part, index) in textParts" :key="index">
      <FaqLink
        v-if="part.type === 'faq-link'"
        :faq-ids="part.faqIds"
        :trigger="trigger"
        :variant="variant"
        :show-icon="false"
      >
        {{ part.text }}
      </FaqLink>
      <!-- Future: Add other component types here -->
      <!-- <SomeOtherComponent v-else-if="part.type === 'other-component'" ... /> -->
      <span v-else>{{ part.text }}</span>
    </template>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import FaqLink from './FaqLink.vue'
import type { PopoverTrigger } from '@/types/faq'

interface Props {
  translationKey: string
  trigger?: PopoverTrigger
  variant?: 'underline' | 'subtle' | 'button' | 'plain'
}

const props = withDefaults(defineProps<Props>(), {
  trigger: 'hover',
  variant: 'underline',
})

const { t } = useI18n()

interface TextPart {
  text: string
  type: 'text' | 'faq-link' // | 'other-component' - extensible for future markup types
  faqIds?: string[]
  // Future: Add other component-specific properties
}

const textParts = computed(() => {
  const text = t(props.translationKey)
  
  // If no markup, return plain text
  if (!hasMarkup(text)) {
    return [{ text, type: 'text' as const }]
  }

  return processMarkup(text)
})

function hasMarkup(text: string): boolean {
  // Check for any supported markup types
  return text.includes('<faq-link')
  // Future: || text.includes('<other-component')
}

function processMarkup(text: string): TextPart[] {
  const parts: TextPart[] = []
  let remainingText = text
  
  // Process FAQ links
  remainingText = processFaqLinks(remainingText, parts)
  
  // Future: Process other markup types
  // remainingText = processOtherComponents(remainingText, parts)
  
  // Add any remaining text
  if (remainingText) {
    parts.push({ text: remainingText, type: 'text' })
  }
  
  return parts.length > 0 ? parts : [{ text, type: 'text' }]
}

function processFaqLinks(text: string, parts: TextPart[]): string {
  let lastIndex = 0
  const faqLinkRegex = /<faq-link\s+faq-ids=['"]([^'"]+)['"]>([^<]+)<\/faq-link>/g
  let match
  
  while ((match = faqLinkRegex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push({
        text: text.slice(lastIndex, match.index),
        type: 'text'
      })
    }
    
    // Add the FaqLink
    const faqIds = match[1].split(',').map(id => id.trim())
    const content = match[2]
    
    parts.push({
      text: content,
      type: 'faq-link',
      faqIds
    })
    
    lastIndex = match.index + match[0].length
  }
  
  // Return remaining text after all FAQ links
  return text.slice(lastIndex)
}
</script>
