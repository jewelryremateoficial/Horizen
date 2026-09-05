import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { FORMATO_BANCOS } from "./formato-bancos.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Formato COMPACTO: una línea por transacción (mucho más eficiente en tokens que JSON,
// así caben cientos de movimientos en una sola respuesta sin cortarse).
const PROMPT = `Analiza este estado de cuenta bancario mexicano y extrae TODAS las transacciones (no inventes ni omitas ninguna).

Responde ÚNICAMENTE en texto plano, SIN markdown, SIN comentarios, SIN encabezados.
Formato EXACTO, campos separados por | (barra vertical):

Primera línea (metadatos):
#META|<banco>|<period_start YYYY-MM-DD>|<period_end YYYY-MM-DD>|<moneda>|<total_depositos>|<num_depositos>|<total_retiros>|<num_retiros>|<tipo_cuenta>|<saldo_inicial>|<saldo_final>
Los campos 6 a 9 salen del RESUMEN impreso del propio estado (en débito: la tabla "Depósitos/Abonos" y "Retiros/Cargos"; en tarjeta de crédito: "Total de cargos" / "Total de abonos", que algunos bancos imprimen como "Total Cargos" / "Total Abonos"). Montos sin signo ni comas. Si el documento no trae ese resumen, deja esos campos vacíos.
El campo <tipo_cuenta> es OBLIGATORIO y solo admite dos valores: escribe "tdc" si es un estado de TARJETA DE CRÉDITO (lo reconoces por fecha de corte, pago mínimo, límite de crédito) o "debito" si es cuenta de débito, nómina o cheques. La app lo usa para saber de qué lado va cada pago; no lo dejes vacío.
Los campos 11 y 12 son los SALDOS impresos en el estado (el usuario quiere saber cuánto le quedó en el banco sin abrir el PDF): saldo_inicial = "Saldo anterior/inicial" (en tarjeta: "Adeudo del periodo anterior") y saldo_final = "Saldo final/actual/al corte" (en tarjeta: "Saldo deudor total"). Cópialos TAL CUAL los imprime el banco, con signo negativo si aparecen en negativo, sin comas. Si el documento no los imprime, déjalos vacíos — NUNCA los calcules tú.

Una línea por transacción:
<YYYY-MM-DD>|<descripción sin barras, máx 100 caracteres>|<monto positivo sin signo>|<ingreso o egreso>|<categoría>

CONCEPTO (crítico para el usuario):
- En transferencias, SPEI y pagos, la descripción DEBE incluir el beneficiario Y el concepto/referencia que escribió quien envió el dinero (ej: "SPEI A JUAN PEREZ · NOMINA SEMANA 22", "TRANSFERENCIA · COMPRA MERCANCIA MAYO"). Dos transferencias del mismo monto deben poder distinguirse por su concepto.
- Si el movimiento trae leyenda o referencia adicional en una segunda línea del PDF, inclúyela en la descripción.

LOS RENGLONES DE RESUMEN NO SON MOVIMIENTOS (error real, no lo repitas):
Un estado trae, además de la lista de movimientos, renglones de TOTALES y títulos de tabla.
Esos NUNCA se extraen como transacción. Van al #META o se ignoran, jamás a la lista.
Prohibido convertir en movimiento cualquiera de estos: "PAGOS Y ABONOS", "TOTAL DE CARGOS",
"TOTAL DE ABONOS", "SALDO ANTERIOR", "SALDO DEUDOR", "ADEUDO DEL PERIODO ANTERIOR",
"PAGO MÍNIMO", "SU PAGO REQUERIDO", "LÍMITE DE CRÉDITO", "DESGLOSE DE MOVIMIENTOS",
"CARGOS, ABONOS Y COMPRAS REGULARES", "COMPRAS A MESES SIN INTERESES".
Señal de alarma: si un renglón lleva por monto justo la SUMA de otros renglones, es un total, no un movimiento.

CONCILIACIÓN (antes de terminar):
- Si el estado imprime cuántos depósitos y retiros tiene y sus totales, tu lista DEBE coincidir en número y suma. Si no coincide, revisa qué movimiento te faltó o duplicaste.
- En TARJETA DE CRÉDITO, comprueba también esto antes de entregar: la suma de todo lo que marcaste como INGRESO debe dar el "Total de abonos", y la suma de todo lo que marcaste como EGRESO debe dar el "Total de cargos". Si te salen cambiados, es que volteaste los tipos: los pagos A la tarjeta son INGRESO.

CÓMO DECIDIR ingreso o egreso (crítico, no te equivoques):
- "ingreso" = el dinero ENTRA a la cuenta: depósitos, abonos, SPEI/transferencia RECIBIDA, devoluciones, intereses a favor. En el estado suele venir en la columna de ABONOS o con (+).
- "egreso" = el dinero SALE de la cuenta: compras, pagos, cargos, comisiones, retiros, SPEI/transferencia ENVIADA, domiciliaciones. Suele venir en la columna de CARGOS o con (-).
- Guíate por la COLUMNA (cargo vs abono), no solo por la palabra.

⚠️ SI ES ESTADO DE TARJETA DE CRÉDITO (detéctalo si ves "tarjeta de crédito", "TDC", límite de crédito, pago mínimo, fecha de corte):
- Los PAGOS que se hacen A la tarjeta son INGRESO (reducen el saldo). Detéctalos por textos como: "PAGO", "SU PAGO", "GRACIAS POR SU PAGO", "BMOVIL PAGO", "BMOBILE PAGO", "PAGO TDC", "PAGO TARJETA", "PAGO RECIBIDO", "PAGO SPEI", "ABONO". Ponles categoría "Pago TDC".
- Las COMPRAS, CARGOS, DISPOSICIONES DE EFECTIVO, INTERESES y COMISIONES son EGRESO.
- Es MUY común equivocarse aquí: un "BMOBILE PAGO TDC" NO es un gasto, es un INGRESO (el pago que abona a la tarjeta).

CÓMO elegir la categoría — USA TU CONOCIMIENTO DEL MUNDO. Tú conoces la mayoría de los comercios, plataformas y servicios que aparecen en un estado de cuenta; identifícalos y clasifícalos aunque el texto venga abreviado. "Otros" es el ÚLTIMO recurso, solo para descripciones verdaderamente irreconocibles.

Categorías permitidas:
Ventas, Proveedores, Mercancía (compra de producto para el negocio), Nómina, Publicidad, Software, Papelería, Renta, Contabilidad, Servicios (luz/agua/internet/teléfono), Envíos (paquetería y logística), Honorarios, Comisiones (cargos bancarios), Comida (restaurantes/café), Supermercado, Farmacia, Salud, Entretenimiento (SOLO ocio claro: cine, streaming, bar), Ropa, Transporte (gasolina/casetas/Uber), Viajes (hoteles/vuelos/hospedaje), SAT/Impuestos, Transferencia (SPEI y traspasos entre cuentas), Pago TDC (pagos a tarjetas de crédito, propias o de terceros), Inversiones, Educación, Otros.

Ejemplos de cómo aplicar tu conocimiento (mismo criterio para comercios similares):
- ALIBABA, ALIEXPRESS, TEMU, SHEIN, AMAZON compra → Mercancía
- MARRIOTT, HILTON, CITY EXPRESS, HOTELES, AIRBNB, EXPEDIA, VOLARIS, AEROMEXICO, VIVA AEROBUS → Viajes
- DHL, FEDEX, ESTAFETA, UPS, PAQUETEXPRESS, 99MINUTOS → Envíos
- FACEBK/META ADS, GOOGLE ADS, TIKTOK ADS → Publicidad
- GODADDY, CANVA, ADOBE, OPENAI, SHOPIFY, HOSTINGER, MICROSOFT, GOOGLE WORKSPACE → Software
- NETFLIX, SPOTIFY, CINEPOLIS, HBO → Entretenimiento
- OXXO, 7 ELEVEN → Comida · WALMART, SORIANA, CHEDRAUI, COSTCO → Supermercado
- UBER → Transporte · UBER EATS, RAPPI, DIDI FOOD → Comida
- PEMEX, gasolineras, casetas, estacionamientos → Transporte
- Cualquier SPEI, traspaso o transferencia entre cuentas → "Transferencia".

FECHAS (regla de oro):
- El AÑO de cada fecha sale del PERIODO impreso en el estado. Está PROHIBIDO usar un año que no aparezca en el documento.
- El año del PERIODO también debe estar IMPRESO en el documento (aunque sea abreviado, ej. "JUL/25" = 2025). Si el documento NO imprime el año del periodo en NINGUNA parte, deja el periodo vacío (#META|banco|||...) — NUNCA supongas el año actual ni ningún otro.
- Antes de terminar, verifica que TODAS tus fechas caigan dentro del periodo del estado.

Reglas finales:
- Si falta el año en una fecha, usa el año del periodo del estado.
- Las fechas de las transacciones SIEMPRE llevan año en formato YYYY-MM-DD. Si el documento no imprime NINGÚN año (y por tanto dejaste el periodo vacío), usa el año actual en las fechas de las transacciones — la app se lo confirmará al usuario.
- No agregues ninguna línea que no sea #META o una transacción.

Ejemplo:
#META|BBVA|2026-04-22|2026-05-21|MXN|55000.00|3|48120.00|12|debito|12500.50|19380.50
2026-04-23|OXXO SUCURSAL 123|120.00|egreso|Comida
2026-04-25|SPEI RECIBIDO JUAN PEREZ · ANTICIPO PEDIDO 44|5000.00|ingreso|Transferencia
${FORMATO_BANCOS}`

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as unknown as number[])
  }
  return btoa(binary)
}

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
          // Opus 5 (decisión de Eduardo 2026-08): máxima precisión leyendo estados de cuenta.
          // effort:low = pensamiento mínimo → velocidad y costo controlados sin perder lectura.
          model: 'claude-opus-5',
          max_tokens: 32000, // en Opus 5 el "pensamiento" cuenta dentro de max_tokens; margen extra
          output_config: { effort: 'low' },
          messages: [{ role: 'user', content: messageContent }],
        }),
      })
    } catch (e) {
      lastErr = 'network: ' + (e as Error).message
      await new Promise(r => setTimeout(r, 1200 * attempt))
      continue
    }
    if (res.ok) return res
    if (res.status === 429 || res.status >= 500) {
      lastErr = 'HTTP ' + res.status
      await new Promise(r => setTimeout(r, 1500 * attempt))
      continue
    }
    return res
  }
  throw new Error('La IA está saturada en este momento (' + lastErr + '). Intenta de nuevo en unos segundos.')
}

