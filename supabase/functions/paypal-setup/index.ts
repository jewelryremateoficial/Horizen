import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import {
  PRODUCTO_NOMBRE, CATALOGO, nombrePlan, leerNombre, ciclosDeCobro,
} from "../_shared/paypal-planes.ts"

// ============================================================
// Setup de PayPal — SE PUEDE CORRER LAS VECES QUE HAGA FALTA.
//
// Deja el catálogo de PayPal como debe estar y NO duplica nada:
//   · Reutiliza el producto "Horizen" si ya existe (antes creaba uno
//     nuevo cada vez, y los planes quedaban repartidos entre varios
//     productos — PayPal solo deja cambiar de plan DENTRO del mismo
//     producto, así que eso rompía los cambios de plan).
//   · Crea solo los planes que falten. Los que ya están, se respetan
//     tal cual: no se tocan las suscripciones vivas.
//   · De cada plan crea DOS versiones:
//       CON prueba  → 7 días gratis. Para clientes NUEVOS.
//       SIN prueba  → cobra desde el primer ciclo. Para quien YA paga
//                     y cambia de plan.
//   · Registra el webhook si no está.
//
// Requiere: PAYPAL_SECRET (y opcional PAYPAL_ENV=sandbox)
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ADMIN_USER_ID = '86da2f55-2666-468f-a927-7929ee0a1521'   // Eduardo
const PAYPAL_CLIENT_ID = 'Ab9gde9vp6tmdo_5bc2w-jWtvA4xd_dwWuRoTBxSTJeyd77Gu2EQeOEsFhdd4RmanITAXlDDJKpv8wNI'

type H = Record<string, string>

