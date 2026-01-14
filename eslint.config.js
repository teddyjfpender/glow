import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.svelte-kit/**',
      '**/coverage/**',
      '**/*.min.js',
      '**/target/**',
      'src-tauri/**',
      '*.config.js',
      '*.config.ts',
      '**/svelte.config.js',
      '**/vite.config.ts',
      '**/eslint.config.js',
      '**/*.svelte.ts',
    ],
  },

  // Base ESLint recommended rules
  eslint.configs.recommended,

  // TypeScript strict configuration
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // Svelte configuration
  ...svelte.configs['flat/recommended'],

  // TypeScript parser options
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.svelte'],
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },

  // Svelte file configuration
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },

  // Complexity and code quality rules
  {
    rules: {
      // Complexity limits (relaxed for UI components)
      complexity: 'off',
      'max-depth': ['warn', { max: 5 }],
      'max-nested-callbacks': ['warn', { max: 4 }],
      'max-lines-per-function': 'off',
      'max-lines': 'off',
      'max-params': ['warn', { max: 5 }],

      // Code quality
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-alert': 'warn',
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],

      // TypeScript specific (relaxed)
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/prefer-optional-chain': 'warn',
      '@typescript-eslint/switch-exhaustiveness-check': 'warn',
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/consistent-type-exports': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'off',
      '@typescript-eslint/no-confusing-void-expression': 'off',

      // DRY enforcement
      'no-duplicate-imports': 'error',

      // Svelte specific (relaxed)
      'svelte/require-each-key': 'off',
      'svelte/no-navigation-without-resolve': 'off',
    },
  },

  // Disable formatting rules (handled by Prettier)
  prettier,
);
