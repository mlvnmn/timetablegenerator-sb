/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        fredoka: ['Fredoka', 'Inter', 'sans-serif'],
      },
      colors: {
        palette: {
          black: '#000000',
          navy: '#243b4a',
          'navy-dark': '#182833',
          'navy-light': '#324e61',
          orange: '#ff732e',
          'orange-hover': '#e8611d',
          'orange-light': '#fff1ea',
          light: '#eff2f5',
        },
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        '2xs': '0 1.5px 2px 0 rgba(0, 0, 0, 0.03)',
        '3xs': '0 0.5px 1px 0 rgba(0, 0, 0, 0.02)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
