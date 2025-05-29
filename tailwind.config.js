/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'lavender-blue': {
          50: '#f5f7ff',
          100: '#eaeeff',
          200: '#d5dcff',
          300: '#aeb9ff',
          400: '#7e8cff',
          500: '#5161ff',
          600: '#3644f7',
          700: '#2832e3',
          800: '#232bbd',
          900: '#1f279a',
        },
      },
      animation: {
        'sparkle': 'sparkle 2s ease-in-out infinite',
        'bounce-in': 'bounce-in 0.6s ease-out',
        'fade-in': 'fade-in 0.5s ease-out',
        'fade-in-delay': 'fade-in-delay 1s ease-out',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        sparkle: {
          '0%': {
            opacity: '0',
            transform: 'scale(0) rotate(0deg)',
          },
          '50%': {
            opacity: '1',
            transform: 'scale(1) rotate(180deg)',
          },
          '100%': {
            opacity: '0',
            transform: 'scale(0) rotate(360deg)',
          },
        },
        'bounce-in': {
          '0%': {
            opacity: '0',
            transform: 'scale(0.3)',
          },
          '50%': {
            transform: 'scale(1.05)',
          },
          '70%': {
            transform: 'scale(0.9)',
          },
          '100%': {
            opacity: '1',
            transform: 'scale(1)',
          },
        },
        'fade-in': {
          from: {
            opacity: '0',
            transform: 'translateY(10px)',
          },
          to: {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        'fade-in-delay': {
          '0%': {
            opacity: '0',
            transform: 'translateY(10px)',
          },
          '50%': {
            opacity: '0',
            transform: 'translateY(10px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
      },
    },
  },
  plugins: [],
}