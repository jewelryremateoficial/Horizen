import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { planDesdePayPal, esSubida } from "./planes-paypal.ts"
import { leerNombre } from "../_shared/paypal-planes.ts"

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

    // De un plan_id de PayPal saca el plan de Horizen leyendo su NOMBRE.
    // Se prefiere el nombre sobre una lista de IDs porque así reconoce
    // cualquier plan que exista o se cree después —incluidos los "sin prueba"
    // que usan los cambios de plan— sin tener que actualizar el código.
    // La lista de IDs queda solo como respaldo si PayPal no contesta.
    const planDeHorizen = async (planId: string | null | undefined, token: string, base: string) => {
      if (!planId) return null
      try {
        const r = await fetch(base + '/v1/billing/plans/' + planId, {
          headers: { 'Authorization': 'Bearer ' + token },
        })
        if (r.ok) {
          const info = leerNombre(String((await r.json()).name || ''))
          if (info) return info.app
        }
      } catch (_e) { /* cae al respaldo */ }
      return planDesdePayPal(planId)
    }

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
      if (uid) {
        // ANTES esto no guardaba el plan. Resultado: quien pagaba se quedaba en
        // 'free' para siempre y recibía los límites del plan más chico (5 estados
        // al mes) aunque hubiera pagado Empresa (150). Ahora sí se guarda.
        const cambios: Record<string, unknown> = {
          subscription_status: 'active',
          paypal_subscription_id: rec.id,
        }
        const plan = await planDeHorizen(rec.plan_id, access_token, BASE)
        if (plan) cambios.plan = plan   // si no reconocemos el plan_id, no tocamos el plan
        await supabase.from('profiles').update(cambios).eq('id', uid)
      }
    } else if (tipo === 'BILLING.SUBSCRIPTION.UPDATED') {
      // Cambio de plan hecho con revise() desde la app.
      // PayPal NO cobra nada hoy: el precio nuevo entra en el siguiente cobro.
      // Por eso el trato es distinto según la dirección del cambio:
      //   SUBE  → se le da al instante (ya pagó menos por lo que va del ciclo,
      //           y el cobro mayor le llega en su próxima fecha).
      //   BAJA  → NO se le quita nada hoy. Ya pagó el plan grande hasta que
      //           termine su ciclo. El cambio entra solo cuando llegue el
      //           siguiente cobro (ver PAYMENT.SALE.COMPLETED abajo).
      const uid = await findUser()
      const plan = await planDeHorizen(rec.plan_id, access_token, BASE)
      if (uid && plan) {
        const { data: prof } = await supabase.from('profiles').select('plan').eq('id', uid).maybeSingle()
        if (esSubida(plan, prof?.plan)) {
          await supabase.from('profiles').update({ plan, subscription_status: 'active' }).eq('id', uid)
        }
        // Si baja, no se toca: se sincroniza al cobrarse el siguiente periodo.
      }
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

        // Empezó un ciclo nuevo: el plan de la app debe coincidir con el que
        // PayPal está cobrando de verdad. Aquí es donde entra en vigor una
        // BAJADA de plan, que se dejó pendiente para no quitarle al cliente
        // algo que ya había pagado.
        if (subId) {
          try {
            const subRes = await fetch(BASE + '/v1/billing/subscriptions/' + subId, {
              headers: { 'Authorization': 'Bearer ' + access_token },
            })
            if (subRes.ok) {
              const sub = await subRes.json()
              const planReal = await planDeHorizen(sub.plan_id, access_token, BASE)
              if (planReal) {
                await supabase.from('profiles').update({ plan: planReal }).eq('id', uid)
              }
            }
          } catch (_e) { /* si PayPal no responde, se corrige en el próximo cobro */ }
        }
      }
    }

    return new Response('ok', { status: 200 })
  } catch (_e) {
    // 200 para que PayPal no reintente infinito por errores nuestros de parseo
    return new Response('error', { status: 200 })
  }
})
