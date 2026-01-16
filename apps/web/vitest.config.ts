import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    svelte({
      // Enable Svelte 5 runes in tests
      compilerOptions: {
        runes: true,
      },
    }),
  ],
  test: {
    // Use jsdom for browser-like environment
    environment: 'jsdom',

    // Setup file for mocks and global configuration
    setupFiles: ['./vitest.setup.ts'],

    // Include test files
    include: ['src/**/*.{test,spec}.{js,ts,svelte}'],

    // Global test APIs (describe, it, expect, etc.)
    globals: true,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{js,ts,svelte}'],
      exclude: [
        'src/**/*.{test,spec}.{js,ts}',
        'src/**/*.d.ts',
        'src/routes/**/+*.{js,ts,svelte}',
        'src/app.html',
      ],
    },

    // Dependency optimization for TipTap/ProseMirror
    deps: {
      optimizer: {
        web: {
          include: ['@tiptap/core', '@tiptap/pm', '@tiptap/starter-kit'],
        },
      },
    },

    // Cleanup after each test
    restoreMocks: true,
    clearMocks: true,
  },

  resolve: {
    // Handle Svelte conditions for SSR vs browser
    conditions: ['browser'],
  },
});
