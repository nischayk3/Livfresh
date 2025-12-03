/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#EC4899',
        primaryLight: '#F9A8D4',
        primaryDark: '#DB2777',
      },
    },
  },
  plugins: [],
}

