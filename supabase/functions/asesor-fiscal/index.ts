import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { FICHAS_FISCALES } from "./fichas-fiscales.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Limpia el historial que manda el navegador: solo turnos user/assistant con texto,
// cada uno recortado a 2500 chars, máx 24, alternados y empezando en user.
function sanitizarHistorial(h: unknown): { role: 'user' | 'assistant'; content: string }[] {
  if (!Array.isArray(h)) return []
  const limpio: { role: 'user' | 'assistant'; content: string }[] = []
  for (const t of h) {
    if (!t || typeof t !== 'object') continue
    const role = (t as Record<string, unknown>).role
    const content = (t as Record<string, unknown>).content
    if (role !== 'user' && role !== 'assistant') continue
    if (typeof content !== 'string') continue
    const texto = content.slice(0, 2500).trim()
    if (!texto) continue
    if (limpio.length && limpio[limpio.length - 1].role === role) continue
    limpio.push({ role, content: texto })
  }
  let arr = limpio.slice(-24)
  while (arr.length && arr[0].role !== 'user') arr.shift()
  while (arr.length && arr[arr.length - 1].role !== 'assistant') arr.pop()
  return arr
}

// Asesor Fiscal de Horizen: orientación fiscal mexicana con los datos REALES
// del usuario (calculados en su navegador con su propia sesión). Todo privado.
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
    if (!ANTHROPIC_API_KEY) throw new Error('El asesor no está configurado. Contacta a soporte.')
    const { question, context, history } = await req.json()
    if (!question || String(question).trim().length < 3) throw new Error('Escribe tu pregunta.')
    const historial = sanitizarHistorial(history)

    // ── Seguridad: SOLO usuarios con sesión válida (verificada, no solo decodificada).
    // Sin esto, cualquiera con la anon key podría quemar la API de IA sin tener cuenta.
    const jwtUser = (req.headers.get('authorization') || '').replace('Bearer ', '')
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: userData, error: authErr } = await admin.auth.getUser(jwtUser)
    const uid = userData?.user?.id
    if (authErr || !uid) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión para usar el asesor.')

    // ── Límite Emprende: 20 consultas/mes. Negocio/Empresa: sin límite. ──
    // La consulta se cobra hasta DESPUÉS de obtener respuesta: si la IA falla, no gasta cupo.
    const { data: prof } = await admin.from('profiles').select('plan').eq('id', uid).maybeSingle()
    const plan = String(prof?.plan || '').toLowerCase()
    const mes = new Date().toISOString().slice(0, 7)
    const { data: uso } = await admin.from('fiscal_usage').select('id,count').eq('user_id', uid).eq('month', mes).maybeSingle()
    if ((plan === 'basico' || plan === 'emprende') && (uso?.count || 0) >= 20) {
      throw new Error('Llegaste a tus 20 consultas fiscales del mes en el plan Emprende. En el plan Negocio, el Asesor Fiscal no tiene límite.')
    }
    const cobrarConsulta = async () => {
      if (uso) await admin.from('fiscal_usage').update({ count: (uso.count || 0) + 1 }).eq('id', uso.id)
      else await admin.from('fiscal_usage').insert({ user_id: uid, month: mes, count: 1 })
    }

    const system = `Eres el ASESOR FISCAL de Horizen (app mexicana de finanzas para negocios). Das orientación fiscal mexicana clara, práctica y honesta, usando las FICHAS FISCALES de abajo y los DATOS REALES del usuario. Hablas español mexicano, cálido y directo, sin tecnicismos innecesarios — y cuando uses un término fiscal, lo explicas en una frase.

CÓMO TRABAJAS:
- Responde SIEMPRE aterrizando a los números del usuario cuando el contexto los traiga (sus ingresos, gastos, su tasa de ISR configurada). Una orientación con SUS cifras vale diez veces más que teoría.
- Si la pregunta es de decisión (¿compro o rento?, ¿me cambio de régimen?, ¿me conviene X?), da el marco de la ficha + el análisis con sus números + una recomendación tentativa, y cierra con la validación del contador.
- Si el contexto no alcanza, dilo con honestidad y di exactamente qué dato falta. JAMÁS inventes cifras, tasas ni artículos de ley.
- Sé útil de verdad: da pasos concretos ("factura esto", "pide CFDI de aquello", "aparta tanto"), no sermones.

LÍMITES (obligatorios):
- Eres orientación educativa, NO asesoría legal ni sustituto del contador. En decisiones importantes (cambio de régimen, compras fuertes, requerimientos del SAT) cierra SIEMPRE con: "valídalo con tu contador antes de moverte".
- Cifras y topes de ley: preséntalos como "de ley vigente — confírmalo", porque cambian con reformas.
- NUNCA sugieras evasión, facturas falsas ni simulaciones. Estrategia = pagar lo justo dentro de la ley.

CÓMO ESCRIBIR (el chat es angosto, se ve en celular):
- **Negritas** para cifras y conceptos clave, viñetas con "- " para listas. NO tablas, NO títulos con #, NO bloques de código.
- Montos en pesos formato mexicano: $12,345.67.
- Tan largo como haga falta y tan corto como se pueda.

${FICHAS_FISCALES}

CONTEXTO REAL DEL USUARIO (JSON, privado, solo de él):
${JSON.stringify(context || {}).slice(0, 30000)}`

    const messages = [...historial, { role: 'user', content: String(question).slice(0, 1000) }]

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      // Opus 5 con effort medium: las preguntas fiscales de decisión merecen más razonamiento
      // que un chat normal. El "pensamiento" cuenta dentro de max_tokens, por eso el margen.
      body: JSON.stringify({ model: 'claude-opus-5', max_tokens: 4000, output_config: { effort: 'medium' }, system, messages }),
    })
    if (!res.ok) throw new Error('El asesor está saturado en este momento. Intenta en unos segundos.')
    const d = await res.json()
    if (d.stop_reason === 'refusal') throw new Error('No pude responder esa consulta. Intenta plantearla de otra forma.')
    // Opus 5 puede devolver bloques "thinking" intercalados: juntar TODOS los bloques de texto
    const texto = (d.content || []).filter((b: { type?: string }) => b.type === 'text')
      .map((b: { text?: string }) => b.text || '').join('\n').trim()
    if (texto && cobrarConsulta) { try { await cobrarConsulta() } catch { /* no bloquear la respuesta */ } }
    const answer = texto || 'No pude generar una respuesta. Intenta de nuevo.'
    return new Response(JSON.stringify({ answer }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message || 'Error' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})
