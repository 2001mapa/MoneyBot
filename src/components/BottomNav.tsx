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
        <div className="bg-card border-t border-border">
          <div className="flex justify-around items-center h-16 px-2">
            {navItems.map(({ href, icon: Icon, label }) => {
              const isActive = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors relative ${
                    isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                  )}
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
