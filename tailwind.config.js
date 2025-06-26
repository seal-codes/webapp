/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#2ab5b5', // Main teal color
          600: '#238f8f',
          700: '#1c6969',
          800: '#154242',
          900: '#0e1c1c',
        },
        secondary: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#961a1a', // Main red color
          600: '#7f1616',
          700: '#681212',
          800: '#500e0e',
          900: '#380a0a',
        },
        gray: {
          50: '#f7f7f9', // Light background
          100: '#e7e7d9', // Secondary background
          200: '#d1d1c4',
          300: '#bcbcaf',
          400: '#a6a69a',
          500: '#919185',
          600: '#7c7c70',
          700: '#67675b',
          800: '#525246',
          900: '#3d3d31',
        },
      },
    },
  },
  plugins: [],
}
