// De qué plan de PayPal viene cada plan nuestro.
//
// ⚠️ Estos IDs deben ser IDÉNTICOS a los de PAYPAL_PLANS_V2 en pricing.html.
// Si algún día se recrean los planes en PayPal, hay que cambiarlos en los dos
// lados y redesplegar esta función.
//
// Ojo con los nombres: en PayPal se llaman basico/pro/empresa (nombres viejos);
// en la app son emprende/negocio/empresa. El mapa traduce.

export const PLAN_POR_PAYPAL_ID: Record<string, string> = {
  // Emprende
  'P-6MP19416UB444452XNJNOTXI': 'emprende',   // mensual
  'P-590803394S8260056NJNOTXI': 'emprende',   // anual
  // Negocio
  'P-1R803598V3206115CNJNOTXQ': 'negocio',    // mensual
  'P-3NB26581AS110183YNJNOTXQ': 'negocio',    // anual
  // Empresa
  'P-3BN45004MP5224405NJNOTXQ': 'empresa',    // mensual
  'P-1V442284S2630510PNJNOTXY': 'empresa',    // anual
}

// Devuelve el plan nuestro a partir del plan_id que manda PayPal.
// Si no lo reconoce devuelve null: mejor no tocar el plan que ponerle uno malo.
export function planDesdePayPal(planId?: string | null): string | null {
  if (!planId) return null
  return PLAN_POR_PAYPAL_ID[planId] || null
}
