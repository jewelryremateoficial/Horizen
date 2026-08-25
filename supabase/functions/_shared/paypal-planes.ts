// ═══════════════════════════════════════════════════════════════
//  EL CATÁLOGO DE PLANES DE PAYPAL — definición única
// ═══════════════════════════════════════════════════════════════
//
//  De cada plan de Horizen existen DOS versiones en PayPal:
//
//    CON PRUEBA  → 7 días gratis, luego el precio. Para clientes NUEVOS.
//    SIN PRUEBA  → cobra desde el primer ciclo. Para clientes que YA pagan
//                  y cambian de plan (esos ya usaron su prueba al entrar).
//
//  Por qué existe la versión sin prueba: PayPal se traba al mover una
//  suscripción activa hacia un plan que empieza con periodo de prueba.
//  Era la causa de que la ventana de cambio de plan se quedara cargando.
//
//  NADIE debe copiar IDs de PayPal a mano. Los IDs se descubren en vivo
//  a partir del NOMBRE del plan, con las funciones de abajo. Así, agregar
//  o recrear un plan en PayPal no obliga a tocar el código.
// ═══════════════════════════════════════════════════════════════

export const PRODUCTO_NOMBRE = 'Horizen'

export type Ciclo = 'mensual' | 'anual'

export interface DefPlan {
  app: string          // como se llama en Horizen: emprende | negocio | empresa
  etiqueta: string     // como se ve: Emprende | Negocio | Empresa
  ciclo: Ciclo
  precio: string       // en MXN, lo que cobra PayPal
  intervalo: 'MONTH' | 'YEAR'
}

export const CATALOGO: DefPlan[] = [
  { app: 'emprende', etiqueta: 'Emprende', ciclo: 'mensual', precio: '199',  intervalo: 'MONTH' },
  { app: 'emprende', etiqueta: 'Emprende', ciclo: 'anual',   precio: '1908', intervalo: 'YEAR'  },
  { app: 'negocio',  etiqueta: 'Negocio',  ciclo: 'mensual', precio: '399',  intervalo: 'MONTH' },
  { app: 'negocio',  etiqueta: 'Negocio',  ciclo: 'anual',   precio: '3828', intervalo: 'YEAR'  },
  { app: 'empresa',  etiqueta: 'Empresa',  ciclo: 'mensual', precio: '799',  intervalo: 'MONTH' },
  { app: 'empresa',  etiqueta: 'Empresa',  ciclo: 'anual',   precio: '7668', intervalo: 'YEAR'  },
]

export const DIAS_PRUEBA = 7

// El nombre es la llave de todo: de él se deduce plan, ciclo y si trae prueba.
// Los nombres CON prueba se conservan tal cual estaban, para que los planes
// que ya existen en PayPal (y las suscripciones vivas) sigan reconociéndose.
export function nombrePlan(d: DefPlan, conPrueba: boolean): string {
  return `${PRODUCTO_NOMBRE} ${d.etiqueta} (${d.ciclo}${conPrueba ? '' : ', sin prueba'})`
}

export interface PlanLeido {
  app: string
  ciclo: Ciclo
  conPrueba: boolean
}

// Lee un nombre de plan de PayPal y deduce qué es. Devuelve null si no es nuestro.
export function leerNombre(nombre?: string | null): PlanLeido | null {
  const n = String(nombre || '').toLowerCase()
  if (!n.includes('horizen')) return null

  let app: string | null = null
  if (n.includes('emprende') || n.includes('basico') || n.includes('básico')) app = 'emprende'
  else if (n.includes('negocio') || n.includes('pro')) app = 'negocio'
  else if (n.includes('empresa')) app = 'empresa'
  if (!app) return null

  const ciclo: Ciclo = n.includes('anual') ? 'anual' : 'mensual'
  const conPrueba = !n.includes('sin prueba')
  return { app, ciclo, conPrueba }
}

// Los ciclos de cobro que se le mandan a PayPal al crear el plan.
export function ciclosDeCobro(d: DefPlan, conPrueba: boolean) {
  const regular = {
    frequency: { interval_unit: d.intervalo, interval_count: 1 },
    tenure_type: 'REGULAR',
    sequence: conPrueba ? 2 : 1,
    total_cycles: 0,
    pricing_scheme: { fixed_price: { value: d.precio, currency_code: 'MXN' } },
  }
  if (!conPrueba) return [regular]
  return [
    {
      frequency: { interval_unit: 'DAY', interval_count: DIAS_PRUEBA },
      tenure_type: 'TRIAL',
      sequence: 1,
      total_cycles: 1,
      pricing_scheme: { fixed_price: { value: '0', currency_code: 'MXN' } },
    },
    regular,
  ]
}
