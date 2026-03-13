/** @type {import('tailwindcss').Config} */

function withOpacity(variableName) {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgba(var(${variableName}), ${opacityValue})`;
    }
    return `rgb(var(${variableName}))`;
  };
}

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
        matrix: ['"Share Tech Mono"', '"IBM Plex Mono"', 'monospace'],
      },
      colors: {
        slatewave: {
          950: withOpacity('--bg-950'),
          900: withOpacity('--bg-900'),
          800: withOpacity('--bg-800'),
          700: withOpacity('--bg-700'),
        },
        tide: {
          300: withOpacity('--accent-300'),
          400: withOpacity('--accent-400'),
          500: withOpacity('--accent-500'),
          600: withOpacity('--accent-600'),
        },
        ember: {
          300: withOpacity('--cta-300'),
          400: withOpacity('--cta-400'),
          500: withOpacity('--cta-500'),
        },
      },
      keyframes: {
        drift: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        rise: {
          '0%': { opacity: '0', transform: 'translateY(14px) scale(0.985)', filter: 'blur(10px)' },
          '55%': { opacity: '1', transform: 'translateY(-1px) scale(1.002)', filter: 'blur(0px)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)', filter: 'blur(0px)' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        glitch: {
          '0%, 100%': { textShadow: '2px 0 #00ff41, -2px 0 #00ff41' },
          '25%': { textShadow: '-2px 0 #00ff41, 2px 0 #003b00' },
          '50%': { textShadow: '2px 2px #003b00, -2px -2px #00ff41' },
          '75%': { textShadow: '-2px 0 #00ff41, 2px 0 #003b00' },
        },
      },
      animation: {
        drift: 'drift 6s ease-in-out infinite',
        rise: 'rise 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        scanline: 'scanline 8s linear infinite',
        glitch: 'glitch 3s ease-in-out infinite',
      },
      boxShadow: {
        glass: '0 18px 45px -22px var(--shadow-color, rgba(6, 22, 35, 0.95))',
        'matrix-glow': '0 0 15px rgba(0, 255, 65, 0.15), 0 0 30px rgba(0, 255, 65, 0.05)',
      },
    },
  },
  plugins: [],
};
