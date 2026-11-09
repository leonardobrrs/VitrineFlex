/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary-color, #1e40af)',
        secondary: 'var(--secondary-color, #0284c7)',
        theme: {
          primary: 'var(--primary-color, #1e40af)',
          secondary: 'var(--secondary-color, #0284c7)',
        }
      }
    },
  },
  plugins: [],
}
