import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { ArrowDownIcon, ArrowUpIcon, Wallet } from 'lucide-react'

export default function Home() {
  return (
    <main className="flex-1 p-6 pb-28 max-w-lg mx-auto w-full">
      {/* Header */}
      <header className="flex justify-between items-start mb-8 mt-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hola, Miguel 👋</h1>
          <p className="text-foreground/60 text-sm mt-1">Aquí está tu resumen de hoy</p>
        </div>
        <ThemeSwitcher />
      </header>

      {/* Balance Card */}
      <section className="bg-foreground text-background rounded-3xl p-7 mb-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Wallet className="w-32 h-32" />
        </div>
        <h2 className="text-background/80 font-medium text-sm mb-2">Balance Total</h2>
        <p className="text-4xl font-extrabold tracking-tight">$ 1,240,500 <span className="text-lg text-background/60 font-medium">COP</span></p>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 flex items-start space-x-3">
          <div className="bg-emerald-500/20 p-2 rounded-full text-emerald-600 dark:text-emerald-400 mt-0.5">
            <ArrowDownIcon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-foreground/60 font-medium mb-1 uppercase tracking-wider">Ingresos</p>
            <p className="font-bold text-lg text-emerald-700 dark:text-emerald-400">$2.4M</p>
          </div>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 flex items-start space-x-3">
          <div className="bg-red-500/20 p-2 rounded-full text-red-600 dark:text-red-400 mt-0.5">
            <ArrowUpIcon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-foreground/60 font-medium mb-1 uppercase tracking-wider">Gastos</p>
            <p className="font-bold text-lg text-red-700 dark:text-red-400">$1.1M</p>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <section>
        <div className="flex justify-between items-end mb-5">
          <h3 className="text-lg font-bold">Movimientos Recientes</h3>
          <button className="text-xs font-semibold text-blue-600 hover:text-blue-500">Ver todos</button>
        </div>
        
        <div className="space-y-3">
          {[
            { title: 'Mercado Carulla', cat: 'Alimentación', amount: '-$140.000', icon: '🛒', color: 'bg-orange-500/10 border-orange-500/20 text-orange-500' },
            { title: 'Pago Freelance', cat: 'Ingreso', amount: '+$500.000', icon: '💻', color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' },
            { title: 'Uber a casa', cat: 'Transporte', amount: '-$24.500', icon: '🚗', color: 'bg-blue-500/10 border-blue-500/20 text-blue-500' },
          ].map((tx, i) => (
            <div key={i} className="flex justify-between items-center p-4 rounded-2xl border border-foreground/5 bg-foreground/[0.02] hover:bg-foreground/5 transition-colors cursor-pointer">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-xl border flex items-center justify-center text-xl shadow-sm ${tx.color}`}>
                  {tx.icon}
                </div>
                <div>
                  <p className="font-bold text-sm">{tx.title}</p>
                  <p className="text-xs font-medium text-foreground/50 mt-0.5">{tx.cat}</p>
                </div>
              </div>
              <p className={`font-bold tracking-tight ${tx.amount.startsWith('+') ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                {tx.amount}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