const CATS = ['Ventas','Proveedores','Mercancía','Nómina','Publicidad','Software','Papelería','Renta','Contabilidad','Servicios','Envíos','Honorarios','Comisiones','Comida','Café','Supermercado','Farmacia','Salud','Entretenimiento','Ropa','Transporte','Viajes','SAT/Impuestos','Transferencia','Pago TDC','Inversiones','Educación','Otros']

// Renglones que son TOTALES o títulos de tabla, no movimientos. La IA a veces los
// extrae como si fueran una transacción (caso real: "PAGOS Y ABONOS" por $190,931,
// que era el total impreso de los abonos, no un pago). Se descartan aquí, sin depender
// del prompt. La lista es de encabezados completos, no de fragmentos, para no tirar
// por error el nombre de un comercio.
const _norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim()
const FILAS_DE_RESUMEN = [
  /^pagos? y abonos$/,
  /^total (de )?(cargos|abonos|compras|movimientos|depositos|retiros)( del periodo)?$/,
  /^(saldo|adeudo) (anterior|deudor( total)?|al corte|del periodo anterior|total)$/,
  /^(su )?pago (minimo|requerido)( este periodo)?$/,
  /^limite de credito$/,
  /^desglose de movimientos$/,
  /^cargos, abonos y compras.*$/,
  /^compras a meses.*$/,
  /^resumen( del periodo)?$/,
]
const esFilaDeResumen = (desc: string) => { const d = _norm(desc); return FILAS_DE_RESUMEN.some(rx => rx.test(d)) }

