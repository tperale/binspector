// @ts-check

import jestPlugin from 'eslint-plugin-jest';
import tseslint from 'typescript-eslint';
import jseslint from "@eslint/js"
import stylistic from "@stylistic/eslint-plugin"

export default [
  {
    files: ["**/*.ts"],
    ignores: ['build/**', 'dist/**', 'docs/**', './webpack.config.js', '**/*.mjs'],
  },
  {
    // enable jest rules on test files
    files: ['**/__test__/**'],
    ...jestPlugin.configs['flat/recommended'],
  },
  // syntax rules
  jseslint.configs.recommended,
  ...tseslint.configs.recommended,
  // code style rules
  stylistic.configs["recommended-flat"],
  stylistic.configs.customize({
    indent: 2,
    braceStyle: "1tbs",
    quotes: "single",
    semi: false,
  }),
  { 
    rules: {
      '@stylistic/space-before-function-paren': ['error', { anonymous: 'always', asyncArrow: 'always', named: 'always' }]
    }
  }
]
