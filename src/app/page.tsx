import { createClient } from '@/lib/supabase/server'
import { DashboardData } from '@/components/DashboardData'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profileData } = await supabase
    .from('profiles')
    .select('full_name, currency, monthly_budget, needs_percent, wants_percent, savings_percent')
    .eq('id', user.id)
    .single()

  const profile = {
    full_name: profileData?.full_name || '',
    currency: profileData?.currency || 'COP',
    monthly_budget: profileData?.monthly_budget || 0,
    needs_percent: profileData?.needs_percent ?? 50,
    wants_percent: profileData?.wants_percent ?? 30,
    savings_percent: profileData?.savings_percent ?? 20,
  }

  const fallbackName =
    profile.full_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'Usuario'

  return (
    <DashboardData
      userId={user.id}
      initialProfile={profile}
      fallbackName={fallbackName}
    />
  )
}