// Parsea el formato compacto (líneas separadas por |) a la estructura que espera el frontend.
function parseCompact(text: string) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  let bank = 'Desconocido', period_start: string | null = null, period_end: string | null = null, currency = 'MXN'
  let summary: Record<string, number | null> | null = null
  let esTdc = false
  let saldo_inicial: number | null = null, saldo_final: number | null = null
  const transactions: Array<Record<string, unknown>> = []
  for (const line of lines) {
    if (line.startsWith('#META')) {
      const p = line.split('|')
      if (p[1]) bank = p[1].trim()
      if (p[2] && /\d{4}-\d{2}-\d{2}/.test(p[2])) period_start = p[2].trim()
      if (p[3] && /\d{4}-\d{2}-\d{2}/.test(p[3])) period_end = p[3].trim()
      if (p[4]) currency = p[4].trim()
      // Resumen impreso del estado (para conciliar contra lo extraído)
      const num = (v?: string) => { const n = parseFloat(String(v || '').replace(/[^0-9.]/g, '')); return isFinite(n) && n > 0 ? n : null }
      const depTotal = num(p[5]), depCount = num(p[6]), retTotal = num(p[7]), retCount = num(p[8])
      if (depTotal || retTotal) summary = { dep_total: depTotal, dep_count: depCount, ret_total: retTotal, ret_count: retCount }
      const tc = _norm(p[9] || '')
      if (tc.includes('tdc') || tc.includes('credito') || tc.includes('tarjeta')) esTdc = true
      // Saldos impresos (pueden ser negativos o cero, por eso no usan num())
      const numLibre = (v?: string) => { const s = String(v || '').trim(); if (!s) return null; let n = parseFloat(s.replace(/[^0-9.\-]/g, '')); if (/-\s*$/.test(s)) n = -Math.abs(n); return isFinite(n) ? n : null }
      saldo_inicial = numLibre(p[10])
      saldo_final = numLibre(p[11])
      continue
    }
    if (line.startsWith('```') || line.startsWith('#')) continue
    const p = line.split('|')
    if (p.length < 4) continue
    const date = (p[0] || '').trim()
    if (!/\d{4}-\d{2}-\d{2}/.test(date)) continue
    const amount = Math.abs(parseFloat(String(p[2]).replace(/[^0-9.\-]/g, '')) || 0)
    const type = (p[3] || '').toLowerCase().includes('ingreso') ? 'ingreso' : 'egreso'
    let category = (p[4] || 'Otros').trim()
    if (!CATS.includes(category)) category = 'Otros'
    const description = (p[1] || 'Movimiento').trim().slice(0, 140)
    if (esFilaDeResumen(description)) continue // total impreso, no un movimiento
    transactions.push({ date: date.slice(0, 10), description, amount, type, category })
  }
  // ── BLINDAJE DE AÑO (determinista, no depende del modelo) ──
  // Si una fecha cae fuera del periodo del estado, se re-ancla al año del periodo
  // conservando mes y día. Un estado de junio 2026 JAMÁS puede quedar con fechas 2025.
  if (period_start || period_end) {
    const PAD = 4 * 86400000
    const psT = period_start ? Date.parse(period_start) : -Infinity
    const peT = period_end ? Date.parse(period_end) : Infinity
    const years = Array.from(new Set([period_start, period_end].filter(Boolean).map(d => (d as string).slice(0, 4))))
    for (const tx of transactions) {
      const d = String(tx.date)
      const t = Date.parse(d)
      if (!isNaN(t) && t >= psT - PAD && t <= peT + PAD) continue
      for (const y of years) {
        const cand = y + d.slice(4)
        const ct = Date.parse(cand)
        if (!isNaN(ct) && ct >= psT - PAD && ct <= peT + PAD) { tx.date = cand; break }
      }
    }
  }
  // ── BLINDAJE DE SIGNO EN TARJETA DE CRÉDITO (determinista) ──
  // En un estado de TDC, un pago A la tarjeta es un ABONO: baja la deuda, va como
  // ingreso. La IA los marcó como egreso en un Santander real y eso duplicó el gasto
  // del periodo (168,578 de compras se volvieron 359,509 al sumarle los pagos).
  // Se corrige aquí por dos vías, la segunda para cuando el modelo no declara el tipo:
  //   1. el #META dice que es tarjeta de crédito, o
  //   2. lo que se marcó como "Pago TDC" suma EXACTO el "Total de abonos" impreso
  //      — el propio documento probando que esos renglones son los abonos.
  const pagosTdc = transactions.filter(tx => tx.category === 'Pago TDC')
  if (pagosTdc.length) {
    const sumaPagos = pagosTdc.reduce((a, tx) => a + (Number(tx.amount) || 0), 0)
    const cuadraConAbonos = !!(summary && summary.dep_total && Math.abs(sumaPagos - summary.dep_total) < 1)
    if (esTdc || cuadraConAbonos) for (const tx of pagosTdc) tx.type = 'ingreso'
  }

  return { bank, period_start, period_end, currency, transactions, summary, saldo_inicial, saldo_final, tipo_cuenta: esTdc ? 'tdc' : 'debito' }
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

    // ── Límite de análisis por plan (Fase 4). Se checa ANTES de gastar IA. ──
    // Emprende 3/mes · Negocio 15/mes · Empresa 40/mes · prueba 15/mes.
    const jwtUser = (req.headers.get('authorization') || '').replace('Bearer ', '')
    let uid: string | null = null
    try { uid = JSON.parse(atob(jwtUser.split('.')[1] || ''))?.sub || null } catch { /* ignore */ }
    if (uid) {
      const { data: prof } = await supabase.from('profiles').select('plan,subscription_status').eq('id', uid).maybeSingle()
      const plan = String(prof?.plan || '').toLowerCase()
      const LIMITES: Record<string, number> = { basico: 5, emprende: 5, pro: 35, negocio: 35, empresa: 150 }
      const limite = LIMITES[plan] ?? (prof?.subscription_status === 'trial' ? 35 : 5)
      const desde = new Date(); desde.setDate(1); desde.setHours(0, 0, 0, 0)
      const { count } = await supabase.from('statements').select('id', { count: 'exact', head: true })
        .eq('user_id', uid).gte('created_at', desde.toISOString())
      if ((count || 0) >= limite) {
        try { await supabase.storage.from('statements').remove([storagePath]) } catch { /* ignore */ }
        throw new Error(`Llegaste al límite de tu plan: ${limite} estados de cuenta analizados este mes. Sube de plan para seguir al momento, o espera al próximo mes.`)
      }
    }

    const { data: fileBlob, error: dlErr } = await supabase.storage.from('statements').download(storagePath)
    if (dlErr) throw new Error('No se pudo leer el archivo subido. Vuelve a intentarlo.')

    const arrayBuffer = await fileBlob.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    if (bytes.length > 30 * 1024 * 1024) throw new Error('El archivo es demasiado grande (más de 30MB). Sube un PDF más ligero o divídelo.')
    if (bytes.length === 0) throw new Error('El archivo llegó vacío. Vuelve a subirlo.')

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
      if (anthropicRes.status === 400 && /pdf|page|document/i.test(detail)) {
        throw new Error('No pudimos leer este PDF (puede estar protegido, dañado o ser una imagen escaneada de baja calidad). Intenta con otro archivo o exporta el estado como PDF desde tu banca en línea.')
      }
      throw new Error('El análisis falló temporalmente. Intenta de nuevo en unos segundos.')
    }

    const anthropicData = await anthropicRes.json()
    const stopReason = anthropicData.stop_reason
    // Opus 5 puede devolver bloques "thinking" intercalados: juntar TODOS los bloques de texto
    const rawText = (anthropicData.content || []).filter((b: { type?: string }) => b.type === 'text')
      .map((b: { text?: string }) => b.text || '').join('\n')
    if (stopReason === 'refusal') {
      throw new Error('El sistema no pudo analizar este documento. Intenta de nuevo en unos minutos o contacta a soporte.')
    }

    // Soporta tanto el formato compacto nuevo como JSON (por si el modelo responde en JSON)
    let parsed: { bank: string; period_start: string | null; period_end: string | null; currency: string; transactions: Array<Record<string, unknown>>; summary?: Record<string, number | null> | null; saldo_inicial?: number | null; saldo_final?: number | null; tipo_cuenta?: string | null }
    if (rawText.includes('#META') || rawText.includes('|')) {
      parsed = parseCompact(rawText)
    } else {
      try {
        const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
        const j = JSON.parse(cleaned)
        const tj = String(j.tipo_cuenta || '').toLowerCase()
        parsed = { bank: j.bank || 'Desconocido', period_start: j.period_start || null, period_end: j.period_end || null, currency: j.currency || 'MXN', transactions: j.transactions || [], summary: j.summary || null, saldo_inicial: j.saldo_inicial ?? null, saldo_final: j.saldo_final ?? null,
          tipo_cuenta: tj ? ((tj.includes('tdc') || tj.includes('cred') || tj.includes('tarjeta')) ? 'tdc' : 'debito') : null }
      } catch (_e) {
        parsed = parseCompact(rawText)
      }
    }

    // Si se truncó, NUNCA entregamos datos incompletos (daría totales equivocados): avisamos claro.
    if (stopReason === 'max_tokens') {
      throw new Error('El estado tiene demasiados movimientos para procesar de una vez. Sube el estado dividido por mes, o contáctanos.')
    }
    if (!parsed.transactions || parsed.transactions.length === 0) {
      throw new Error('No encontramos transacciones en el archivo. Asegúrate de subir un estado de cuenta con movimientos legibles.')
    }

    // Éxito
    await supabase.storage.from('statements').remove([storagePath])

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    try { if (supabase && storagePath) await supabase.storage.from('statements').remove([storagePath]) } catch { /* ignore */ }
    return new Response(JSON.stringify({ error: (error as Error).message || 'Error procesando el archivo' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
