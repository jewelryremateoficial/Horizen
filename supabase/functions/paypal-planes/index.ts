import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { PRODUCTO_NOMBRE, leerNombre } from "../_shared/paypal-planes.ts"

// ============================================================
// Devuelve los planes de PayPal EN VIVO, agrupados.
//
// Existe para que los IDs de PayPal no vivan copiados en el código.
// Antes estaban a mano en pricing.html y en el webhook: cada vez que
// se recreaba un plan había que acordarse de cambiarlos en los dos
// lados, y si se olvidaba uno, los cobros apuntaban a un plan muerto.
//
// Ahora los planes se descubren por su NOMBRE. Crear o recrear un plan
// en PayPal no obliga a tocar una sola línea de código.
//
// Respuesta:
// { producto, planes: { con_prueba: {emprende_mensual: "P-...", ...},
//                       sin_prueba: {...} } }
//
//   con_prueba → clientes NUEVOS (7 días gratis, siempre)
//   sin_prueba → clientes que YA pagan y cambian de plan
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PAYPAL_CLIENT_ID = 'Ab9gde9vp6tmdo_5bc2w-jWtvA4xd_dwWuRoTBxSTJeyd77Gu2EQeOEsFhdd4RmanITAXlDDJKpv8wNI'

// Los planes casi nunca cambian: se guardan un rato para no llamar a
// PayPal en cada carga de la página de precios.
const CACHE_MS = 10 * 60 * 1000
let cache: { hasta: number; datos: unknown } | null = null

async function listarTodo(base: string, ruta: string, headers: Record<string, string>, campo: string) {
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
    if (cache && cache.hasta > Date.now()) {
      return new Response(JSON.stringify(cache.datos), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      })
    }

    const SECRET = Deno.env.get('PAYPAL_SECRET')
    if (!SECRET) throw new Error('Falta PAYPAL_SECRET')
    const ENV = Deno.env.get('PAYPAL_ENV') || 'live'
    const BASE = ENV === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com'

    const tokRes = await fetch(BASE + '/v1/oauth2/token', {
      method: 'POST',
      headers: { 'Authorization': 'Basic ' + btoa(PAYPAL_CLIENT_ID + ':' + SECRET), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
    })
    if (!tokRes.ok) throw new Error('PayPal rechazó las credenciales')
    const { access_token } = await tokRes.json()
    const H = { 'Authorization': 'Bearer ' + access_token, 'Content-Type': 'application/json' }

    const productos = await listarTodo(BASE, '/v1/catalogs/products', H, 'products')
    const mios = productos.filter(p => String(p.name || '') === PRODUCTO_NOMBRE)
    if (!mios.length) throw new Error('No existe el producto "Horizen" en PayPal. Corre paypal-setup primero.')

    // Juntar los planes de TODOS los productos "Horizen" (si hubo corridas
    // viejas que duplicaron el producto), quedándose con el que tenga más.
    let planes: Record<string, unknown>[] = []
    let productoElegido = String(mios[0].id)
    for (const p of mios) {
      const pl = await listarTodo(BASE, `/v1/billing/plans?product_id=${p.id}`, H, 'plans')
      if (pl.length > planes.length) { planes = pl; productoElegido = String(p.id) }
    }

    const salida: Record<string, Record<string, string>> = { con_prueba: {}, sin_prueba: {} }
    for (const p of planes) {
      if (String(p.status) !== 'ACTIVE') continue
      const info = leerNombre(String(p.name || ''))
      if (!info) continue
      const grupo = info.conPrueba ? 'con_prueba' : 'sin_prueba'
      salida[grupo][`${info.app}_${info.ciclo}`] = String(p.id)
    }

    const datos = {
      ok: true,
      producto: productoElegido,
      planes: salida,
      faltan_sin_prueba: Object.keys(salida.sin_prueba).length < 6,
    }
    cache = { hasta: Date.now() + CACHE_MS, datos }

    return new Response(JSON.stringify(datos), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    })
  } catch (e) {
    // Nunca tumbar la página de precios por esto: el frontend tiene respaldo.
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    })
  }
})
