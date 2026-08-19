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

  useEffect(() => {
    async function loadStats() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return setLoading(false)

      const { data: txs } = await supabase
        .from('transactions')
        .select('amount, type, description, transaction_date')
        .eq('user_id', user.id)
      
      if (txs) {
        const expenses = txs.filter(t => t.type === 'expense')
        const grouped: Record<string, number> = {}
        expenses.forEach(t => {
          const desc = t.description.split(' ')[0] || 'Otros'
          grouped[desc] = (grouped[desc] || 0) + Number(t.amount)
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
  }, [])

  const handleExportCSV = () => {
    if (!data.length) return
    const csvRows = ['Categoría,Total Gastado']
    data.forEach(item => csvRows.push(`${item.name},${item.value}`))
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'gastos_panel_financiero.csv'
    a.click()
  }

  const totalGastos = data.reduce((s, d) => s + d.value, 0)

  return (
    <main className="flex-1 pb-28 max-w-lg mx-auto w-full">

      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-8 pb-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 bg-card border border-border rounded-xl hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest mb-0.5">Análisis</p>
            <h1 className="text-2xl font-bold tracking-tight">Estadísticas</h1>
          </div>
        </div>
        <button
          onClick={handleExportCSV}
          className="p-2.5 bg-card border border-border rounded-xl hover:bg-muted transition-colors"
          title="Exportar CSV"
        >
          <Download className="w-4 h-4" />
        </button>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground text-sm">Cargando datos...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="mx-6 text-center py-16 border border-dashed border-border rounded-3xl">
          <p className="text-3xl mb-3">📊</p>
          <p className="text-muted-foreground text-sm font-medium">Sin datos suficientes aún</p>
          <p className="text-xs text-muted-foreground mt-1">Registra gastos con Luka para ver tus estadísticas</p>
        </div>
      ) : (
        <div className="px-6 space-y-5">

          {/* Total summary */}
          <div className="bg-card border border-border rounded-3xl p-5">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Total gastado (top categorías)</p>
            <p className="text-3xl font-black">${totalGastos.toLocaleString()}</p>
          </div>

          {/* Donut Chart */}
          <div className="bg-card border border-border rounded-3xl p-6">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-5">Distribución de gastos</h3>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {data.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Gasto']}
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                      backgroundColor: 'var(--card)',
                      color: 'var(--foreground)',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mt-4">
              {data.map((item, i) => (
                <div key={item.name} className="flex items-center gap-2 p-2 rounded-xl bg-muted">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <p className="text-xs font-medium truncate flex-1">{item.name}</p>
                  <p className="text-xs font-bold flex-shrink-0">${(item.value / 1000).toFixed(0)}k</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bar Chart */}
          <div className="bg-card border border-border rounded-3xl p-6">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-5">Comparativa por categoría</h3>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} barSize={28}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                    height={50}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(val) => `$${val / 1000}k`}
                    tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                    width={42}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Gasto']}
                    cursor={{ fill: 'var(--muted)', radius: 8 }}
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                      backgroundColor: 'var(--card)',
                      color: 'var(--foreground)',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {data.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}
    </main>
  )
}
