'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
import { ArrowLeft, Download } from 'lucide-react'
import Link from 'next/link'

const COLORS = ['#818cf8', '#10b981', '#f59e0b', '#f472b6', '#60a5fa', '#a78bfa', '#34d399']

export default function StatsPage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'month' | 'year'>('month')

  useEffect(() => {
    async function loadStats() {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return setLoading(false)

      const now = new Date()
      const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      const startOfYear = `${now.getFullYear()}-01-01`
      const startDate = period === 'month' ? startOfMonth : startOfYear

      const { data: txs } = await supabase
        .from('transactions')
        .select('amount, type, description, transaction_date, categories(name)')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .gte('transaction_date', startDate)
      
      if (txs) {
        const grouped: Record<string, number> = {}
        txs.forEach(t => {
          const cat = (t as any).categories
          const categoryName = Array.isArray(cat) ? cat[0]?.name : cat?.name
          const finalName = categoryName || 'Otros'
          grouped[finalName] = (grouped[finalName] || 0) + Number(t.amount)
        })
        const chartData = Object.keys(grouped)
          .map(key => ({ name: key, value: grouped[key] }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 6)
        setData(chartData)
      }
      setLoading(false)
    }
    loadStats()
  }, [period])

  const handleExportCSV = () => {
    if (!data.length) return
    const csvRows = ['Categoría,Total Gastado']
    data.forEach(item => csvRows.push(`${item.name},${item.value}`))
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gastos_${period}.csv`
    a.click()
  }

  const totalGastos = data.reduce((s, d) => s + d.value, 0)

  return (
    <main className="flex-1 pb-28 max-w-lg mx-auto w-full pt-safe px-4 sm:px-6">

      {/* Header */}
      <header className="flex items-center justify-between pt-6 pb-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="w-11 h-11 flex items-center justify-center bg-card border border-border rounded-full hover:bg-muted transition-colors shadow-sm">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-0.5 opacity-60">Análisis</p>
            <h1 className="text-2xl font-black tracking-tight">Estadísticas</h1>
          </div>
        </div>
        <button
          onClick={handleExportCSV}
          className="w-11 h-11 flex items-center justify-center bg-card border border-border rounded-full hover:bg-muted transition-colors shadow-sm"
          title="Exportar CSV"
        >
          <Download className="w-5 h-5" />
        </button>
      </header>

      {/* Segmented Control iOS Modern */}
      <div className="bg-muted/50 p-1.5 rounded-full mb-6 flex relative">
        <div 
          className="absolute top-1.5 bottom-1.5 w-1/2 bg-card rounded-full shadow-sm transition-transform duration-300 ease-in-out border border-border/50"
          style={{ transform: period === 'month' ? 'translateX(0)' : 'translateX(calc(100% - 6px))' }}
        />
        <button 
          onClick={() => setPeriod('month')}
          className={`flex-1 py-3 text-xs font-bold rounded-full relative z-10 transition-colors ${period === 'month' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Mes Actual
        </button>
        <button 
          onClick={() => setPeriod('year')}
          className={`flex-1 py-3 text-xs font-bold rounded-full relative z-10 transition-colors ${period === 'year' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Este Año
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          <div className="glass p-6 md:col-span-2">
            <div className="h-3 w-32 bg-muted rounded-full mb-3" />
            <div className="h-10 w-48 bg-muted rounded-full" />
          </div>
          <div className="glass p-6 h-64" />
          <div className="glass p-6 h-64" />
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-16 px-6 glass">
          <p className="text-4xl mb-4">📊</p>
          <p className="text-foreground text-base font-bold">Sin datos en este periodo</p>
          <p className="text-xs text-muted-foreground mt-2 font-medium">Registra gastos con Luka para ver tus estadísticas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Total summary Bento */}
          <div className="glass p-6 md:col-span-2 relative overflow-hidden flex flex-col justify-center">
            <div className="absolute top-0 right-0 w-32 h-32 bg-expense/10 rounded-full blur-3xl pointer-events-none" />
            <p className="text-xs font-bold uppercase tracking-widest mb-1 text-muted-foreground">Total Gastado</p>
            <p className="text-4xl font-black text-foreground relative z-10">${totalGastos.toLocaleString()}</p>
          </div>

          {/* Donut Chart Bento */}
          <div className="glass p-5 flex flex-col">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Distribución</h2>
            <div className="h-44 w-full mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={10}
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => `$${Number(value).toLocaleString()}`}
                    contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '16px', border: '1px solid var(--border)', color: 'var(--foreground)', fontWeight: 'bold', boxShadow: '0 10px 25px var(--neu-dark)' }}
                    itemStyle={{ color: 'var(--foreground)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mt-auto">
              {data.map((item, i) => (
                <div key={item.name} className="flex items-center gap-2 p-3 rounded-[14px] bg-muted/50 border border-border/20 min-h-[44px]">
                  <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <p className="text-xs font-bold truncate flex-1 leading-tight">{item.name}</p>
                  <p className="text-xs font-black shrink-0 text-muted-foreground">${(item.value / 1000).toFixed(0)}k</p>
                </div>
              ))}
            </div>
          </div>

          {/* Histograma Soft-3D Bento */}
          <div className="glass p-5 flex flex-col">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-5">Comparativa</h3>
            <div className="h-64 w-full mt-auto">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} barSize={20} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9, fill: 'var(--muted-foreground)', fontWeight: 'bold' }}
                    interval={0}
                    angle={-35}
                    textAnchor="end"
                    height={40}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(val) => `$${val / 1000}k`}
                    tick={{ fontSize: 9, fill: 'var(--muted-foreground)', fontWeight: 'bold' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--muted)', radius: 10 }}
                    contentStyle={{
                      borderRadius: '16px',
                      border: '1px solid var(--border)',
                      boxShadow: '0 10px 25px var(--neu-dark)',
                      backgroundColor: 'var(--card)',
                      color: 'var(--foreground)',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                    formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Gasto']}
                  />
                  <Bar dataKey="value" radius={[10, 10, 10, 10]}>
                    {data.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={`url(#colorGradient${index})`} className="hover:filter hover:drop-shadow-[0_0_8px_rgba(129,140,248,0.5)] transition-all" />
                    ))}
                  </Bar>
                  <defs>
                    {data.map((_, index) => (
                      <linearGradient id={`colorGradient${index}`} x1="0" y1="0" x2="0" y2="1" key={index}>
                        <stop offset="0%" stopColor={COLORS[index % COLORS.length]} />
                        <stop offset="100%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.7} />
                      </linearGradient>
                    ))}
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}
    </main>
  )
}
