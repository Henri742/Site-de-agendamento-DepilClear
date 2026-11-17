/** Configuração do Tailwind (build local — substitui o cdn.tailwindcss.com).
 *  Para gerar de novo após mudar classes:  npm run build:css  */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './caixa.html', './privacidade.html', './app.js', './caixa.js', './security.js'],
  theme: {
    extend: {
      colors: {
        brand: {
          darkBg: '#0a0512', darkSurface: '#120b1f', darkCard: '#1a102c', darkBorder: '#2e1948',
          violet: '#7c3aed', violetLight: '#a78bfa', purpleDeep: '#4c1d95',
          gold: '#d4af37', goldHover: '#c19c29', goldLight: '#fef08a',
          lightBg: '#f9f6fc', lightSurface: '#ffffff', lightCard: '#f4eefa', lightBorder: '#e6daf2',
          lightText: '#180a29', lightMuted: '#6c5683'
        }
      },
      fontFamily: {
        sans: ['Montserrat', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
        script: ['Caveat', 'Great Vibes', 'cursive']
      }
    }
  }
};
