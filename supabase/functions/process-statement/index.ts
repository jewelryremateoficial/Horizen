import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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

// Convierte bytes a base64 por bloques (evita ahogar la memoria con PDFs grandes)
function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000 // 32k por bloque
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as unknown as number[])
  }
  return btoa(binary)
}

// Llama a Claude con reintentos ante errores transitorios (saturación / 5xx / rate limit)
async function callClaude(apiKey: string, messageContent: unknown, maxRetries = 3): Promise<Response> {
  let lastErr = ''
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let res: Response
    try {
      res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 8192, // suficiente para estados con muchos movimientos (antes 4096 cortaba el JSON)
          messages: [{ role: 'user', content: messageContent }],
        }),
      })
    } catch (e) {
      lastErr = 'network: ' + (e as Error).message
      await new Promise(r => setTimeout(r, 1200 * attempt))
      continue
    }
    if (res.ok) return res
    // 429 (rate limit) y 5xx / 529 (saturado) → reintentar
    if (res.status === 429 || res.status >= 500) {
      lastErr = 'HTTP ' + res.status
      await new Promise(r => setTimeout(r, 1500 * attempt))
      continue
    }
    // Otros errores (400, 401, etc.) no se reintentan
    return res
  }
  throw new Error('La IA está saturada en este momento (' + lastErr + '). Intenta de nuevo en unos segundos.')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  let storagePath: string | null = null
  let supabase: ReturnType<typeof createClient> | null = null

  try {
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
    if (!ANTHROPIC_API_KEY) throw new Error('El servicio de análisis no está configurado. Contacta a soporte.')

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const body = await req.json()
    const { storagePath: sp, fileType } = body
    storagePath = sp
    if (!storagePath) throw new Error('No se recibió la ruta del archivo')

    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const { data: fileBlob, error: dlErr } = await supabase.storage.from('statements').download(storagePath)
    if (dlErr) throw new Error('No se pudo leer el archivo subido. Vuelve a intentarlo.')

    const arrayBuffer = await fileBlob.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)

    // Guardia de tamaño (el cliente ya limita, pero por si acaso)
    if (bytes.length > 30 * 1024 * 1024) {
      throw new Error('El archivo es demasiado grande (más de 30MB). Sube un PDF más ligero o divídelo.')
    }
    if (bytes.length === 0) {
      throw new Error('El archivo llegó vacío. Vuelve a subirlo.')
    }

    const isPDF = fileType === 'application/pdf' || (storagePath || '').toLowerCase().endsWith('.pdf')

    let messageContent: unknown
    if (isPDF) {
      const fileBase64 = bytesToBase64(bytes)
      messageContent = [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: fileBase64 } },
        { type: 'text', text: PROMPT },
      ]
    } else {
      const csvText = new TextDecoder().decode(bytes)
      messageContent = [{ type: 'text', text: `${PROMPT}\n\nContenido del CSV:\n${csvText}` }]
    }

    const anthropicRes = await callClaude(ANTHROPIC_API_KEY, messageContent)

    if (!anthropicRes.ok) {
      let detail = ''
      try { detail = JSON.stringify(await anthropicRes.json()) } catch { /* ignore */ }
      // Mensajes claros para casos comunes
      if (anthropicRes.status === 400 && /pdf|page|document/i.test(detail)) {
        throw new Error('No pudimos leer este PDF (puede estar protegido, dañado o ser una imagen escaneada de baja calidad). Intenta con otro archivo o exporta el estado como PDF desde tu banca en línea.')
      }
      throw new Error('El análisis falló temporalmente. Intenta de nuevo en unos segundos.')
    }

    const anthropicData = await anthropicRes.json()
    const stopReason = anthropicData.stop_reason
    const rawText = anthropicData.content?.[0]?.text || ''

    let parsed
    try {
      const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch (_e) {
      if (stopReason === 'max_tokens') {
        throw new Error('El estado tiene demasiados movimientos para procesar de una vez. Sube el estado dividido por mes, o contáctanos.')
      }
      throw new Error('No pudimos leer las transacciones de este archivo. Verifica que sea un estado de cuenta legible (PDF con texto, no una foto).')
    }

    if (!Array.isArray(parsed.transactions) || parsed.transactions.length === 0) {
      throw new Error('No encontramos transacciones en el archivo. Asegúrate de subir un estado de cuenta con movimientos.')
    }

    // Éxito: limpiar el archivo temporal
    await supabase.storage.from('statements').remove([storagePath])

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    // Limpiar el archivo temporal aunque haya fallado (no dejar basura)
    try { if (supabase && storagePath) await supabase.storage.from('statements').remove([storagePath]) } catch { /* ignore */ }
    return new Response(JSON.stringify({ error: (error as Error).message || 'Error procesando el archivo' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
