import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Helpers para interactuar con Telegram API
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN!

async function sendMessage(chatId: string | number, text: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
}

async function getVoiceFileBase64(fileId: string): Promise<string | null> {
  try {
    // 1. Obtener la ruta del archivo
    const pathRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getFile?file_id=${fileId}`)
    const pathData = await pathRes.json()
    if (!pathData.ok) return null
    
    // 2. Descargar el archivo de audio (.oga / .ogg)
    const filePath = pathData.result.file_path
    const audioRes = await fetch(`https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${filePath}`)
    const arrayBuffer = await audioRes.arrayBuffer()
    
    // 3. Convertir a Base64
    return Buffer.from(arrayBuffer).toString('base64')
  } catch (error) {
    console.error('Error descargando audio de Telegram:', error)
    return null
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log('Recibido webhook de Telegram:', JSON.stringify(body))

    const message = body.message
    if (!message) return NextResponse.json({ status: 'ignored' })

    const chatId = message.chat.id
    const isVoice = !!message.voice
    const isText = !!message.text

    if (!isVoice && !isText) {
      return NextResponse.json({ status: 'ignored' })
    }

    if (!process.env.GEMINI_API_KEY || !process.env.TELEGRAM_BOT_TOKEN) {
      console.error('Faltan variables de entorno.')
      await sendMessage(chatId, "⚠️ Error del sistema: Faltan las variables de entorno de Gemini o Telegram en Vercel.")
      return NextResponse.json({ error: 'Missing Envs' })
    }

    // Informar al usuario que estamos pensando...
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
    })

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const systemPrompt = `
Eres Luka, un asistente financiero personal a través de Telegram. 
Actúas de manera cálida, cercana, sin respuestas robóticas.
Responde de forma natural, amigable, confirmando o preguntando los datos faltantes si intentan registrar un gasto o ingreso.
`
    let result;

    if (isVoice) {
      console.log('Procesando nota de voz...')
      const audioBase64 = await getVoiceFileBase64(message.voice.file_id)
      
      if (!audioBase64) {
        await sendMessage(chatId, "❌ No pude procesar tu nota de voz, ¿puedes intentar de nuevo o escribirlo?")
        return NextResponse.json({ status: 'error' })
      }

      result = await model.generateContent([
        systemPrompt + "\nEl usuario te ha enviado el siguiente mensaje de audio. Transcríbelo mentalmente y respóndele:",
        {
          inlineData: {
            data: audioBase64,
            mimeType: "audio/ogg"
          }
        }
      ])
    } else {
      console.log('Procesando mensaje de texto...')
      result = await model.generateContent(`${systemPrompt}\nEl usuario dice: "${message.text}"`)
    }

    const responseText = result.response.text()
    await sendMessage(chatId, responseText)

    return NextResponse.json({ status: 'success' })
  } catch (error) {
    console.error('Webhook Error CRITICO:', error)
    // Intentar avisarle al usuario si es posible
    try {
      const body = await req.clone().json()
      if (body?.message?.chat?.id) {
        await sendMessage(body.message.chat.id, "⚠️ Luka está teniendo problemas técnicos con su IA en este momento.")
      }
    } catch(e) {}
    
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
