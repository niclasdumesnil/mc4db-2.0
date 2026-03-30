/** @type {import('tailwindcss').Config} */
module.exports = {
  prefix: 'tw-',
  darkMode: 'class',
  content: [
    "./react-src/index.html",
    "./react-src/src/**/*.{js,ts,jsx,tsx}",
    "./backend/src/utils/pageTemplate.js"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
