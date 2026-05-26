/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f7f7f8',
          100: '#eeeef1',
          200: '#d7d7df',
          300: '#b3b3c0',
          400: '#82828f',
          500: '#5d5d6a',
          600: '#43434e',
          700: '#33333c',
          800: '#23232b',
          900: '#15151b',
        },
        accent: {
          400: '#7c9cff',
          500: '#5d80f5',
          600: '#3f63d9',
        },
        success: {
          500: '#22b07a',
        },
        warn: {
          500: '#d99c2a',
        },
        danger: {
          500: '#d9534f',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        serif: ['"Source Serif Pro"', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.05), 0 6px 18px -10px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
};
