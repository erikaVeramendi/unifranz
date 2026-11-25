/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        unifranz: {
          orange: '#FF6B00',
          deep: '#FF5500',
          dark: '#0A0A0A',
          card: '#121212',
        }
      },
      fontFamily: {
        display: ['"Orbitron"', '"Space Grotesk"', 'sans-serif'],
        tech: ['"Space Grotesk"', 'sans-serif'],
        sans: ['"Inter"', 'sans-serif'],
      },
      boxShadow: {
        'neon-orange': '0 0 20px rgba(255, 107, 0, 0.55), 0 0 40px rgba(255, 85, 0, 0.25)',
        'neon-strong': '0 0 30px rgba(255, 107, 0, 0.85), 0 0 60px rgba(255, 85, 0, 0.45)',
      }
    },
  },
  plugins: [],
}
