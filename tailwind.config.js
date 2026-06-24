/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif:   ['Georgia', 'ui-serif', 'Cambria', 'Times New Roman', 'Times', 'serif'],
        display: ['Inter', 'ui-sans-serif', 'sans-serif'],
        mono:    ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        // Natural / warm tones (matches original @theme in index.css)
        emerald: {
          50:  '#e0dfd5',
          100: '#e8e7dd',
          200: '#a7c957',
          400: '#6b6b4e',
          500: '#5a5a40',
          600: '#5a5a40',
          700: '#43423b',
          800: '#2d2c26',
          900: '#1e1d19',
          950: '#13120f',
        },
        gray: {
          50:  '#efeee5',
          100: '#e0dfd5',
          200: '#e8e7dd',
          300: '#cbc9bb',
          400: '#a19f91',
          500: '#7c7a6e',
          600: '#5d5b52',
          700: '#4a4840',
          800: '#43423b',
          850: '#333229',
          900: '#2d2c26',
          950: '#1a1915',
        },
      },
    },
  },
  plugins: [],
};
