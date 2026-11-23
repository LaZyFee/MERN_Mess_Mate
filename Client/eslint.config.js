import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', '.next', 'node_modules']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // T0.14 — zero tokens in JS-reachable storage
      'no-restricted-properties': [
        'error',
        { object: 'window', property: 'localStorage', message: 'No localStorage — tokens live in HttpOnly cookies (§8.2).' },
        { object: 'window', property: 'sessionStorage', message: 'No sessionStorage — tokens live in HttpOnly cookies (§8.2).' },
        { object: 'document', property: 'indexedDB', message: 'No IndexedDB for auth/user data (§8.2).' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='localStorage']",
          message: 'No localStorage — tokens live in HttpOnly cookies (§8.2).',
        },
        {
          selector: "MemberExpression[object.name='sessionStorage']",
          message: 'No sessionStorage — tokens live in HttpOnly cookies (§8.2).',
        },
      ],
      // No NEXT_PUBLIC_ secrets beyond the app URL
      'no-restricted-imports': ['off'],
    },
  },
])
