import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { ArrowDownIcon, ArrowUpIcon, Wallet } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()

  // Obtener transacciones reales de la base de datos
  const { data: { user } } = await supabase.auth.getUser()
  
  let profile = { full_name: 'Usuario', currency: 'COP' }
  if (user) {
    const { data: profileData } = await supabase.from('profiles').select('full_name, currency').eq('id', user.id).single()
    if (profileData) profile = profileData
  }

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*, categories(name, icon, color)')
    .eq('user_id', user?.id || '')
    .order('transaction_date', { ascending: false })
    .limit(10)

  // Calcular totales
  let totalBalance = 0
  let ingresosMes = 0
  let gastosMes = 0

  const { data: allTx } = await supabase.from('transactions').select('*').eq('user_id', user?.id || '')
  
  if (allTx) {
    allTx.forEach(tx => {
      if (tx.type === 'income') {
        totalBalance += Number(tx.amount)
        ingresosMes += Number(tx.amount)
      } else if (tx.type === 'expense') {
        totalBalance -= Number(tx.amount)
        gastosMes += Number(tx.amount)
      }
    })
  }

  // Ajustar el balance total con las deudas (Flujo de caja real)
  const { data: allDebts } = await supabase.from('debts').select('*').eq('user_id', user?.id || '').neq('status', 'paid')
  if (allDebts) {
    allDebts.forEach(debt => {
      if (debt.debt_type === 'i_owe') {
        totalBalance += Number(debt.balance_remaining) // Dinero que entró a mi bolsillo prestado
      } else if (debt.debt_type === 'they_owe') {
        totalBalance -= Number(debt.balance_remaining) // Dinero que salió de mi bolsillo para prestar
      }
    })
  }

  return (
    <main className="flex-1 p-6 pb-28 max-w-lg mx-auto w-full">
      {/* Header */}
      <header className="flex justify-between items-start mb-8 mt-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hola, {profile.full_name?.split(' ')[0] || 'Usuario'} 👋</h1>
          <p className="text-foreground/60 text-sm mt-1">Aquí está tu resumen real</p>
        </div>
        <ThemeSwitcher />
      </header>

      {/* Balance Card */}
      <section className="bg-foreground text-background rounded-3xl p-7 mb-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Wallet className="w-32 h-32" />
        </div>
        <h2 className="text-background/80 font-medium text-sm mb-2">Balance Total</h2>
        <p className="text-4xl font-extrabold tracking-tight">$ {totalBalance.toLocaleString()} <span className="text-lg text-background/60 font-medium">{profile.currency}</span></p>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 flex items-start space-x-3">
          <div className="bg-emerald-500/20 p-2 rounded-full text-emerald-600 dark:text-emerald-400 mt-0.5">
            <ArrowDownIcon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-foreground/60 font-medium mb-1 uppercase tracking-wider">Ingresos</p>
            <p className="font-bold text-lg text-emerald-700 dark:text-emerald-400">${ingresosMes.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 flex items-start space-x-3">
          <div className="bg-red-500/20 p-2 rounded-full text-red-600 dark:text-red-400 mt-0.5">
            <ArrowUpIcon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-foreground/60 font-medium mb-1 uppercase tracking-wider">Gastos</p>
            <p className="font-bold text-lg text-red-700 dark:text-red-400">${gastosMes.toLocaleString()}</p>
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
          {!transactions || transactions.length === 0 ? (
            <p className="text-center text-sm text-foreground/50 py-8 border border-dashed border-foreground/20 rounded-2xl">
              No hay transacciones aún. (O el RLS está bloqueando la vista sin Login).
            </p>
          ) : (
            transactions.map((tx: any) => (
              <div key={tx.id} className="flex justify-between items-center p-4 rounded-2xl border border-foreground/5 bg-foreground/[0.02] hover:bg-foreground/5 transition-colors cursor-pointer">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl border flex items-center justify-center text-xl shadow-sm bg-foreground/5">
                    {/* Placeholder icon hasta tener categorías conectadas */}
                    {tx.type === 'income' ? '💵' : '🛒'}
                  </div>
                  <div>
                    <p className="font-bold text-sm capitalize">{tx.description}</p>
                    <p className="text-xs font-medium text-foreground/50 mt-0.5">
                      {tx.payment_method}
                    </p>
                  </div>
                </div>
                <p className={`font-bold tracking-tight ${tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                  {tx.type === 'income' ? '+' : '-'}${Number(tx.amount).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  )
}
