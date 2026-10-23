/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        indovox: {
          black: '#0d0d0d',
          red: '#d92d2d',
          saffron: '#ff9f1c',
          green: '#1f8f5f',
          paper: '#f7f3ee',
        },
      },
      boxShadow: {
        editorial: '0 18px 45px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
}

