/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
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

