import { NextResponse, after } from 'next/server'
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
      enum: ["transaction", "debt_create", "debt_payment", "budget_update", "query", "delete_last", "delete_all", "none"]
    },
    is_complete: { 
      type: SchemaType.BOOLEAN, 
      description: "CRÍTICO: True SOLO si tienes TODOS los datos (monto, tipo, método de pago, descripción) y vas a registrarlo YA. False si te falta algún dato y vas a preguntarlo en response_to_user. NUNCA pongas True si vas a preguntar o pedir confirmación de algo." 
    },
    amount: { 
      type: SchemaType.NUMBER, 
      description: "Monto involucrado (transacción, deuda, abono o presupuesto). 0 si no aplica." 
    },
    transaction_type: { 
      type: SchemaType.STRING, 
      description: "expense o income (solo para action_type=transaction)", 
      format: "enum",
      enum: ["expense", "income", "none"] 
    },
    category_name: { 
      type: SchemaType.STRING, 
      description: "Categoría sugerida (Ej: Alimentación, Transporte, Salario). Vacío si no aplica." 
    },
    payment_method: { 
      type: SchemaType.STRING, 
      description: "Método de pago deducido",
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
    const body = await req.json()
    const message = body.message
    if (!message) return NextResponse.json({ status: 'ignored' })

    const chatId = message.chat.id
    const isVoice = !!message.voice
    const isText = !!message.text

    if (!isVoice && !isText) return NextResponse.json({ status: 'ignored' })

    // Delegar el procesamiento pesado en background con `after()`
    after(async () => {
      try {
        // 1. Verificar si el usuario está vinculado
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('telegram_chat_id', chatId)
          .single()

        if (!profile) {
          const loginUrl = `https://${req.headers.get('host')}/login?chat_id=${chatId}`
          await sendMessage(chatId, `¡Hola! Soy Luka 👋.\nPara poder gestionar tus finanzas, necesito que vincules tu cuenta de Telegram con la plataforma web.\n\nPor favor, inicia sesión aquí: ${loginUrl}`)
          return
        }

        // Informar que estamos pensando
        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendChatAction`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
        })

    // 2. Extraer Contexto Financiero de Supabase
    // Traer todas las transacciones para calcular balance
    const { data: allTxs } = await supabaseAdmin
      .from('transactions')
      .select('amount, type, description, created_at')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })

    let balanceTotal = 0;
    let gastosMes = 0;
    const last3Txs: string[] = [];

    if (allTxs) {
      for (let i = 0; i < allTxs.length; i++) {
        const tx = allTxs[i];
        if (tx.type === 'income') balanceTotal += Number(tx.amount);
        if (tx.type === 'expense') {
          balanceTotal -= Number(tx.amount);
          gastosMes += Number(tx.amount);
        }
        if (i < 3) {
          last3Txs.push(`- ${tx.type === 'income' ? '+' : '-'}$${tx.amount} (${tx.description})`);
        }
      }
    }

    // Traer deudas para resumen
    const { data: allDebts } = await supabaseAdmin
      .from('debts')
      .select('person_name, debt_type, balance_remaining')
      .eq('user_id', profile.id)
      .neq('status', 'paid')

    let deboTotal = 0;
    let meDebenTotal = 0;
    const activeDebtsList: string[] = [];

    if (allDebts) {
      allDebts.forEach(d => {
        if (d.debt_type === 'i_owe') {
          deboTotal += Number(d.balance_remaining);
          activeDebtsList.push(`Debo a ${d.person_name}: $${d.balance_remaining}`);
        }
        if (d.debt_type === 'they_owe') {
          meDebenTotal += Number(d.balance_remaining);
          activeDebtsList.push(`${d.person_name} me debe: $${d.balance_remaining}`);
        }
      });
    }

    // El balance real en el bolsillo es: lo que me ingresó - lo que gasté + lo que me prestaron - lo que presté
    balanceTotal = balanceTotal + deboTotal - meDebenTotal;

    const budgetLimit = Number(profile.monthly_budget) || 0;
    const budgetRemaining = budgetLimit > 0 ? budgetLimit - gastosMes : 0;

    // Traer categorías del usuario
    const { data: userCategories } = await supabaseAdmin
      .from('categories')
      .select('name, type')
      .eq('user_id', profile.id);
    const catList = userCategories ? userCategories.map(c => `- ${c.name} (${c.type})`).join('\n  ') : 'Ninguna';

    // Construir historial de transacciones ampliado (hasta 50)
    const recentTxList: string[] = [];
    if (allTxs) {
      for (let i = 0; i < Math.min(allTxs.length, 50); i++) {
        const tx = allTxs[i];
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
- Liquidez Real en Bolsillo (Saldo Total): $${balanceTotal.toLocaleString('es-CO')} ${profile.currency}. (Éste es el dinero FÍSICO/REAL que tiene el usuario en sus manos ahora mismo).
- Presupuesto mensual: $${budgetLimit.toLocaleString('es-CO')} (Gastado: $${gastosMes.toLocaleString('es-CO')}, Disponible en Presupuesto: $${budgetRemaining.toLocaleString('es-CO')}).
- Deudas Totales: Debes $${deboTotal.toLocaleString('es-CO')}. Te deben $${meDebenTotal.toLocaleString('es-CO')}.
- Lista de Deudas Activas (¡ÚSALAS PARA INFERIR EL NOMBRE DE LA PERSONA CUANDO HAGAN ABONOS!): 
  ${activeDebtsList.length > 0 ? activeDebtsList.join('\n  ') : 'Ninguna'}
- Categorías Existentes (Si aplica, usa una de estas en lugar de inventar nuevas):
  ${catList}

HISTORIAL DE MOVIMIENTOS RECIENTES (Úsalo para responder consultas precisas sobre en qué gastó, fechas, o últimos abonos):
${recentTxList.join('\n') || 'Ninguno'}

REGLA SOBRE DINERO DISPONIBLE:
Si el usuario te pregunta "¿Cuánto tengo?", "¿Cuánto puedo gastar?" o "¿Cuál es mi saldo?", debes responder SIEMPRE con su "Liquidez Real en Bolsillo" ($${balanceTotal.toLocaleString('es-CO')}). 
Si el "Disponible en Presupuesto" es MAYOR a la "Liquidez Real", ADVÍERTELE: "Tu presupuesto te permite gastar $${budgetRemaining.toLocaleString('es-CO')}, PERO ten cuidado, en tu bolsillo solo tienes $${balanceTotal.toLocaleString('es-CO')} reales porque has prestado dinero o pagado cosas fuera de presupuesto." NUNCA lo dejes confiarse de un presupuesto si no tiene la liquidez para pagarlo.

HISTORIAL DE CHAT RECIENTE:
${chatHistory}`;

    // 4. Llamar a Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
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
        systemPrompt + "\nMensaje de audio del usuario:",
        { inlineData: { data: audioBase64, mimeType: "audio/ogg" } }
      ])
    } else {
      result = await model.generateContent(`${systemPrompt}\nNuevo Mensaje del Usuario: "${message.text}"`)
    }

    const jsonStr = result.response.text()
    const parsedData = JSON.parse(jsonStr)

    // 5. Ruteo y Ejecución en Base de Datos
    
    // CASO A: Borrado Total
    if (parsedData.action_type === 'delete_all' && parsedData.is_complete) {
      await supabaseAdmin.from('transactions').delete().eq('user_id', profile.id)
      await supabaseAdmin.from('debts').delete().eq('user_id', profile.id)
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
            user_id: profile.id, name: parsedData.category_name, type: parsedData.transaction_type, icon: '🏷️'
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
        raw_input: userMessageText
      })
    }

    // CASO D: Deuda Nueva
    else if (parsedData.action_type === 'debt_create' && parsedData.is_complete) {
      await supabaseAdmin.from('debts').insert({
        user_id: profile.id,
        person_name: parsedData.person_name || 'Desconocido',
        debt_type: parsedData.debt_type,
        total_amount: parsedData.amount,
        balance_remaining: parsedData.amount,
        description: parsedData.description
      })
    }

    // CASO E: Abono a Deuda (Aún experimental, requiere buscar la deuda correcta)
    else if (parsedData.action_type === 'debt_payment' && parsedData.is_complete) {
      // Buscar deuda más coincidente por person_name
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
      } else {
        // Fallback si Gemini asume que hizo el pago pero la DB no encontró la deuda
        parsedData.response_to_user = `Lo siento, iba a registrar el abono, pero no encontré ninguna deuda activa a nombre de "${parsedData.person_name}". ¿Puedes decirme el nombre exacto de la persona?`;
      }
    }

    // CASO F: Ajuste de Presupuesto
    else if (parsedData.action_type === 'budget_update' && parsedData.is_complete) {
      await supabaseAdmin.from('profiles').update({
        monthly_budget: parsedData.amount
      }).eq('id', profile.id)
    }

    // 6. Guardar la conversación en la memoria Redis
    await redis.rpush(redisKey, `Usuario: ${userMessageText}`)
    await redis.rpush(redisKey, `Luka: ${parsedData.response_to_user}`)
    // Mantener solo los últimos 10 mensajes (5 interacciones completas)
    await redis.ltrim(redisKey, -10, -1)

        // 7. Enviar la respuesta amigable generada por Gemini
        await sendMessage(chatId, parsedData.response_to_user)
      } catch (error) {
        console.error('Error dentro del background task (after):', error)
        const errStr = String(error);
        if (errStr.includes('429') || errStr.includes('quota') || errStr.includes('Too Many Requests')) {
          await sendMessage(chatId, "¡Woah, vas muy rápido! 😅 He alcanzado mi límite de mensajes por minuto. Dame un respiro de 60 segundos y vuelve a intentarlo.")
        } else {
          await sendMessage(chatId, "Ups, tuve un error interno al procesar tu mensaje. Intenta de nuevo más tarde.")
        }
      }
    });

    // Retornamos HTTP 200 inmediatamente a Telegram para evitar retries infinitos
    return NextResponse.json({ status: 'success', message: 'Delegated to background task' })
  } catch (error) {
    console.error('Webhook Error CRITICO:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
