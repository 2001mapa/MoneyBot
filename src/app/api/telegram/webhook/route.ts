import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const message = body.message

    // Si no es un mensaje de texto válido, lo ignoramos para no fallar
    if (!message || !message.text) {
      return NextResponse.json({ status: 'ignored' })
    }

    const chatId = message.chat.id
    const userMessage = message.text

    // Inicializar Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `
Eres Luka, un asistente financiero personal a través de Telegram. 
Actúas de manera cálida, cercana, sin respuestas robóticas.
El usuario te ha dicho: "${userMessage}"
Responde de forma natural, amigable, confirmando o preguntando los datos faltantes si intentan registrar un gasto o ingreso.
`

    const result = await model.generateContent(prompt)
    const responseText = result.response.text()

    // Enviar respuesta a Telegram
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: responseText,
      }),
    })

    return NextResponse.json({ status: 'success' })
  } catch (error) {
    console.error('Webhook Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
