// @ts-check

import tseslint from 'typescript-eslint'
import jseslint from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'

export default [
  {
    ignores: ['**/build/**', '**/dist/**', '**/docs/**', 'webpack.config.js', 'babel.config.js', '**/*.mjs'],
  },
  // syntax rules
  jseslint.configs.recommended,
  ...tseslint.configs.recommended,
  // code style rules
  stylistic.configs['recommended-flat'],
  stylistic.configs.customize({
    indent: 2,
    braceStyle: '1tbs',
    quotes: 'single',
    semi: false,
    commaDangle: 'only-multiline',
  }),
  {
    rules: {
      '@stylistic/space-before-function-paren': ['error', { anonymous: 'always', asyncArrow: 'always', named: 'always' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn', // or "error"
        {
          'argsIgnorePattern': '^_',
          'varsIgnorePattern': '^_',
          'caughtErrorsIgnorePattern': '^_'
        }
      ]
    },
  },
]
