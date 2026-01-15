import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// For GitHub Pages deployment, set BASE_PATH=/glow
const basePath = process.env.BASE_PATH || '';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    // Static adapter for SPA mode (required for Tauri and GitHub Pages)
    adapter: adapter({
      fallback: 'index.html',
    }),
    paths: {
      base: basePath,
    },
  },
};

export default config;
