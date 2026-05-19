/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        app: 'rgb(var(--color-app) / <alpha-value>)',
        panel: 'rgb(var(--color-panel) / <alpha-value>)',
        panelMuted: 'rgb(var(--color-panel-muted) / <alpha-value>)',
        highlight: 'rgb(var(--color-highlight) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        subtle: 'rgb(var(--color-subtle) / <alpha-value>)'
      },
      boxShadow: {
        glow: '0 0 0 1px rgb(var(--glow-ring) / 0.15), 0 12px 32px rgb(var(--glow-shadow) / 0.45)'
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        display: ['var(--font-display)']
      },
      backgroundImage: {
        aurora:
          'radial-gradient(circle at top left, rgba(86, 215, 255, 0.22), transparent 28%), radial-gradient(circle at top right, rgba(157, 255, 143, 0.16), transparent 24%), linear-gradient(180deg, rgba(16, 21, 30, 0.95), rgba(8, 10, 14, 1))'
      }
    }
  },
  plugins: []
};