// Recorre TODAS las páginas de un listado de PayPal.
async function listarTodo(base: string, ruta: string, headers: H, campo: string) {
  const items: Record<string, unknown>[] = []
  for (let page = 1; page <= 20; page++) {
    const sep = ruta.includes('?') ? '&' : '?'
    const res = await fetch(`${base}${ruta}${sep}page_size=20&page=${page}`, { headers })
    if (!res.ok) break
    const d = await res.json()
    const lote = d[campo] || []
    items.push(...lote)
    if (lote.length < 20) break
  }
  return items
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const SECRET = Deno.env.get('PAYPAL_SECRET')
    if (!SECRET) throw new Error('Falta el secreto PAYPAL_SECRET en Supabase → Edge Functions → Secrets.')
    const ENV = Deno.env.get('PAYPAL_ENV') || 'live'
    const BASE = ENV === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com'

    // Solo el admin
    const jwt = (req.headers.get('authorization') || '').replace('Bearer ', '')
    const payload = JSON.parse(atob(jwt.split('.')[1] || '') || '{}')
    if (payload.sub !== ADMIN_USER_ID) throw new Error('Solo el administrador puede ejecutar el setup.')

    // 1. Token
    const tokRes = await fetch(BASE + '/v1/oauth2/token', {
      method: 'POST',
      headers: { 'Authorization': 'Basic ' + btoa(PAYPAL_CLIENT_ID + ':' + SECRET), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
    })
    if (!tokRes.ok) throw new Error('PayPal rechazó las credenciales (revisa PAYPAL_SECRET): ' + (await tokRes.text()).slice(0, 200))
    const { access_token } = await tokRes.json()
    const H: H = { 'Authorization': 'Bearer ' + access_token, 'Content-Type': 'application/json' }

    const bitacora: string[] = []

    // 2. Producto: reutilizar el que ya exista
    const productos = await listarTodo(BASE, '/v1/catalogs/products', H, 'products')
    const mios = productos.filter(p => String(p.name || '') === PRODUCTO_NOMBRE)
    let productId: string
    if (mios.length) {
      // Si hay más de uno (por corridas viejas), se usa el que tenga más planes.
      let mejor = mios[0], mejorN = -1
      for (const p of mios) {
        const pl = await listarTodo(BASE, `/v1/billing/plans?product_id=${p.id}`, H, 'plans')
        if (pl.length > mejorN) { mejorN = pl.length; mejor = p }
      }
      productId = String(mejor.id)
      bitacora.push(`Producto reutilizado: ${productId}` + (mios.length > 1
        ? ` (OJO: hay ${mios.length} productos "Horizen" de corridas anteriores; se eligió el que tiene más planes)` : ''))
    } else {
      const prodRes = await fetch(BASE + '/v1/catalogs/products', {
        method: 'POST', headers: H,
        body: JSON.stringify({ name: PRODUCTO_NOMBRE, description: 'Inteligencia financiera para personas y negocios en México', type: 'SERVICE', category: 'SOFTWARE' }),
      })
      if (!prodRes.ok) throw new Error('No se pudo crear el producto: ' + (await prodRes.text()).slice(0, 300))
      productId = (await prodRes.json()).id
      bitacora.push(`Producto creado: ${productId}`)
    }

    // 3. Planes: crear SOLO los que falten
    const existentes = await listarTodo(BASE, `/v1/billing/plans?product_id=${productId}`, H, 'plans')
    const yaHay = new Map<string, string>()          // "app|ciclo|prueba" → plan_id
    for (const p of existentes) {
      const info = leerNombre(String(p.name || ''))
      if (info && String(p.status) === 'ACTIVE') {
        yaHay.set(`${info.app}|${info.ciclo}|${info.conPrueba}`, String(p.id))
      }
    }

    const planes: Record<string, Record<string, string>> = {}
    for (const d of CATALOGO) {
      for (const conPrueba of [true, false]) {
        const llave = `${d.app}|${d.ciclo}|${conPrueba}`
        const grupo = conPrueba ? 'con_prueba' : 'sin_prueba'
        planes[grupo] = planes[grupo] || {}

        if (yaHay.has(llave)) {
          planes[grupo][`${d.app}_${d.ciclo}`] = yaHay.get(llave)!
          continue
        }
        const res = await fetch(BASE + '/v1/billing/plans', {
          method: 'POST', headers: H,
          body: JSON.stringify({
            product_id: productId,
            name: nombrePlan(d, conPrueba),
            description: conPrueba
              ? `Plan ${d.etiqueta} de Horizen, ${d.ciclo}, con 7 días de prueba.`
              : `Plan ${d.etiqueta} de Horizen, ${d.ciclo}. Para clientes que cambian de plan (sin prueba).`,
            status: 'ACTIVE',
            billing_cycles: ciclosDeCobro(d, conPrueba),
            payment_preferences: {
              auto_bill_outstanding: true,
              setup_fee_failure_action: 'CANCEL',
              payment_failure_threshold: 3,
            },
          }),
        })
        if (!res.ok) throw new Error(`No se pudo crear "${nombrePlan(d, conPrueba)}": ` + (await res.text()).slice(0, 300))
        const nuevo = await res.json()
        planes[grupo][`${d.app}_${d.ciclo}`] = nuevo.id
        bitacora.push(`Plan creado: ${nombrePlan(d, conPrueba)} → ${nuevo.id}`)
      }
    }

    // 4. Webhook (si ya existe, se busca)
    const whRes = await fetch(BASE + '/v1/notifications/webhooks', {
      method: 'POST', headers: H,
      body: JSON.stringify({
        url: 'https://upcbznfkpswtxiffgsgj.supabase.co/functions/v1/paypal-webhook',
        event_types: [
          { name: 'BILLING.SUBSCRIPTION.ACTIVATED' },
          { name: 'BILLING.SUBSCRIPTION.UPDATED' },
          { name: 'BILLING.SUBSCRIPTION.CANCELLED' },
          { name: 'BILLING.SUBSCRIPTION.SUSPENDED' },
          { name: 'BILLING.SUBSCRIPTION.EXPIRED' },
          { name: 'BILLING.SUBSCRIPTION.PAYMENT.FAILED' },
          { name: 'PAYMENT.SALE.COMPLETED' },
        ],
      }),
    })
    let webhook_id = null
    if (whRes.ok) { webhook_id = (await whRes.json()).id; bitacora.push('Webhook creado') }
    else {
      const list = await fetch(BASE + '/v1/notifications/webhooks', { headers: H })
      if (list.ok) {
        const d = await list.json()
        const found = (d.webhooks || []).find((w: { url: string }) => w.url.includes('paypal-webhook'))
        if (found) { webhook_id = found.id; bitacora.push('Webhook ya existía: ' + found.id) }
      }
    }

    return new Response(JSON.stringify({
      ok: true, env: ENV, product_id: productId, planes, webhook_id,
      bitacora,
      nota: 'No hace falta copiar estos IDs a ningún lado: la página los pide en vivo a la función paypal-planes.',
    }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    })
  }
})
