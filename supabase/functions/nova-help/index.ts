import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// NOVA flotante: recibe la duda del usuario + un resumen REAL de sus datos
// (calculado en su navegador con su propia sesión) y explica en español simple.
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
    if (!ANTHROPIC_API_KEY) throw new Error('El asistente no está configurado. Contacta a soporte.')
    const { question, context } = await req.json()
    if (!question || String(question).trim().length < 3) throw new Error('Escribe tu pregunta.')

    // ── Límite del plan Emprende: 20 preguntas/mes (Fase 4). Negocio/Empresa: sin límite. ──
    const jwtUser = (req.headers.get('authorization') || '').replace('Bearer ', '')
    let uid: string | null = null
    try { uid = JSON.parse(atob(jwtUser.split('.')[1] || ''))?.sub || null } catch { /* ignore */ }
    if (uid) {
      const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
      const { data: prof } = await admin.from('profiles').select('plan').eq('id', uid).maybeSingle()
      const plan = String(prof?.plan || '').toLowerCase()
      const mes = new Date().toISOString().slice(0, 7)
      const { data: uso } = await admin.from('nova_usage').select('id,count').eq('user_id', uid).eq('month', mes).maybeSingle()
      if ((plan === 'basico' || plan === 'emprende') && (uso?.count || 0) >= 20) {
        throw new Error('Llegaste a tus 20 preguntas del mes en el plan Emprende. En el plan Negocio, NOVA no tiene límite.')
      }
      if (uso) await admin.from('nova_usage').update({ count: (uso.count || 0) + 1 }).eq('id', uso.id)
      else await admin.from('nova_usage').insert({ user_id: uid, month: mes, count: 1 })
    }

    const prompt = `Eres NOVA, el copiloto de Horizen (app mexicana de finanzas para emprendedores). El usuario tiene una duda sobre POR QUÉ ve o no ve algo en su cuenta. Abajo va un resumen REAL de sus datos. Responde en español mexicano, simple y directo (máximo ~120 palabras), sin tecnicismos, y si aplica dile exactamente qué botón o pantalla usar para arreglarlo. Basa tu respuesta SOLO en el contexto; si no alcanza para saberlo con certeza, dilo con honestidad y sugiere qué revisar.

Reglas del producto que puedes usar:
- El Resumen filtra por rango de fechas Y por banco; el banco de cada movimiento viene del estado de cuenta al que pertenece. Los movimientos manuales o en efectivo aparecen como "Sin banco".
- Movimientos "Pago TDC" o transferencias internas NO cuentan como gasto ni ingreso (son entre sus propias cuentas) — se marcan "entre tus cuentas · no cuenta".
- El Estado de Resultados excluye transferencias, Pago TDC e inversiones.
- El efectivo se registra a mano (botón "Registrar efectivo") y lleva fuente "efectivo".
- Al subir un estado: se guarda automáticamente al terminar el análisis; las fechas se anclan al periodo impreso; los PDF con contraseña se desbloquean en el navegador.
- El detector de gastos fijos necesita ~3 meses de historial para sugerir.

CONTEXTO REAL DEL USUARIO (JSON):
${JSON.stringify(context || {}).slice(0, 6000)}

PREGUNTA DEL USUARIO: ${String(question).slice(0, 500)}`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 600, messages: [{ role: 'user', content: prompt }] }),
    })
    if (!res.ok) throw new Error('El asistente está saturado en este momento. Intenta en unos segundos.')
    const d = await res.json()
    const answer = d.content?.[0]?.text || 'No pude generar una respuesta. Intenta de nuevo.'
    return new Response(JSON.stringify({ answer }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message || 'Error' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})
