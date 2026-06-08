/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eefbf9',
          100: '#d5f5f0',
          200: '#afeae1',
          300: '#7bd8cc',
          400: '#47bfb3',
          500: '#2ea39a',
          600: '#22837d',
          700: '#1f6966',
          800: '#1d5452',
          900: '#1c4746',
          950: '#0b2a2a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        elevated: '0 10px 40px -10px rgb(0 0 0 / 0.12)',
      },
    },
  },
  plugins: [],
};
