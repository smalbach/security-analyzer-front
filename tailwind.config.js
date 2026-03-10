/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      colors: {
        slatewave: {
          950: '#061623',
          900: '#0c2233',
          800: '#12344c',
          700: '#1d4b67',
        },
        tide: {
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0f766e',
        },
        ember: {
          300: '#fca95d',
          400: '#f97316',
          500: '#ea580c',
        },
      },
      keyframes: {
        drift: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        rise: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        drift: 'drift 6s ease-in-out infinite',
        rise: 'rise 0.45s ease-out forwards',
      },
      boxShadow: {
        glass: '0 18px 45px -22px rgba(6, 22, 35, 0.95)',
      },
    },
  },
  plugins: [],
};
