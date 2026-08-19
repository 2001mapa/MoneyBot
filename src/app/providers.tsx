'use client'

import { ThemeProvider } from 'next-themes'

const ALL_THEMES = [
  'dark', 'light',
  'luxury_gold', 'emerald', 'cyberpunk', 'retro_pixel', 'soft_pastel',
  'ocean', 'rose_gold', 'nord', 'sunset', 'matrix',
]

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      themes={ALL_THEMES}
      enableSystem={false}
    >
      {children}
    </ThemeProvider>
  )
}
