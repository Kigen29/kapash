/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#22C55E',
          dark: '#16A34A',
          muted: '#22C55E1A',
        },
      },
    },
  },
  plugins: [],
};
