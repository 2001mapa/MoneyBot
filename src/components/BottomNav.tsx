'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, PieChart, Receipt, User } from 'lucide-react'

export function BottomNav() {
  const pathname = usePathname()

  if (pathname === '/login') return null;
  return (
    <div className="fixed bottom-0 left-0 w-full bg-background border-t border-border pb-safe z-40">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        <Link href="/" className={`flex flex-col items-center justify-center w-full h-full ${pathname === '/' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80'}`}>
          <Home className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-medium uppercase tracking-wider">Inicio</span>
        </Link>
        <Link href="/stats" className={`flex flex-col items-center justify-center w-full h-full ${pathname === '/stats' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80'}`}>
          <PieChart className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-medium uppercase tracking-wider">Stats</span>
        </Link>
        <Link href="/debts" className={`flex flex-col items-center justify-center w-full h-full ${pathname === '/debts' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80'}`}>
          <Receipt className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-medium uppercase tracking-wider">Deudas</span>
        </Link>
        <Link href="/profile" className={`flex flex-col items-center justify-center w-full h-full ${pathname === '/profile' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80'}`}>
          <User className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-medium uppercase tracking-wider">Perfil</span>
        </Link>
      </div>
    </div>
  )
}
