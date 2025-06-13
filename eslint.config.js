import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'

export default [
  // add more generic rulesets here, such as:
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  // Configure Vue files to use TypeScript parser
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
        sourceType: 'module',
      },
    },
  },
  {
    // General rules
    rules: {
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
      'max-params': ['warn', 5],
      'max-depth': ['warn', 4],
      'complexity': ['warn', 10],
      'no-magic-numbers': 'off',
      // [
      //   'warn',
      //   {
      //     ignore: [-1, 0, 0.5, 1, 2, 3, 4, 8, 10, 15, 16, 18, 20, 25, 30, 35, 36, 100, 1000, 1024],
      //     ignoreArrayIndexes: true,
      //     ignoreDefaultValues: true,
      //     ignoreNumericLiteralTypes: true,
      //   },
      // ],
      // TypeScript-specific rules
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-var-requires': 'error',
    },
    languageOptions: {
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    // Test files configuration - more lenient rules
    files: [
      '**/*.test.ts',
      '**/*.test.js',
      '**/*.spec.ts',
      '**/*.spec.js',
      '**/test-*.ts',
      '**/test-*.js',
      'test-setup.ts',
      '**/tests/**/*.ts',
      '**/tests/**/*.js',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn', // Allow any in tests but warn
      'complexity': 'off', // Allow complex test functions
      'max-params': 'off', // Allow many parameters in test functions
    },
  },
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