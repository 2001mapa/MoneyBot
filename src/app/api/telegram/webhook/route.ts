import { NextResponse } from 'next/server'
import { GoogleGenerativeAI, SchemaType, Schema } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'
import { Redis } from '@upstash/redis'

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN!

// Cliente admin para saltar RLS en el webhook
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Cliente Redis para memoria conversacional
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

async function getVoiceFileBase64(fileId: string): Promise<string | null> {
  try {
    const pathRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getFile?file_id=${fileId}`)
    const pathData = await pathRes.json()
    if (!pathData.ok) return null
    
    const filePath = pathData.result.file_path
    const audioRes = await fetch(`https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${filePath}`)
    const arrayBuffer = await audioRes.arrayBuffer()
    
    return Buffer.from(arrayBuffer).toString('base64')
  } catch (error) {
    console.error('Error descargando audio:', error)
    return null
  }
}

// Esquema de ruteo maestro para Gemini
const actionSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    action_type: {
      type: SchemaType.STRING,
      description: "Tipo de intención detectada en el mensaje.",
      format: "enum",
      enum: ["transaction", "debt_create", "debt_payment", "debt_delete", "budget_update", "rule_update", "savings_create", "savings_deposit", "savings_delete", "transfer", "query", "delete_last", "delete_all", "none"]
    },
    is_complete: { 
      type: SchemaType.BOOLEAN, 
      description: "CRÍTICO: True SOLO si tienes TODOS los datos (monto, tipo, método de pago, descripción) y vas a registrarlo YA. False si te falta algún dato y vas a preguntarlo en response_to_user. NUNCA pongas True si vas a preguntar o pedir confirmación de algo." 
    },
    goal_name: {
      type: SchemaType.STRING,
      description: "Nombre de la meta de ahorro (solo para savings_create, savings_deposit o savings_delete)."
    },
    amount: { 
      type: SchemaType.NUMBER, 
      description: "Monto involucrado (transacción, deuda, abono, transferencia o presupuesto). 0 si no aplica." 
    },
    needs_percent: { type: SchemaType.NUMBER, description: "Porcentaje para necesidades (solo para rule_update)" },
    wants_percent: { type: SchemaType.NUMBER, description: "Porcentaje para deseos (solo para rule_update)" },
    savings_percent: { type: SchemaType.NUMBER, description: "Porcentaje para ahorros (solo para rule_update)" },
    transaction_type: { 
      type: SchemaType.STRING, 
      description: "expense o income (solo para action_type=transaction)", 
      format: "enum",
      enum: ["expense", "income", "none"] 
    },
    category_name: { 
      type: SchemaType.STRING, 
      description: "Nombre de la categoría (ej. Comida, Transporte, Salario). Usa las categorías existentes si aplican." 
    },
    category_bucket: {
      type: SchemaType.STRING,
      description: "Si estás infiriendo una NUEVA categoría, asigna a qué grupo de la regla 50/30/20 pertenece: 'needs' (Necesidades: Arriendo, Comida, Transporte), 'wants' (Deseos: Cine, Salidas, Lujos), o 'savings' (Ahorro/Inversiones). Por defecto 'needs'.",
      format: "enum",
      enum: ["needs", "wants", "savings"]
    },
    category_icon: {
      type: SchemaType.STRING,
      description: "Un solo emoji que represente fielmente la categoría (ej. 🍔, 🚌, 💰, 🛒, 🏠, ⚡). Útil al crear nuevas categorías."
    },
    payment_method: { 
      type: SchemaType.STRING, 
      description: "Método de pago deducido (origen para transferencias)",
      format: "enum",
      enum: ["efectivo", "nequi", "daviplata", "banco", "tarjeta", "none"] 
    },
    destination_method: {
      type: SchemaType.STRING,
      description: "Método de pago de destino (solo para transferencias, ej. retiro de cajero es de banco a efectivo).",
      format: "enum",
      enum: ["efectivo", "nequi", "daviplata", "banco", "tarjeta", "none"]
    },
    description: { 
      type: SchemaType.STRING, 
      description: "Breve descripción (Ej: Almuerzo corrientazo, Prestamo a Juan)." 
    },
    person_name: { 
      type: SchemaType.STRING, 
      description: "Nombre de la persona involucrada (solo para deudas o abonos)." 
    },
    debt_type: { 
      type: SchemaType.STRING, 
      description: "i_owe (yo le debo a la persona) o they_owe (la persona me debe).",
      format: "enum",
      enum: ["i_owe", "they_owe", "none"] 
    },
    response_to_user: {
      type: SchemaType.STRING,
      description: "Tu respuesta cálida en lenguaje natural",
    }
  },
  required: ["action_type", "is_complete", "response_to_user"]
}

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const secretHeader = req.headers.get('x-telegram-bot-api-secret-token')
    const expectedSecret = process.env.TELEGRAM_SECRET_TOKEN || process.env.TELEGRAM_WEBHOOK_SECRET
    
    // Si la variable existe en Vercel, exigimos que el token de Telegram coincida
    if (expectedSecret && secretHeader !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const message = body.message
    if (!message) return NextResponse.json({ status: 'ignored' })

    const chatId = message.chat.id
    const isVoice = !!message.voice
    const isText = !!message.text

    if (!isVoice && !isText) return NextResponse.json({ status: 'ignored' })

    // Delegar el procesamiento pesado
    try {
      // 1. Verificar si el usuario está vinculado
      const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('telegram_chat_id', chatId)
          .single()

        if (!profile) {
          const { randomUUID } = require('crypto')
          const linkToken = randomUUID()
          await redis.set(`auth_token_${linkToken}`, chatId, { ex: 300 })
          
          const loginUrl = `https://${req.headers.get('host')}/login?token=${linkToken}`
          await sendMessage(chatId, `¡Hola! Soy Luka 👋.\nPara poder gestionar tus finanzas, necesito que vincules tu cuenta de Telegram con la plataforma web.\n\nPor favor, inicia sesión aquí (enlace válido por 5 minutos): ${loginUrl}`)
          return
        }

        // Informar que estamos pensando
        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendChatAction`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
        })

    // 2. Extraer Contexto Financiero vía RPC para evitar OOM (Out Of Memory)
    const { data: summaryData, error: summaryError } = await supabaseAdmin.rpc('get_financial_summary', {
      p_user_id: profile.id
    })

    let balanceTotal = 0;
    let bankBalance = 0;
    let cashBalance = 0;
    let gastosMes = 0;
    let deboTotal = 0;
    let meDebenTotal = 0;
    let last3Txs: string[] = [];
    const activeDebtsList: string[] = [];
    const recentTxList: string[] = [];

    if (!summaryError && summaryData) {
      balanceTotal = Number(summaryData.balanceTotal);
      bankBalance = Number(summaryData.bankBalance);
      cashBalance = Number(summaryData.cashBalance);
      gastosMes = Number(summaryData.gastosMes);
      deboTotal = Number(summaryData.deboTotal);
      meDebenTotal = Number(summaryData.meDebenTotal);
      
      const txs = summaryData.last3Txs || [];
      for (let tx of txs) {
        const amt = Number(tx.amount).toLocaleString();
        const icon = tx.type === 'income' ? '🟢' : '🔴';
        const methodStr = tx.payment_method ? ` (${tx.payment_method})` : '';
        recentTxList.push(`${icon} $${amt} - ${tx.description || 'Sin desc'}${methodStr}`);
      }
    }

    // Traer deudas para contexto de Luka
    const { data: allDebts } = await supabaseAdmin
      .from('debts')
      .select('person_name, type, balance_remaining, status, payment_method')
      .eq('user_id', profile.id)
      .neq('status', 'paid')

    if (allDebts) {
      allDebts.forEach(d => {
        if (d.status === 'cancelled') return;
        if (d.type === 'i_owe') {
          activeDebtsList.push(`Debo a ${d.person_name}: $${d.balance_remaining}`);
        } else {
          activeDebtsList.push(`${d.person_name} me debe: $${d.balance_remaining}`);
        }
      });
    }

    // Traer metas de ahorro para proteger liquidez
    const { data: allSavings } = await supabaseAdmin
      .from('savings_goals')
      .select('name, current_amount, target_amount')
      .eq('user_id', profile.id)

    let totalSavings = 0;
    const savingsList: string[] = [];
    if (allSavings) {
      allSavings.forEach(s => {
        totalSavings += Number(s.current_amount);
        savingsList.push(`- ${s.name}: $${s.current_amount} / $${s.target_amount}`);
      });
    }

    // El patrimonio (Asset Value) es la suma de: 
    // Liquidez (balanceTotal) + Ahorros guardados (totalSavings) + Lo que te deben (meDebenTotal) - Lo que debes (deboTotal)
    // Nota: Las metas de ahorro y préstamos se restaron de balanceTotal vía transacciones espejo, así que debemos sumarlas aquí para no desaparecerlas del patrimonio.
    const patrimonio = balanceTotal + totalSavings + meDebenTotal - deboTotal;
    
    // La liquidez disponible (Lo que de verdad puede gastar de su bolsillo)
    // Como los ahorros ya son una "transacción de gasto", el balanceTotal ES la liquidez real.
    const availableLiquidity = balanceTotal;

    const budgetLimit = Number(profile.monthly_budget) || 0;
    const budgetRemaining = budgetLimit > 0 ? budgetLimit - gastosMes : 0;

    // Traer categorías del usuario
    const { data: userCategories } = await supabaseAdmin
      .from('categories')
      .select('name, type')
      .eq('user_id', profile.id);
    const catList = userCategories ? userCategories.map(c => `- ${c.name} (${c.type})`).join('\n  ') : 'Ninguna';

    // Construir historial rápido para Luka (solo 10 recientes para evitar saturar prompt)
    const { data: recentTxsDB } = await supabaseAdmin
      .from('transactions')
      .select('amount, type, description, created_at')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (recentTxsDB) {
      for (let tx of recentTxsDB) {
        recentTxList.push(`- ${tx.type === 'income' ? '+' : '-'}$${tx.amount} | ${tx.description} | Fecha: ${new Date(tx.created_at).toLocaleString()}`);
      }
    }

    // Traer últimos 10 abonos a deudas para el contexto
    const { data: recentPayments } = await supabaseAdmin
      .from('debt_payments')
      .select('amount, created_at, debts(person_name, debt_type)')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentPayments) {
      recentPayments.forEach((p: any) => {
        const typeStr = p.debts?.debt_type === 'i_owe' ? 'Aboné a' : 'Me abonó';
        recentTxList.push(`- Abono de deuda: ${typeStr} ${p.debts?.person_name} $${p.amount} | Fecha: ${new Date(p.created_at).toLocaleString()}`);
      });
    }

    // 3. Extraer Memoria Conversacional de Redis
    const redisKey = `chat_history_${chatId}`;
    const rawHistory = await redis.lrange(redisKey, 0, -1);
    const chatHistory = rawHistory.length > 0 ? rawHistory.join('\n') : "Sin historial reciente.";

    // Construir System Prompt Dinámico
    const botName = profile.bot_alias || 'Luka';
    const userName = profile.full_name || 'Usuario';
    const currentDate = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });

    const systemPrompt = `Eres ${botName}, un asistente financiero personal muy inteligente. Estás ayudando a tu dueño/usuario llamado ${userName}.
Analiza el mensaje (junto con el historial de chat para entender respuestas cortas) y determina la intención usando la estructura JSON.

REGLA CRÍTICA DE DUPLICADOS:
Si el usuario está respondiendo a una pregunta tuya donde pedías información faltante (ej. el método de pago), DEBES recopilar los datos de la interacción anterior, unirlos con la respuesta actual, y marcar is_complete=true. NUNCA pongas is_complete=true si vas a hacer una pregunta. 
REGLA ORO: is_complete = false -> Preguntas. is_complete = true -> Confirmas registro exitoso.

CONTEXTO FINANCIERO ACTUAL DEL USUARIO:
- Fecha y Hora Actual: ${currentDate}
- Patrimonio Total (Bancos + Efectivo + Lo que le deben - Lo que debe): $${patrimonio.toLocaleString('es-CO')}
- Liquidez Disponible para Gastar (Patrimonio Neto Líquido - Ahorros bloqueados en metas): $${availableLiquidity.toLocaleString('es-CO')}
- Presupuesto mensual: $${budgetLimit.toLocaleString('es-CO')} (Gastado: $${gastosMes.toLocaleString('es-CO')}, Disponible: $${budgetRemaining.toLocaleString('es-CO')}).
- Metas de Ahorro Activas (Bolsillos):
  ${savingsList.length > 0 ? savingsList.join('\n  ') : 'Ninguna'}
- Deudas Activas: Debes $${deboTotal.toLocaleString('es-CO')}. Te deben $${meDebenTotal.toLocaleString('es-CO')}.
  ${activeDebtsList.length > 0 ? activeDebtsList.join('\n  ') : 'Ninguna deuda activa'}
- Categorías Existentes:
  ${catList}

HISTORIAL DE MOVIMIENTOS RECIENTES:
${recentTxList.join('\n') || 'Ninguno'}

REGLA SOBRE DINERO Y METAS DE AHORRO:
- "Liquidez Disponible" es el dinero real que el usuario puede gastar ($${availableLiquidity.toLocaleString('es-CO')}). Nunca incluyas el dinero bloqueado en "Metas de Ahorro".
- Si el usuario pregunta "¿Cuánto tengo?", responde con la Liquidez Disponible, pero recuérdale que tiene $${totalSavings.toLocaleString('es-CO')} protegidos en sus metas.
Desglósalo de la siguiente manera:
- 🏦 En Banco: $${bankBalance.toLocaleString('es-CO')}
- 💵 En Efectivo: $${cashBalance.toLocaleString('es-CO')}
- 🎯 Protegido en Metas: $${totalSavings.toLocaleString('es-CO')}

Si pide "crear una meta", action_type="savings_create" (ej. "Quiero ahorrar para un carro, meta 50000").
Si pide "apartar/depositar dinero a una meta" o "sacar dinero de una meta", action_type="savings_deposit" (ej. "Mete 50 al carro". Usa amount negativo para retirar: "Saca 20 del carro").

HISTORIAL DE CHAT RECIENTE:
${chatHistory}`;

    // 4. Llamar a Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      systemInstruction: systemPrompt,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: actionSchema,
      }
    })

    let result;
    const userMessageText = isText ? message.text : 'Nota de voz procesada';

    if (isVoice) {
      const audioBase64 = await getVoiceFileBase64(message.voice.file_id)
      if (!audioBase64) {
        await sendMessage(chatId, "❌ No pude procesar tu nota de voz, ¿puedes intentar de nuevo?")
        return NextResponse.json({ status: 'error' })
      }
      result = await model.generateContent([
        "\nMensaje de audio del usuario:",
        { inlineData: { data: audioBase64, mimeType: "audio/ogg" } }
      ])
    } else {
      result = await model.generateContent(`Nuevo Mensaje del Usuario: "${message.text}"`)
    }

    const jsonStr = result.response.text()
    const parsedData = JSON.parse(jsonStr)

    // 5. Ruteo y Ejecución en Base de Datos
    
    // CASO A: Borrado Total
    if (parsedData.action_type === 'delete_all' && parsedData.is_complete) {
      await Promise.all([
        supabaseAdmin.from('transactions').delete().eq('user_id', profile.id),
        supabaseAdmin.from('debts').delete().eq('user_id', profile.id),
        supabaseAdmin.from('savings_goals').delete().eq('user_id', profile.id),
        supabaseAdmin.from('categories').delete().eq('user_id', profile.id),
        supabaseAdmin.from('debt_payments').delete().eq('user_id', profile.id),
      ]);
      parsedData.response_to_user = "✅ Listo. He eliminado todos tus registros (transacciones, metas, deudas y categorías). Tu cuenta ha vuelto a cero.";
    }
    
    // CASO B: Borrado Único (Último)
    else if (parsedData.action_type === 'delete_last' && parsedData.is_complete) {
      const { data: lastTx } = await supabaseAdmin
        .from('transactions').select('id').eq('user_id', profile.id)
        .order('created_at', { ascending: false }).limit(1).single()
      if (lastTx) {
        await supabaseAdmin.from('transactions').delete().eq('id', lastTx.id)
      }
    }
    
    // CASO C: Transacción Nueva
    else if (parsedData.action_type === 'transaction' && parsedData.is_complete && parsedData.transaction_type !== 'none') {
      let categoryId = null;
      if (parsedData.category_name) {
        const { data: cat } = await supabaseAdmin
          .from('categories').select('id').eq('user_id', profile.id).ilike('name', parsedData.category_name).single()
        
        if (cat) {
          categoryId = cat.id
        } else {
          const { data: newCat } = await supabaseAdmin.from('categories').insert({
            user_id: profile.id, name: parsedData.category_name, type: parsedData.transaction_type, icon: parsedData.category_icon || '🏷️', bucket: parsedData.category_bucket || 'needs'
          }).select('id').single()
          if (newCat) categoryId = newCat.id
        }
      }

      await supabaseAdmin.from('transactions').insert({
        user_id: profile.id,
        category_id: categoryId,
        type: parsedData.transaction_type,
        amount: parsedData.amount,
        payment_method: parsedData.payment_method !== 'none' ? parsedData.payment_method : 'efectivo',
        description: parsedData.description,
        source: isVoice ? 'telegram_voice' : 'telegram_text',
        raw_input: userMessageText,
        transaction_date: currentDate ? new Date().toISOString() : new Date().toISOString()
      })
    }

    // CASO C.1: Transferencia entre métodos de pago
    else if (parsedData.action_type === 'transfer' && parsedData.is_complete) {
      // Retiro del origen
      await supabaseAdmin.from('transactions').insert({
        user_id: profile.id,
        type: 'expense',
        amount: parsedData.amount,
        payment_method: parsedData.payment_method !== 'none' ? parsedData.payment_method : 'banco',
        description: `Transferencia a ${parsedData.destination_method || 'efectivo'}`,
        source: isVoice ? 'telegram_voice' : 'telegram_text'
      });
      // Ingreso al destino
      await supabaseAdmin.from('transactions').insert({
        user_id: profile.id,
        type: 'income',
        amount: parsedData.amount,
        payment_method: parsedData.destination_method !== 'none' ? parsedData.destination_method : 'efectivo',
        description: `Transferencia desde ${parsedData.payment_method || 'banco'}`,
        source: isVoice ? 'telegram_voice' : 'telegram_text'
      });
    }

    // CASO D: Deuda Nueva
    else if (parsedData.action_type === 'debt_create' && parsedData.is_complete) {
      await supabaseAdmin.from('debts').insert({
        user_id: profile.id,
        person_name: parsedData.person_name || 'Desconocido',
        debt_type: parsedData.debt_type,
        total_amount: parsedData.amount,
        balance_remaining: parsedData.amount,
        description: parsedData.description,
        payment_method: parsedData.payment_method !== 'none' ? parsedData.payment_method : 'efectivo'
      })
    }

    // CASO E: Abono a Deuda
    else if (parsedData.action_type === 'debt_payment' && parsedData.is_complete) {
      const { data: existingDebts } = await supabaseAdmin
        .from('debts').select('*').eq('user_id', profile.id).neq('status', 'paid')
        .ilike('person_name', `%${parsedData.person_name}%`).limit(1)

      if (existingDebts && existingDebts.length > 0) {
        const targetDebt = existingDebts[0];
        const newBalance = Math.max(0, Number(targetDebt.balance_remaining) - Number(parsedData.amount));
        const newStatus = newBalance === 0 ? 'paid' : 'pending';

        await supabaseAdmin.from('debt_payments').insert({
          debt_id: targetDebt.id,
          user_id: profile.id,
          amount: parsedData.amount,
          payment_method: parsedData.payment_method !== 'none' ? parsedData.payment_method : 'efectivo'
        });

        await supabaseAdmin.from('debts').update({
          balance_remaining: newBalance,
          status: newStatus
        }).eq('id', targetDebt.id);

        // Crear transacción espejo para evitar agujero de caja
        const paymentType = targetDebt.type === 'i_owe' ? 'expense' : 'income'; // Si debo y pago, es gasto. Si me deben y me pagan, es ingreso.
        await supabaseAdmin.from('transactions').insert({
          user_id: profile.id,
          amount: parsedData.amount,
          type: paymentType,
          description: `Abono de deuda: ${targetDebt.person_name}`,
          category_icon: '💳',
          payment_method: parsedData.payment_method !== 'none' ? parsedData.payment_method : 'efectivo',
          transaction_date: new Date().toISOString()
        });

      } else {
        parsedData.response_to_user = `Lo siento, iba a registrar el abono, pero no encontré ninguna deuda activa a nombre de "${parsedData.person_name}". ¿Puedes decirme el nombre exacto de la persona?`;
      }
    }

    // CASO E.2: Eliminar Deuda
    else if (parsedData.action_type === 'debt_delete' && parsedData.is_complete) {
      const { data: existingDebts } = await supabaseAdmin
        .from('debts').select('*').eq('user_id', profile.id)
        .ilike('person_name', `%${parsedData.person_name}%`).limit(1)

      if (existingDebts && existingDebts.length > 0) {
        await supabaseAdmin.from('debts').delete().eq('id', existingDebts[0].id)
      } else {
        console.warn('Deuda no encontrada para eliminar.')
      }
    }

    // CASO F: Ajuste de Presupuesto Mensual
    else if (parsedData.action_type === 'budget_update' && parsedData.is_complete) {
      await supabaseAdmin.from('profiles').update({
        monthly_budget: parsedData.amount
      }).eq('id', profile.id)
    }

    // CASO F.2: Ajuste de Regla 50/30/20
    else if (parsedData.action_type === 'rule_update' && parsedData.is_complete) {
      const needs = parsedData.needs_percent || 50;
      const wants = parsedData.wants_percent || 30;
      const savings = parsedData.savings_percent || 20;
      
      if (needs + wants + savings === 100) {
        await supabaseAdmin.from('profiles').update({
          needs_percent: needs,
          wants_percent: wants,
          savings_percent: savings
        }).eq('id', profile.id)
      } else {
        parsedData.response_to_user = `No he podido actualizar tu regla porque los porcentajes que me diste (${needs} + ${wants} + ${savings}) no suman el 100%. Por favor indícame los porcentajes correctos.`;
      }
    }

    // CASO G: Crear Meta de Ahorro
    else if (parsedData.action_type === 'savings_create' && parsedData.is_complete) {
      await supabaseAdmin.from('savings_goals').insert({
        user_id: profile.id,
        name: parsedData.goal_name || 'Nueva Meta',
        target_amount: parsedData.amount,
        icon: parsedData.category_icon || '🎯'
      })
    }

    // CASO H: Depositar o Retirar de Meta
    else if (parsedData.action_type === 'savings_deposit' && parsedData.is_complete) {
      // Find the specific goal by name (case insensitive, partial match)
      const { data: searchGoals } = await supabaseAdmin
        .from('savings_goals')
        .select('*')
        .eq('user_id', profile.id)
        .ilike('name', `%${parsedData.goal_name || ''}%`)
        .limit(1)

      if (searchGoals && searchGoals.length > 0) {
        const goal = searchGoals[0]
        const newAmount = Number(goal.current_amount) + Number(parsedData.amount)
        await supabaseAdmin.from('savings_goals').update({
          current_amount: newAmount < 0 ? 0 : newAmount
        }).eq('id', goal.id)

        // Crear transacción espejo para evitar agujero de caja (el dinero pasa de disponible a ahorrado, es una "salida" o gasto técnico)
        const isDeposit = Number(parsedData.amount) > 0;
        await supabaseAdmin.from('transactions').insert({
          user_id: profile.id,
          amount: Math.abs(parsedData.amount),
          type: isDeposit ? 'expense' : 'income',
          description: `Ahorro en meta: ${goal.name}`,
          payment_method: 'transferencia',
          transaction_date: new Date().toISOString()
        });

      } else {
        console.warn('Meta de ahorro no encontrada para depositar.')
      }
    }

    // CASO I: Eliminar Meta de Ahorro
    else if (parsedData.action_type === 'savings_delete' && parsedData.is_complete) {
      const { data: searchGoals } = await supabaseAdmin
        .from('savings_goals')
        .select('*')
        .eq('user_id', profile.id)
        .ilike('name', `%${parsedData.goal_name || ''}%`)
        .limit(1)

      if (searchGoals && searchGoals.length > 0) {
        const goal = searchGoals[0]
        
        // 1. Eliminar la meta
        await supabaseAdmin.from('savings_goals').delete().eq('id', goal.id)

        // 2. Si tenía dinero, devolverlo a la liquidez creando un ingreso espejo
        if (Number(goal.current_amount) > 0) {
          await supabaseAdmin.from('transactions').insert({
            user_id: profile.id,
            amount: Number(goal.current_amount),
            type: 'income',
            description: `Retorno por meta eliminada: ${goal.name}`,
            payment_method: 'transferencia',
            transaction_date: new Date().toISOString()
          })
        }
      } else {
        console.warn('Meta de ahorro no encontrada para eliminar.')
      }
    }

    // 6. Guardar la conversación en la memoria Redis
    await redis.rpush(redisKey, `Usuario: ${userMessageText}`)
    await redis.rpush(redisKey, `${botName}: ${parsedData.response_to_user}`)
    // Mantener solo los últimos 10 mensajes (5 interacciones completas) y añadir TTL de 7 días
    await redis.ltrim(redisKey, -10, -1)
    await redis.expire(redisKey, 86400 * 7)

        // 7. Enviar la respuesta amigable generada por Gemini
        await sendMessage(chatId, parsedData.response_to_user)
      } catch (error) {
        console.error('Error procesando el webhook (after):', error)
        const errStr = String(error);
        if (errStr.includes('429') || errStr.includes('quota') || errStr.includes('Too Many Requests')) {
          await sendMessage(chatId, "⚠️ He alcanzado el límite de operaciones de Google Gemini. Por favor intenta en un minuto.")
        } else {
          await sendMessage(chatId, "⚠️ Ocurrió un error inesperado al procesar tu solicitud. Por favor intenta de nuevo más tarde.")
        }
      }

    // Retornamos HTTP 200 a Telegram
    return NextResponse.json({ status: 'success' })
  } catch (error) {
    console.error('Webhook Error CRITICO:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
