'use client'

import { ThemeProvider } from 'next-themes'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="luxury_gold"
      themes={['luxury_gold', 'retro_pixel', 'cyberpunk', 'emerald', 'soft_pastel', 'light', 'dark']}
      enableSystem={false}
    >
      {children}
    </ThemeProvider>
  )
}
