'use client'

import { ThemeProvider, useTheme } from 'next-themes'
import { useEffect } from 'react'

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

const themeColors: Record<string, string> = {
  'navy-saas': '#F0F4F8',
  'charcoal-lime': '#F3F4F6',
  'emerald-mint': '#FFF8E7',
  'burgundy-blush': '#FFFDF7',
  'teal-coral': '#F5E6CA',
  'plum-lavender': '#F8F5FA',
  'terracotta-mustard': '#FAEEE8',
  'midnight-slate': '#F1F5F9',
}

function ThemeColorUpdater() {
  const { theme, resolvedTheme } = useTheme()

  useEffect(() => {
    const currentTheme = theme === 'system' ? resolvedTheme : theme
    const color = themeColors[currentTheme as string] || '#F0F4F8'
    
    let metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta')
      metaThemeColor.setAttribute('name', 'theme-color')
      document.head.appendChild(metaThemeColor)
    }
    metaThemeColor.setAttribute('content', color)
  }, [theme, resolvedTheme])

  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="navy-saas"
      themes={ALL_THEMES}
      enableSystem={false}
    >
      <ThemeColorUpdater />
      {children}
    </ThemeProvider>
  )
}
