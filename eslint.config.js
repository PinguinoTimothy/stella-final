import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import eslintConfigPrettier from 'eslint-config-prettier/flat';

export default [
  {
    ignores: ['node_modules/**', 'dist/**', 'coverage/**'],
  },

  js.configs.recommended,

  ...tseslint.configs.recommended,

  ...pluginVue.configs['flat/recommended'],

  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,vue}'],

    languageOptions: {
      globals: {
        ...globals.browser,
        console: 'readonly',
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        parser: tseslint.parser,
      },
    },

    rules: {
      'no-unused-vars': 'warn',
      'no-dupe-keys': 'error',
      'no-unreachable': 'error',
      'no-constant-condition': 'error',
      'no-debugger': 'error',
      'no-undef': 'error',
      'no-unreachable-loop': 'error',
    },
  },
  eslintConfigPrettier,
];
