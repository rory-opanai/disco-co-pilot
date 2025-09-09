import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'ui-sans-serif', 'system-ui'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(0 0 0 / 0.06)',
        overlay: '0 8px 24px -8px rgb(0 0 0 / 0.25)'
      },
      borderRadius: {
        xl: '12px'
      }
    },
  },
  plugins: [],
}
export default config
