/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: '#000000',
        primary: '#FFFFFF',
        secondary: '#A1A1AA',
        'wilbak-crimson': '#7A0000',
        'wilbak-magenta': '#E11D48',
        'wilbak-orange': '#FACC15',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      letterSpacing: {
        tighter: '-0.05em',
      },
      backgroundImage: {
        'luminous-gradient': 'radial-gradient(circle at bottom right, #FACC15, #E11D48, #7A0000, transparent)',
      },
    },
  },
  plugins: [],
}
