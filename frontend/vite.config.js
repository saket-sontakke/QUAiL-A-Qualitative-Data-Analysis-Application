/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * @file vite.config.js
 * @description Configuration file for the Vite build tool. This function-based
 * config dynamically loads environment variables to set up a proxy for API
 * requests during development. It also includes plugins for React and
 * Tailwind CSS, and configures the Vitest testing environment.
 *
 * @param {object} config - The configuration object provided by Vite.
 * @param {string} config.mode - The current mode (e.g., 'development', 'production').
 * @returns {import('vite').UserConfig} The Vite configuration object.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    server: {
      host: true,
      proxy: {
        '/api': {
          target: env.VITE_BACKEND_URL,
          changeOrigin: true,
        },
      },
    },
    plugins: [
      react(),
      tailwindcss()
    ],
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './tests/setup.js',
    },
  }
})