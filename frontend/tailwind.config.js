/**
 * @file tailwind.config.js
 * @description Configuration file for the Tailwind CSS framework.
 * This file defines the paths to template files for CSS purging, enables
 * class-based dark mode, and extends the default theme with custom
 * keyframe animations.
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      keyframes: {
        searchPulse: {
          '0%, 100%': {
            opacity: 0.7
          },
          '50%': {
            opacity: 1
          },
        },
        searchPulseActive: {
          '0%, 100%': {
            opacity: 0.9
          },
          '50%': {
            opacity: 1
          },
        },
      },
      animation: {
        searchPulse: 'searchPulse 2s infinite',
        searchPulseActive: 'searchPulseActive 1s infinite',
      },
    },
  },
  plugins: [],
}