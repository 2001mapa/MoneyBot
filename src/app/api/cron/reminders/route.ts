import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Redis } from '@upstash/redis'

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN!

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

async function sendMessage(chatId: string | number, text: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
}

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('Authorization')
  
  // Verificación de seguridad estricta
  if (!cronSecret || !authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 1. Traer todos los perfiles con Telegram vinculado
    const { data: profiles, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .not('telegram_chat_id', 'is', null)

    if (error || !profiles) throw error;

    const now = new Date();

    for (const profile of profiles) {
      const chatId = profile.telegram_chat_id;
      const botName = profile.bot_alias || 'Luka';

      // --- A. MOTOR DE RECORDATORIO DE DEUDAS ---
      const { data: debts } = await supabaseAdmin
        .from('debts')
        .select('*')
        .eq('user_id', profile.id)
        .eq('status', 'pending');

      if (debts) {
        for (const debt of debts) {
          if (!debt.due_date) continue;
          
          const dueDate = new Date(debt.due_date);
          
          // Si la fecha de vencimiento es hoy o ya pasó
          if (dueDate <= now) {
            const lastReminded = debt.last_reminded_at ? new Date(debt.last_reminded_at) : null;
            
            // Si nunca se le ha recordado, o si el último recordatorio fue hace más de 24 horas
            if (!lastReminded || (now.getTime() - lastReminded.getTime()) > 24 * 60 * 60 * 1000) {
              
              const typeStr = debt.debt_type === 'i_owe' ? `que le debes a ${debt.person_name}` : `que te debe ${debt.person_name}`;
              
              await sendMessage(chatId, `📅 ¡Hola! Soy ${botName}. Te recuerdo el préstamo ${typeStr} por valor de $${Number(debt.balance_remaining).toLocaleString('es-CO')} que vence o venció el ${dueDate.toLocaleDateString()}. ¿Deseas que registremos un abono hoy?`);
              
              // Actualizar fecha de último recordatorio
              await supabaseAdmin
                .from('debts')
                .update({ last_reminded_at: now.toISOString() })
                .eq('id', debt.id);
            }
          }
        }
      }

      // --- B. MOTOR DE ALERTA DE PRESUPUESTO ---
      if (profile.monthly_budget && Number(profile.monthly_budget) > 0) {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        
        const { data: txs } = await supabaseAdmin
          .from('transactions')
          .select('amount')
          .eq('user_id', profile.id)
          .eq('type', 'expense')
          .gte('transaction_date', startOfMonth);

        if (txs) {
          const sum = txs.reduce((acc, tx) => acc + Number(tx.amount), 0);
          const limit = Number(profile.monthly_budget);
          
          if (sum >= limit * 0.9) { // 90% o más
            const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
            const redisKey = `budget_alert_${profile.id}_${monthKey}`;
            
            const alreadyAlerted = await redis.get(redisKey);
            
            if (!alreadyAlerted) {
              const perc = ((sum / limit) * 100).toFixed(1);
              await sendMessage(chatId, `🚨 **¡ALERTA DE PRESUPUESTO!** 🚨\nTe has gastado $${sum.toLocaleString('es-CO')} este mes. Eso es el ${perc}% de tu límite mensual ($${limit.toLocaleString('es-CO')}). ¡Te recomiendo frenar los gastos hasta el próximo mes!`);
              
              // Marcar como alertado (expira en 30 días para limpieza automática)
              await redis.set(redisKey, 'true', { ex: 30 * 24 * 60 * 60 });
            }
          }
        }
      }
    }

    return NextResponse.json({ status: 'success', message: 'Cron jobs executed successfully' })

  } catch (error) {
    console.error('Cron Job Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
