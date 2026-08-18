import { NextResponse } from 'next/server'
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN!

// Cliente admin para saltar RLS en el webhook
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

// Esquema estricto para Gemini
const transactionSchema = {
  type: SchemaType.OBJECT,
  properties: {
    is_transaction: { 
      type: SchemaType.BOOLEAN, 
      description: "Verdadero si el usuario está reportando un gasto o ingreso. Falso si solo es una charla normal." 
    },
    is_complete: {
      type: SchemaType.BOOLEAN,
      description: "Verdadero si se tiene el monto, la descripción y el método de pago claro."
    },
    amount: { 
      type: SchemaType.NUMBER, 
      description: "Monto de la transacción en positivo. 0 si no aplica." 
    },
    type: { 
      type: SchemaType.STRING, 
      description: "expense para gastos, income para ingresos",
      enum: ["income", "expense", "none"] 
    },
    category_name: { 
      type: SchemaType.STRING, 
      description: "Categoría sugerida (Ej: Alimentación, Transporte, Salario). Vacío si no aplica." 
    },
    payment_method: { 
      type: SchemaType.STRING, 
      description: "Método de pago deducido",
      enum: ["efectivo", "nequi", "daviplata", "banco", "tarjeta", "none"] 
    },
    description: { 
      type: SchemaType.STRING, 
      description: "Breve descripción (Ej: Almuerzo corrientazo)" 
    },
    response_to_user: { 
      type: SchemaType.STRING, 
      description: "Tu respuesta como Luka al usuario. Si faltan datos (ej: método de pago), pregúntalos cálidamente. Si todo está, confirma el registro." 
    }
  },
  required: ["is_transaction", "is_complete", "amount", "type", "category_name", "payment_method", "description", "response_to_user"]
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const message = body.message
    if (!message) return NextResponse.json({ status: 'ignored' })

    const chatId = message.chat.id
    const isVoice = !!message.voice
    const isText = !!message.text

    if (!isVoice && !isText) return NextResponse.json({ status: 'ignored' })

    // 1. Verificar si el usuario está vinculado en Supabase
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('telegram_chat_id', chatId)
      .single()

    if (!profile) {
      const loginUrl = `https://${req.headers.get('host')}/login?chat_id=${chatId}`
      await sendMessage(chatId, `¡Hola! Soy Luka 👋.\nPara poder guardar tus gastos de forma segura, necesito que vincules tu cuenta de Telegram con la plataforma web.\n\nPor favor, inicia sesión aquí: ${loginUrl}`)
      return NextResponse.json({ status: 'unlinked' })
    }

    // Informar al usuario que estamos pensando
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
    })

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: transactionSchema,
      }
    })

    const systemPrompt = "Eres Luka, un asistente financiero personal muy inteligente. Analiza el mensaje y extrae los datos JSON."
    let result;

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
      result = await model.generateContent(`${systemPrompt}\nMensaje: "${message.text}"`)
    }

    const jsonStr = result.response.text()
    const parsedData = JSON.parse(jsonStr)

    // 2. Si es una transacción completa, insertarla en la DB
    if (parsedData.is_transaction && parsedData.is_complete && parsedData.type !== 'none') {
      
      // Buscar o crear categoría
      let categoryId = null;
      if (parsedData.category_name) {
        // Normalizar nombre de categoría para buscar
        const { data: cat } = await supabaseAdmin
          .from('categories')
          .select('id')
          .eq('user_id', profile.id)
          .ilike('name', parsedData.category_name)
          .single()
        
        if (cat) {
          categoryId = cat.id
        } else {
          // Crear categoría nueva
          const { data: newCat } = await supabaseAdmin
            .from('categories')
            .insert({
              user_id: profile.id,
              name: parsedData.category_name,
              type: parsedData.type,
              icon: '🏷️'
            })
            .select('id')
            .single()
          if (newCat) categoryId = newCat.id
        }
      }

      // Insertar Transacción
      await supabaseAdmin.from('transactions').insert({
        user_id: profile.id,
        category_id: categoryId,
        type: parsedData.type,
        amount: parsedData.amount,
        payment_method: parsedData.payment_method !== 'none' ? parsedData.payment_method : 'efectivo',
        description: parsedData.description,
        source: isVoice ? 'telegram_voice' : 'telegram_text',
        raw_input: isText ? message.text : 'Nota de voz'
      })
    }

    // 3. Enviar la respuesta amigable generada por Gemini
    await sendMessage(chatId, parsedData.response_to_user)

    return NextResponse.json({ status: 'success' })
  } catch (error) {
    console.error('Webhook Error CRITICO:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
