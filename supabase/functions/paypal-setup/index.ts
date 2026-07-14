import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// ============================================================
// Fase 4 — Setup de PayPal (se corre UNA sola vez, por el admin)
// Crea el producto "Horizen", los 6 planes (mensual/anual × 3)
// con 7 días de prueba GRATIS capturando tarjeta, y registra el
// webhook. Regresa los IDs para pegarlos en assets/app.js.
// Requiere secretos: PAYPAL_SECRET (y opcional PAYPAL_ENV=sandbox)
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ADMIN_USER_ID = '86da2f55-2666-468f-a927-7929ee0a1521'   // Eduardo
const PAYPAL_CLIENT_ID = 'Ab9gde9vp6tmdo_5bc2w-jWtvA4xd_dwWuRoTBxSTJeyd77Gu2EQeOEsFhdd4RmanITAXlDDJKpv8wNI'

const PLANES = [
  { key: 'basico_m',  name: 'Horizen Emprende (mensual)', price: '199',  interval: 'MONTH' },
  { key: 'basico_y',  name: 'Horizen Emprende (anual)',   price: '1908', interval: 'YEAR' },
  { key: 'pro_m',     name: 'Horizen Negocio (mensual)',  price: '399',  interval: 'MONTH' },
  { key: 'pro_y',     name: 'Horizen Negocio (anual)',    price: '3828', interval: 'YEAR' },
  { key: 'empresa_m', name: 'Horizen Empresa (mensual)',  price: '799',  interval: 'MONTH' },
  { key: 'empresa_y', name: 'Horizen Empresa (anual)',    price: '7668', interval: 'YEAR' },
]

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const SECRET = Deno.env.get('PAYPAL_SECRET')
    if (!SECRET) throw new Error('Falta el secreto PAYPAL_SECRET en Supabase → Edge Functions → Secrets.')
    const ENV = Deno.env.get('PAYPAL_ENV') || 'live'
    const BASE = ENV === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com'

    // Solo el admin puede correr esto (el JWT ya lo validó Supabase; verificamos el sub)
    const jwt = (req.headers.get('authorization') || '').replace('Bearer ', '')
    const payload = JSON.parse(atob(jwt.split('.')[1] || '') || '{}')
    if (payload.sub !== ADMIN_USER_ID) throw new Error('Solo el administrador puede ejecutar el setup.')

    // 1. Token de PayPal
    const tokRes = await fetch(BASE + '/v1/oauth2/token', {
      method: 'POST',
      headers: { 'Authorization': 'Basic ' + btoa(PAYPAL_CLIENT_ID + ':' + SECRET), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
    })
    if (!tokRes.ok) throw new Error('PayPal rechazó las credenciales (revisa PAYPAL_SECRET): ' + (await tokRes.text()).slice(0, 200))
    const { access_token } = await tokRes.json()
    const H = { 'Authorization': 'Bearer ' + access_token, 'Content-Type': 'application/json' }

    // 2. Producto
    const prodRes = await fetch(BASE + '/v1/catalogs/products', {
      method: 'POST', headers: H,
      body: JSON.stringify({ name: 'Horizen', description: 'Inteligencia financiera para personas y negocios en México', type: 'SERVICE', category: 'SOFTWARE' }),
    })
    if (!prodRes.ok) throw new Error('No se pudo crear el producto: ' + (await prodRes.text()).slice(0, 300))
    const product = await prodRes.json()

    // 3. Planes: 7 días de prueba GRATIS (captura tarjeta) + cobro recurrente
    const planes: Record<string, string> = {}
    for (const p of PLANES) {
      const res = await fetch(BASE + '/v1/billing/plans', {
        method: 'POST', headers: H,
        body: JSON.stringify({
          product_id: product.id,
          name: p.name,
          status: 'ACTIVE',
          billing_cycles: [
            { frequency: { interval_unit: 'DAY', interval_count: 7 }, tenure_type: 'TRIAL', sequence: 1, total_cycles: 1,
              pricing_scheme: { fixed_price: { value: '0', currency_code: 'MXN' } } },
            { frequency: { interval_unit: p.interval, interval_count: 1 }, tenure_type: 'REGULAR', sequence: 2, total_cycles: 0,
              pricing_scheme: { fixed_price: { value: p.price, currency_code: 'MXN' } } },
          ],
          payment_preferences: { auto_bill_outstanding: true, setup_fee_failure_action: 'CANCEL', payment_failure_threshold: 2 },
        }),
      })
      if (!res.ok) throw new Error('No se pudo crear el plan ' + p.key + ': ' + (await res.text()).slice(0, 300))
      const plan = await res.json()
      planes[p.key] = plan.id
    }

    // 4. Webhook de suscripciones
    const whRes = await fetch(BASE + '/v1/notifications/webhooks', {
      method: 'POST', headers: H,
      body: JSON.stringify({
        url: 'https://upcbznfkpswtxiffgsgj.supabase.co/functions/v1/paypal-webhook',
        event_types: [
          { name: 'BILLING.SUBSCRIPTION.ACTIVATED' },
          { name: 'BILLING.SUBSCRIPTION.CANCELLED' },
          { name: 'BILLING.SUBSCRIPTION.SUSPENDED' },
          { name: 'BILLING.SUBSCRIPTION.EXPIRED' },
          { name: 'BILLING.SUBSCRIPTION.PAYMENT.FAILED' },
          { name: 'PAYMENT.SALE.COMPLETED' },
        ],
      }),
    })
    let webhook_id = null
    if (whRes.ok) { webhook_id = (await whRes.json()).id }
    else {
      // Si ya existe (setup re-corrido), lo buscamos
      const list = await fetch(BASE + '/v1/notifications/webhooks', { headers: H })
      if (list.ok) {
        const d = await list.json()
        const found = (d.webhooks || []).find((w: { url: string }) => w.url.includes('paypal-webhook'))
        if (found) webhook_id = found.id
      }
    }

    return new Response(JSON.stringify({ ok: true, env: ENV, product_id: product.id, planes, webhook_id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    })
  }
})
