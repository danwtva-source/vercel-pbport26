/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['DynaPuff', 'cursive'],
        dynapuff: ['DynaPuff', 'cursive'],
        arial: ['Arial Nova', 'Arial', 'sans-serif'],
      },
      colors: {
        brand: {
          purple: '#9333ea',
          darkPurple: '#7e22ce',
          teal: '#14b8a6',
          darkTeal: '#0f766e',
          light: '#f3e8ff',
        }
      }
    }
  },
  plugins: [],
}
