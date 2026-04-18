/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0B2C5D',
          50: '#E8EDF5',
          100: '#C5D1E8',
          200: '#8FA3CC',
          300: '#5875B1',
          400: '#2D4F8F',
          500: '#0B2C5D',
          600: '#092449',
          700: '#071B37',
          800: '#051225',
          900: '#020912',
        },
        gold: {
          DEFAULT: '#F2B705',
          50: '#FEF9E7',
          100: '#FDEFC0',
          200: '#FBDF80',
          300: '#F9CF41',
          400: '#F2B705',
          500: '#C99804',
          600: '#A07903',
          700: '#775A02',
          800: '#4E3B01',
          900: '#251C01',
        }
      },
      fontFamily: {
        display: ['Georgia', 'Cambria', 'serif'],
        body: ['system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}
