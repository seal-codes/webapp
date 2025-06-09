# Internationalization (i18n) Guide

This document explains how internationalization is implemented in seal.codes and how to work with translations.

## Overview

The project uses Vue I18n for internationalization support. Currently supported languages:
- **English (en)** - Default language
- **German (de)** - Full translation

## Architecture

### File Structure
```
src/
├── i18n/
│   ├── index.ts              # i18n configuration and utilities
│   └── locales/
│       ├── en.json           # English translations
│       └── de.json           # German translations
├── components/
│   └── common/
│       └── LanguageSwitcher.vue  # Language selection component
└── types/
    └── i18n.d.ts             # TypeScript definitions
```

### Configuration

The i18n system is configured in `src/i18n/index.ts`:

- **Locale Detection**: Automatically detects user's preferred language from:
  1. localStorage (persisted choice)
  2. Browser language settings
  3. Falls back to English

- **Persistence**: User's language choice is saved to localStorage

- **Type Safety**: Full TypeScript support with defined message schemas

## Usage in Components

### Basic Usage

```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <h1>{{ t('home.hero.title') }}</h1>
  <p>{{ t('home.hero.subtitle') }}</p>
</template>
```

### With Parameters

```vue
<template>
  <!-- Using named parameters -->
  <p>{{ t('verification.details.sealedBy', { name: userName }) }}</p>
  
  <!-- Using HTML content -->
  <h1 v-html="t('home.hero.title', { seal: '<span class=&quot;text-secondary-500&quot;>Seal</span>' })"></h1>
</template>
```

### Language Switcher

The `LanguageSwitcher` component is already integrated into the navbar and provides:
- Flag icons for visual language identification
- Dropdown menu for language selection
- Automatic persistence of user choice

## Translation Files

### Structure

Translation files use nested JSON structure:

```json
{
  "common": {
    "loading": "Loading...",
    "error": "Error"
  },
  "navigation": {
    "home": "Home",
    "sealDocument": "Seal Document"
  }
}
```

### Key Naming Convention

- Use **camelCase** for keys
- Group related translations under common prefixes
- Keep keys descriptive but concise

Examples:
- `common.loading` - Common UI elements
- `document.dropzone.title` - Document-specific UI
- `errors.fileTooBig` - Error messages

## Adding New Languages

### 1. Create Translation File

Create a new JSON file in `src/i18n/locales/`:

```bash
# Example for French
touch src/i18n/locales/fr.json
```

### 2. Add Translations

Copy the structure from `en.json` and translate all values:

```json
{
  "common": {
    "loading": "Chargement...",
    "error": "Erreur"
  }
}
```

### 3. Update Configuration

Add the new locale to `src/i18n/index.ts`:

```typescript
import fr from './locales/fr.json'

export const SUPPORTED_LOCALES = ['en', 'de', 'fr'] as const

export const i18n = createI18n({
  // ...
  messages: {
    en,
    de,
    fr  // Add new locale
  }
})
```

### 4. Update Language Switcher

Add the new language to `LanguageSwitcher.vue`:

```typescript
const languages = {
  en: { name: 'English', flag: '🇺🇸' },
  de: { name: 'Deutsch', flag: '🇩🇪' },
  fr: { name: 'Français', flag: '🇫🇷' }  // Add new language
} as const
```

## Best Practices

### 1. Translation Keys

- **Be Specific**: Use descriptive keys that indicate context
  ```json
  // Good
  "document.dropzone.title": "Drop your document here"
  
  // Avoid
  "title": "Drop your document here"
  ```

- **Group Logically**: Organize keys by feature or component
  ```json
  {
    "auth": {
      "socialProviders": { /* ... */ },
      "processing": "Authenticating...",
      "error": "Authentication failed"
    }
  }
  ```

### 2. Handling Pluralization

For languages with complex plural rules, use Vue I18n's pluralization:

```json
{
  "document.count": "no documents | one document | {count} documents"
}
```

```vue
<template>
  <p>{{ t('document.count', documentCount) }}</p>
</template>
```

### 3. Date and Number Formatting

Configure locale-specific formatting in the i18n setup:

```typescript
export const i18n = createI18n({
  // ...
  datetimeFormats: {
    en: {
      short: { year: 'numeric', month: 'short', day: 'numeric' }
    },
    de: {
      short: { year: 'numeric', month: 'short', day: 'numeric' }
    }
  }
})
```

### 4. Error Handling

Always provide fallback text for missing translations:

```vue
<template>
  <p>{{ t('some.key', 'Fallback text') }}</p>
</template>
```

## Testing Translations

### 1. Manual Testing

- Use the language switcher to test all supported languages
- Verify text fits properly in UI components
- Check for missing translations (will show the key instead of text)

### 2. Automated Testing

Consider adding tests for translation completeness:

```typescript
// Example test to ensure all keys exist in all locales
import en from '@/i18n/locales/en.json'
import de from '@/i18n/locales/de.json'

describe('Translation Completeness', () => {
  it('should have all English keys in German', () => {
    const enKeys = getAllKeys(en)
    const deKeys = getAllKeys(de)
    
    expect(deKeys).toEqual(expect.arrayContaining(enKeys))
  })
})
```

## Maintenance

### Adding New Text

When adding new UI text:

1. **Add to English first**: Always start with the default language
2. **Use descriptive keys**: Make keys self-documenting
3. **Update all locales**: Ensure consistency across languages
4. **Test thoroughly**: Verify text fits in all languages

### Updating Existing Text

When changing existing translations:

1. **Update all locales simultaneously**: Avoid partial updates
2. **Consider context changes**: Ensure translations still make sense
3. **Review UI layout**: Some languages may need more/less space

## Troubleshooting

### Common Issues

1. **Missing Translation**: Shows the key instead of text
   - Check if the key exists in the translation file
   - Verify the key path is correct

2. **Text Overflow**: Text doesn't fit in UI components
   - Consider shorter translations
   - Adjust CSS to accommodate longer text

3. **Language Not Switching**: Language switcher doesn't work
   - Check if locale is added to `SUPPORTED_LOCALES`
   - Verify translation file is imported correctly

### Debug Mode

Enable Vue I18n debug mode during development:

```typescript
export const i18n = createI18n({
  // ...
  silentTranslationWarn: false,  // Show missing translation warnings
  silentFallbackWarn: false      // Show fallback warnings
})
```

This will help identify missing translations and other i18n issues during development.
