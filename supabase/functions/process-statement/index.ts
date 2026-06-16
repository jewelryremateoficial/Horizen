import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PROMPT = `Eres un experto en estados de cuenta bancarios mexicanos.
Analiza este estado de cuenta y extrae TODAS las transacciones que encuentres.

Para cada transacción devuelve:
- date: fecha en formato YYYY-MM-DD (si no hay año usa el año del periodo del estado)
- description: descripción limpia y legible del movimiento (máximo 80 caracteres)
- amount: monto en números positivos sin signos (ejemplo: 1234.56)
- type: "ingreso" si entró dinero a la cuenta, "egreso" si salió dinero
- category: elige la más apropiada de: Nómina, Renta, Comida, Transporte, Servicios, Entretenimiento, Transferencia, SAT/Impuestos, Salud, Educación, Otros

Responde ÚNICAMENTE con JSON válido y sin texto adicional ni markdown:
{"bank":"nombre del banco","period_start":"YYYY-MM-DD","period_end":"YYYY-MM-DD","currency":"MXN","transactions":[{"date":"YYYY-MM-DD","description":"descripción","amount":1234.56,"type":"egreso","category":"Servicios"}]}`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
    if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY no está configurada en los secretos de Supabase')

    const body = await req.json()
    const { fileBase64, fileType, fileName } = body

    if (!fileBase64) throw new Error('No se recibió el archivo')

    const isPDF = fileType === 'application/pdf' || fileName?.toLowerCase().endsWith('.pdf')

    let messageContent
    if (isPDF) {
      messageContent = [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: fileBase64 }
        },
        { type: 'text', text: PROMPT }
      ]
    } else {
      const csvText = atob(fileBase64)
      messageContent = [{ type: 'text', text: `${PROMPT}\n\nContenido del archivo CSV:\n${csvText}` }]
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'pdfs-2024-09-25',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [{ role: 'user', content: messageContent }]
      })
    })

    if (!anthropicRes.ok) {
      const err = await anthropicRes.json()
      throw new Error('Error de Claude API: ' + JSON.stringify(err))
    }

    const anthropicData = await anthropicRes.json()
    const rawText = anthropicData.content?.[0]?.text || ''

    let parsed
    try {
      const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch (_e) {
      throw new Error('La IA no devolvió JSON válido. Intenta con otro archivo.')
    }

    if (!Array.isArray(parsed.transactions)) {
      throw new Error('No se encontraron transacciones en el archivo')
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
