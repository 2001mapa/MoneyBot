'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']

export default function StatsPage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      const supabase = createClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return setLoading(false)

      // Por ahora traemos todo para calcular en cliente
      const { data: txs } = await supabase
        .from('transactions')
        .select('amount, type, description, transaction_date')
        .eq('user_id', user.id)
      
      if (txs) {
        // Agrupar por categoría (por ahora agruparemos por 'description' simulando categoría, ya que el webhook insertó nombres en description)
        // O mejor agrupar por type expense
        const expenses = txs.filter(t => t.type === 'expense')
        
        // Simular agrupación por "Categoría/Descripción"
        const grouped: Record<string, number> = {}
        expenses.forEach(t => {
          const desc = t.description.split(' ')[0] || 'Otros'
          grouped[desc] = (grouped[desc] || 0) + Number(t.amount)
        })

        const chartData = Object.keys(grouped).map(key => ({
          name: key,
          value: grouped[key]
        }))

        setData(chartData.sort((a,b) => b.value - a.value).slice(0, 6)) // Top 6
      }
      setLoading(false)
    }
    loadStats()
  }, [])

  const handleExportCSV = () => {
    if (!data.length) return alert('No hay datos para exportar')
    const csvRows = ['Categoría,Total Gastado']
    data.forEach(item => {
      csvRows.push(`${item.name},${item.value}`)
    })
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'gastos_moneybot.csv'
    a.click()
  }

  return (
    <main className="flex-1 p-6 pb-28 max-w-lg mx-auto w-full">
      <header className="flex items-center justify-between mb-8 mt-4">
        <div className="flex items-center">
          <Link href="/" className="mr-4 p-2 bg-card rounded-full hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Estadísticas</h1>
            <p className="text-muted-foreground text-sm mt-1">Análisis de tus gastos</p>
          </div>
        </div>
        <button onClick={handleExportCSV} className="text-xs font-bold bg-primary text-primary-foreground px-3 py-2 rounded-xl shadow-sm hover:opacity-90 transition-colors">
          Exportar CSV
        </button>
      </header>

      {loading ? (
        <p className="text-center text-muted-foreground py-10">Cargando datos...</p>
      ) : data.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">No hay datos suficientes para graficar.</p>
      ) : (
        <div className="space-y-8">
          <section className="bg-foreground/[0.02] border border-foreground/5 p-6 rounded-3xl">
            <h3 className="text-sm font-bold mb-6 text-center text-muted-foreground uppercase tracking-wider">Top Gastos (Doughnut)</h3>
            <div className="h-64 w-full">
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
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Gasto']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-4">
              {data.map((item, i) => (
                <div key={item.name} className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <p className="text-xs font-medium truncate flex-1">{item.name}</p>
                  <p className="text-xs font-bold">${item.value.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-foreground/[0.02] border border-foreground/5 p-6 rounded-3xl">
            <h3 className="text-sm font-bold mb-6 text-center text-muted-foreground uppercase tracking-wider">Comparativa</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <XAxis dataKey="name" tick={{fontSize: 10}} interval={0} angle={-45} textAnchor="end" height={60} />
                  <YAxis tickFormatter={(val) => `$${val/1000}k`} tick={{fontSize: 10}} width={45} />
                  <Tooltip 
                    formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Gasto']}
                    cursor={{fill: 'var(--foreground)', opacity: 0.05}}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
