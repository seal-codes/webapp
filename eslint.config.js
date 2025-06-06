import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'

export default [
  // Base configuration for all files
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,vue}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },

  // JavaScript base rules
  js.configs.recommended,

  // TypeScript configuration
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,mts,cts,tsx,vue}'],
    rules: {
      // TypeScript-specific rules aligned with your coding standards
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-var-requires': 'error',
    },
  },

  // Vue configuration
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      // Vue-specific rules
      'vue/multi-word-component-names': 'off', // Allow single-word component names
      'vue/component-definition-name-casing': ['error', 'PascalCase'],
      'vue/component-name-in-template-casing': ['error', 'PascalCase'],
      'vue/prop-name-casing': ['error', 'camelCase'],
      'vue/attribute-hyphenation': ['error', 'always'],
      'vue/v-on-event-hyphenation': ['error', 'always'],
      'vue/max-attributes-per-line': [
        'error',
        {
          singleline: 3,
          multiline: 1,
        },
      ],
      'vue/html-indent': ['error', 2],
      'vue/script-indent': ['error', 2, { baseIndent: 0 }],
      'vue/html-self-closing': [
        'error',
        {
          html: {
            void: 'always',
            normal: 'always',
            component: 'always',
          },
          svg: 'always',
          math: 'always',
        },
      ],
    },
  },

  // General code quality rules
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,vue}'],
    rules: {
      // Code style rules aligned with your standards
      'prefer-const': 'error',
      'no-var': 'error',
      'no-console': 'off',
      'no-debugger': 'error',
      'no-unused-vars': 'off', // Handled by TypeScript rule
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'brace-style': ['error', '1tbs'],
      'comma-dangle': ['error', 'always-multiline'],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'semi': ['error', 'never'],
      'indent': ['error', 2, { SwitchCase: 1 }],
      'max-len': [
        'warn',
        {
          code: 200,
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
        },
      ],
      'max-params': ['warn', 4],
      'max-depth': ['warn', 3],
      'complexity': ['warn', 10],
      'no-magic-numbers': [
        'warn',
        {
          ignore: [-1, 0, 0.5, 1, 2, 3, 4, 8, 10, 15, 16, 18, 20, 25, 30, 35, 36, 100, 1000, 1024],
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true,
          ignoreNumericLiteralTypes: true,
        },
      ],
    },
  },

  // Configuration files
  {
    files: ['*.config.{js,ts}', 'vite.config.ts', 'tailwind.config.js'],
    rules: {
      'no-console': 'off',
    },
  },

  // Test files (if you add them later)
  {
    files: ['**/*.{test,spec}.{js,ts,vue}', '**/__tests__/**/*'],
    rules: {
      'no-magic-numbers': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // Ignore patterns (replaces .eslintignore)
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '.git/**',
      '*.min.js',
      'coverage/**',
      '.vscode/**',
      '.idea/**',
      '*.log',
      '.DS_Store',
      'Thumbs.db',
      '.env*',
      '.cache/**',
      '.parcel-cache/**',
      '.eslintcache',
    ],
  },
]
