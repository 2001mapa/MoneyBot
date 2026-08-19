'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, PieChart, Receipt, User } from 'lucide-react'

const navItems = [
  { href: '/', icon: Home, label: 'Inicio' },
  { href: '/stats', icon: PieChart, label: 'Stats' },
  { href: '/debts', icon: Receipt, label: 'Deudas' },
  { href: '/profile', icon: User, label: 'Perfil' },
]

export function BottomNav() {
  const pathname = usePathname()
  if (pathname === '/login') return null

  return (
    <div className="fixed bottom-0 left-0 w-full z-40">
      <div className="max-w-lg mx-auto">
        {/* iOS-style frosted glass nav bar */}
        <div className="glass-nav border-t border-border/30">
          {/* Safe area padding for iPhone home indicator */}
          <div className="flex justify-around items-center h-16 px-2">
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
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-primary" />
                  )}
                  <Icon className={`w-5 h-5 transition-all duration-200 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                  <span className={`text-[10px] font-semibold uppercase tracking-wide transition-all ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                    {label}
                  </span>
                </Link>
              )
            })}
          </div>
          {/* iPhone home indicator space */}
          <div className="h-safe-bottom pb-2" />
        </div>
      </div>
    </div>
  )
}
