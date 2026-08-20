'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, PieChart, Receipt, User, Target } from 'lucide-react'

const navItems = [
  { href: '/', icon: Home, label: 'Inicio' },
  { href: '/stats', icon: PieChart, label: 'Stats' },
  { href: '/debts', icon: Receipt, label: 'Deudas' },
  { href: '/planning', icon: Target, label: 'Metas' },
  { href: '/profile', icon: User, label: 'Perfil' },
]

export function BottomNav() {
  const pathname = usePathname()
  if (pathname === '/login' || pathname === '/lock') return null

  return (
    <div className="fixed bottom-0 left-0 w-full z-40 pb-safe">
      <div className="max-w-lg mx-auto px-4 pb-4">
        {/* iOS-style floating pill nav bar */}
        <div className="pill-nav px-2">
          <div className="flex justify-around items-center h-16">
            {navItems.map(({ href, icon: Icon, label }) => {
              const isActive = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-200 relative ${
                    isActive ? 'text-primary scale-105' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-1 rounded-b-full bg-primary" />
                  )}
                  <Icon strokeWidth={1.5} className={`w-5 h-5 transition-all duration-200`} />
                  <span className={`text-[10px] font-bold uppercase tracking-wide transition-all ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                    {label}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
