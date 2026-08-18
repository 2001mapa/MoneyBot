'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, PieChart, PlusCircle, Receipt, User } from 'lucide-react'

export function BottomNav() {
  const pathname = usePathname()

  if (pathname === '/login') return null;
  return (
    <div className="fixed bottom-0 left-0 w-full bg-background border-t border-foreground/10 pb-safe z-40">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        <Link href="/" className="flex flex-col items-center justify-center w-full h-full text-foreground/70 hover:text-foreground">
          <Home className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-medium uppercase tracking-wider">Inicio</span>
        </Link>
        <Link href="/stats" className="flex flex-col items-center justify-center w-full h-full text-foreground/70 hover:text-foreground">
          <PieChart className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-medium uppercase tracking-wider">Stats</span>
        </Link>
        
        {/* FAB (Floating Action Button) for adding transactions */}
        <div className="flex flex-col items-center justify-center w-full h-full relative">
          <div className="absolute -top-6 bg-blue-600 rounded-full p-3 shadow-lg hover:bg-blue-500 cursor-pointer transition-transform hover:scale-105">
            <PlusCircle className="w-7 h-7 text-white" />
          </div>
        </div>

        <Link href="/debts" className="flex flex-col items-center justify-center w-full h-full text-foreground/70 hover:text-foreground">
          <Receipt className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-medium uppercase tracking-wider">Deudas</span>
        </Link>
        <Link href="/profile" className="flex flex-col items-center justify-center w-full h-full text-foreground/70 hover:text-foreground">
          <User className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-medium uppercase tracking-wider">Perfil</span>
        </Link>
      </div>
    </div>
  )
}
