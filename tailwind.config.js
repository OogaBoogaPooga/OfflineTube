export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0f0f0f',
        surface: '#1f1f1f',
        'surface-2': '#272727',
        'surface-3': '#3a3a3a',
        text: '#f1f1f1',
        muted: '#aaaaaa',
        accent: '#ff0033'
      },
      fontFamily: {
        sans: ['Roboto', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif']
      }
    }
  },
  plugins: []
}
