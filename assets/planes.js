// ─────────────────────────────────────────────────────────────
//  HORIZEN — LOS PRECIOS VIVEN AQUÍ Y SOLO AQUÍ
// ─────────────────────────────────────────────────────────────
//  Si cambias un precio o un límite, cámbialo SOLO en este archivo.
//  Lo leen: pricing.html (la página pública) y dashboard.html (Mi plan).
//
//  ⚠️ NOVA es la única excepción: corre en el servidor y no puede leer
//  este archivo. Su copia está en supabase/functions/nova-help/index.ts,
//  en el bloque "PLANES Y PRECIOS". Si cambias algo aquí, cámbialo allá
//  también y redespliega la función.
// ─────────────────────────────────────────────────────────────

const HORIZEN_TRIAL_DIAS = 7;

const HORIZEN_PLANES = [
  {
    id: 'emprende',
    alias: ['basico'],                    // nombre viejo, por si quedan cuentas con él
    nombre: 'Emprende',
    precio: 199,
    precioAnual: 159,                     // por mes, pagando el año
    gancho: 'Deja de adivinar cuánto ganas.',
    desc: 'Sube tu estado de cuenta y en un minuto sabes cuánto entró, a dónde se fue y cuánto apartar para el SAT.',
    limites: { estados: 5, nova: 20, usuarios: 1 },
    incluye: [
      'La IA lee tu estado de cuenta y categoriza todo',
      'Estado de Resultados en PDF para tu contador',
      'Reservas SAT: cuánto apartar de IVA e ISR',
      'Efectivo con foto de nota y corte del día',
      'Detector de gastos fijos y calendario financiero',
    ],
    noIncluye: ['Clientes y cobranza por WhatsApp', 'Citas en línea', 'Proveedores'],
  },
  {
    id: 'negocio',
    alias: ['pro'],
    nombre: 'Negocio',
    precio: 399,
    precioAnual: 319,
    popular: true,
    gancho: 'Cobra sin pena y sin perseguir a nadie.',
    desc: 'Tus clientes con su saldo claro, citas que se agendan solas y la cuenta exacta de qué proveedor te deja dinero.',
    limites: { estados: 35, nova: null, usuarios: 1 },   // null = sin límite
    incluye: [
      'Todo lo de Emprende',
      'Clientes: quién te debe y el WhatsApp de cobro ya redactado',
      'Cotizaciones y apartados con abonos',
      'Citas en línea: le mandas un link y tu cliente elige día y hora',
      'Proveedores: cuánta ganancia te deja cada proveedor',
      'Reportes en Excel para tu contador',
      'Asistente NOVA sin límite',
    ],
    noIncluye: [],
  },
  {
    id: 'empresa',
    alias: [],
    nombre: 'Empresa',
    precio: 799,
    precioAnual: 639,
    gancho: 'Tu equipo captura, tú mandas.',
    desc: 'Tus empleados registran gastos y ventas desde su celular sin ver tus números — todo cae a tu cuenta con el sello de quién lo capturó.',
    limites: { estados: 150, nova: null, usuarios: 6 },  // tú + 5
    incluye: [
      'Todo lo de Negocio',
      'Equipo capturista: empleados registran sin ver tus finanzas',
      'Soporte prioritario por WhatsApp',
      'Onboarding personal: te dejamos todo andando 1 a 1',
    ],
    noIncluye: [],
  },
];

// Encuentra un plan por su id o por un nombre viejo. Devuelve null si no hay.
function horizenPlan(id) {
  const k = String(id || '').toLowerCase();
  return HORIZEN_PLANES.find(p => p.id === k || p.alias.includes(k)) || null;
}

// Texto corto de un límite: 5 → "5 / mes", null → "Ilimitadas"
function horizenLimite(v, sufijo) {
  if (v === null || v === undefined) return 'Ilimitadas';
  return v + (sufijo || ' / mes');
}

// Para el navegador (pricing.html, dashboard.html)
if (typeof window !== 'undefined') {
  window.HORIZEN_PLANES = HORIZEN_PLANES;
  window.HORIZEN_TRIAL_DIAS = HORIZEN_TRIAL_DIAS;
  window.horizenPlan = horizenPlan;
  window.horizenLimite = horizenLimite;
}
