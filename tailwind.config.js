/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        ega: {
          marinho: '#0F172A', // Slate 900 - Fundo da Sidebar e Títulos Fortes
          azul: '#2563EB',    // Blue 600 - Cor primária da marca (Botões, Destaques)
          claro: '#EFF6FF',   // Blue 50 - Fundo de hover e cards em destaque
          fundo: '#F8FAFC',   // Slate 50 - Cor de fundo da aplicação (quase branco, super limpo)
          texto: '#334155',   // Slate 700 - Cor padrão de texto (evita o preto puro que cansa a vista)
          gelo: '#FFFFFF',    // Branco puro para os blocos principais
        }
      }
    },
  },
  plugins: [],
}