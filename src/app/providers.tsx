'use client'

import { ThemeProvider } from 'next-themes'

const ALL_THEMES = [
  'midnight', 'carbon', 'forest', 'rosewood', 'coastal', 'velvet', 'desert',
]

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="midnight"
      themes={ALL_THEMES}
      enableSystem={false}
    >
      {children}
    </ThemeProvider>
  )
}
