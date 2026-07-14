import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// ============================================================
// Fase 4 — Webhook de PayPal (verify_jwt: false — lo llama PayPal)
// Mantiene profiles.subscription_status sincronizado con la
// realidad del dinero: activada → 'active', cancelada/suspendida/
// vencida → 'cancelled', pago fallido → 'past_due'.
// Cada evento se VERIFICA contra PayPal (verify-webhook-signature)
// para que nadie pueda falsificar activaciones.
// Secretos: PAYPAL_SECRET, PAYPAL_WEBHOOK_ID (y opcional PAYPAL_ENV)
// ============================================================

const PAYPAL_CLIENT_ID = 'Ab9gde9vp6tmdo_5bc2w-jWtvA4xd_dwWuRoTBxSTJeyd77Gu2EQeOEsFhdd4RmanITAXlDDJKpv8wNI'

serve(async (req) => {
  if (req.method !== 'POST') return new Response('ok', { status: 200 })
  try {
    const SECRET = Deno.env.get('PAYPAL_SECRET')
    const WEBHOOK_ID = Deno.env.get('PAYPAL_WEBHOOK_ID')
    if (!SECRET || !WEBHOOK_ID) return new Response('config pendiente', { status: 200 })
    const ENV = Deno.env.get('PAYPAL_ENV') || 'live'
    const BASE = ENV === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com'

    const bodyText = await req.text()
    const event = JSON.parse(bodyText)

    // 1. Verificar la firma con PayPal (anti-falsificación)
    const tokRes = await fetch(BASE + '/v1/oauth2/token', {
      method: 'POST',
      headers: { 'Authorization': 'Basic ' + btoa(PAYPAL_CLIENT_ID + ':' + SECRET), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
    })
    if (!tokRes.ok) return new Response('paypal auth fail', { status: 500 })
    const { access_token } = await tokRes.json()

    const verRes = await fetch(BASE + '/v1/notifications/verify-webhook-signature', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + access_token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_algo: req.headers.get('paypal-auth-algo'),
        cert_url: req.headers.get('paypal-cert-url'),
        transmission_id: req.headers.get('paypal-transmission-id'),
        transmission_sig: req.headers.get('paypal-transmission-sig'),
        transmission_time: req.headers.get('paypal-transmission-time'),
        webhook_id: WEBHOOK_ID,
        webhook_event: event,
      }),
    })
    const ver = verRes.ok ? await verRes.json() : { verification_status: 'FAILURE' }
    if (ver.verification_status !== 'SUCCESS') return new Response('firma inválida', { status: 400 })

    // 2. Aplicar el evento
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const tipo = event.event_type || ''
    const rec = event.resource || {}

    // En suscripciones el id es I-XXXX; en pagos (SALE) viene en billing_agreement_id
    const subId = rec.billing_agreement_id || rec.id || null
    const customUserId = rec.custom_id || null   // lo mandamos al crear la suscripción

    const findUser = async () => {
      if (subId) {
        const { data } = await supabase.from('profiles').select('id').eq('paypal_subscription_id', subId).maybeSingle()
        if (data) return data.id
      }
      return customUserId
    }

    if (tipo === 'BILLING.SUBSCRIPTION.ACTIVATED') {
      const uid = await findUser()
      if (uid) await supabase.from('profiles').update({
        subscription_status: 'active',
        paypal_subscription_id: rec.id,
      }).eq('id', uid)
    } else if (tipo === 'BILLING.SUBSCRIPTION.CANCELLED' || tipo === 'BILLING.SUBSCRIPTION.SUSPENDED' || tipo === 'BILLING.SUBSCRIPTION.EXPIRED') {
      const uid = await findUser()
      if (uid) await supabase.from('profiles').update({ subscription_status: 'cancelled' }).eq('id', uid)
    } else if (tipo === 'BILLING.SUBSCRIPTION.PAYMENT.FAILED') {
      const uid = await findUser()
      if (uid) await supabase.from('profiles').update({ subscription_status: 'past_due' }).eq('id', uid)
    } else if (tipo === 'PAYMENT.SALE.COMPLETED') {
      const uid = await findUser()
      if (uid) {
        await supabase.from('payments').insert({
          user_id: uid,
          paypal_subscription_id: subId,
          amount: parseFloat(rec.amount?.total || '0') || 0,
          currency: rec.amount?.currency || 'MXN',
          status: 'completed',
        })
        // Un cobro exitoso también rehabilita a quien estaba en past_due
        await supabase.from('profiles').update({ subscription_status: 'active' }).eq('id', uid).eq('subscription_status', 'past_due')
      }
    }

    return new Response('ok', { status: 200 })
  } catch (_e) {
    // 200 para que PayPal no reintente infinito por errores nuestros de parseo
    return new Response('error', { status: 200 })
  }
})
