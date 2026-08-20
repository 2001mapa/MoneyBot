'use client'

import { ThemeProvider } from 'next-themes'

const ALL_THEMES = [
  'navy-saas',
  'charcoal-lime',
  'emerald-mint',
  'burgundy-blush',
  'teal-coral',
  'plum-lavender',
  'terracotta-mustard',
  'midnight-slate',
]

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="navy-saas"
      themes={ALL_THEMES}
      enableSystem={false}
    >
      {children}
    </ThemeProvider>
  )
}
