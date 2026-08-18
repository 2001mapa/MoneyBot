'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Palette } from 'lucide-react'

export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const themes = ['luxury_gold', 'retro_pixel', 'cyberpunk', 'emerald', 'soft_pastel', 'light', 'dark']

  return (
    <div className="relative inline-block text-left group">
      <button className="flex items-center space-x-2 p-2 rounded-xl bg-foreground/5 hover:bg-foreground/10 transition-colors border border-foreground/10">
        <Palette className="w-4 h-4" />
        <span className="text-xs font-semibold uppercase tracking-wider">{theme?.replace('_', ' ')}</span>
      </button>
      <div className="absolute right-0 mt-2 w-40 bg-background border border-foreground/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden">
        <div className="p-1">
          {themes.map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`w-full text-left px-3 py-2.5 text-xs uppercase tracking-wider font-medium rounded-lg transition-colors ${
                theme === t ? 'bg-foreground text-background' : 'hover:bg-foreground/5 text-foreground/80'
              }`}
            >
              {t.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
