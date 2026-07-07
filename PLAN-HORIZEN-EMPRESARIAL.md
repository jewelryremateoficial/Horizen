# PLAN MAESTRO — Horizen Empresarial
### De "app de finanzas" a software operativo del negocio mexicano
*Basado en INVESTIGACION-EMPRESARIAL.md (6 reportes) y auditoría técnica de dashboard.html. Un desarrollador debe poder implementar esto sin preguntar.*

---

## 1. Visión en 5 líneas

1. Horizen ya lee el banco (PDF + IA); el hueco es todo lo que NUNCA pasa por el banco: el efectivo, que es el 80%+ del negocio mexicano típico.
2. Convertimos Horizen en la libreta digital del dueño: registra su efectivo en 20 segundos con foto de sus notas, y Horizen une efectivo + banco en un solo panorama.
3. Sobre esos datos completos, Horizen le regresa inteligencia que hoy no tiene: gastos fijos detectados solos, y un Estado de Resultados que su contador respeta.
4. Después conectamos el dinero con las personas: clientes con WhatsApp y apartados/abonos, y citas que los clientes reservan solos (cada cita = ingreso futuro).
5. Horizen es ADMINISTRACIÓN del negocio, no facturación ni contabilidad fiscal — y eso se dice explícito en el producto.

## 2. Orden de fases y justificación

| Fase | Qué | Por qué en este orden |
|---|---|---|
| **A** | Efectivo (registro rápido + foto + corte del día + calendario) | Es el hueco de datos más grande. Sin efectivo, C sale en pérdida y pierde credibilidad. Es lo más barato: reusa `transactions`, cero tablas nuevas. Valida el hábito diario (Fase 2 ⭐ de la metodología: probar lo más incierto primero). |
| **B** | Gastos fijos inteligentes (detección automática + revisar/confirmar) | Usa datos que YA existen (transactions de PDFs). Cero captura nueva para el usuario = valor gratis. Solo 1 tabla nueva y JS en navegador. |
| **C** | Estado de Resultados (página nueva, banco + efectivo, PDF) | Necesita A (ventas en efectivo) para que los números cuadren, y se beneficia de B (fijos confirmados). Es el entregable "wow" para el dueño y su contador. |
| **D** | Clientes (ficha mínima + WhatsApp + cotización + notas) | Primera tabla de PERSONAS. Los abonos del cliente se registran con el modal de efectivo de A (reuso directo). Base obligatoria para E. |
| **E** | Citas tipo Calendly (disponibilidad + página pública + reservas) | La más riesgosa técnicamente (endpoint público, anti-doble-reserva) — va al final, cuando ya hay clientes (D) y registro de ingresos (A) con qué conectarla. |

**Regla transversal:** cada fase se libera COMPLETA (SQL → frontend → deploy Hostinger → checklist) antes de empezar la siguiente. dashboard.html lo edita un solo desarrollador a la vez.

## 3. Nota de posicionamiento (obligatoria en producto)

El efectivo es **registro interno de administración**: todo insert de efectivo lleva `is_fiscal = false`. Horizen NO emite facturas, NO timbra CFDI, NO sustituye la contabilidad fiscal. Todo reporte que mezcle efectivo lleva el pie: *"Reporte gerencial elaborado sobre base de flujo de efectivo. No sustituye la contabilidad fiscal."* Ese pie es lo que hace el producto defendible ante cualquier contador.

## 4. Convenciones técnicas que NADIE puede romper

- `transactions.amount`: positivo = ingreso, negativo = egreso. El RPC `get_liquidity_metrics`, reportes y calendario dependen de esto.
- Patrón RLS del proyecto: `CREATE POLICY "x_all" ON tabla FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);` + índice por `user_id`.
- Toda migración usa `IF NOT EXISTS` y termina con `NOTIFY pgrst, 'reload schema';` (el schema del repo NO es espejo fiel de producción).
- No tocar: flujo de estados de cuenta (`procesarEstado` L3330, `confirmarEstado` L3870), `assets/app.js`, enforcement de trial (IIFE L1577), localStorage `horizen_income_${user.id}`, ni reintroducir Belvo.
- UI: tokens existentes (`--p` morado, `--pos`/`--neg`, `--card`… ver `:root` de dashboard.html), clases `.card`, `.btn .btn-primary .btn-ghost`, `.btn-save/.btn-cancel`, modales patrón `<div class="overlay" id="xModal"><div class="modal">` con `openModal()/closeModal()` (L2405), inputs `.finp/.fsel/.flbl/.fg/.frow`, iconos SVG inline estilo Lucide con `class="ic"`.
- Páginas nuevas = exactamente 3 toques a lo existente: (1) botón en sidebar, (2) entrada en objeto `titles` de `showPage` (L1644), (3) branch en el dispatcher de loaders (L1664–1676). Todo lo demás es código nuevo aislado.

---

# FASE A — EFECTIVO

**Promesa:** "Al cerrar tu negocio, registra en 20 segundos cuánto entró en efectivo, con foto de tus notas."

**Decisión de arquitectura (de la auditoría):** NO se crea tabla `cash_entries`. Se reusa `transactions` con `source='efectivo'`. Beneficio: entra gratis a métricas, resumen, calendario (`loadCalendario` ya lee transactions del mes) y reportes, sin tocar esas funciones. No es un POS: se registra el TOTAL del día (o del momento), nunca venta por venta.

## A.1 PASO 1 — SQL (Supabase → SQL Editor)

```sql
-- ==== A1. Verificar el CHECK de source ANTES de todo (ejecutar y leer el resultado) ====
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.transactions'::regclass AND conname ILIKE '%source%';

-- ==== A2. Ampliar el CHECK para permitir 'efectivo' ====
-- Si la consulta anterior devolvió un constraint, esto lo recrea incluyéndolo.
-- Si no devolvió nada, el DROP no falla (IF EXISTS) y el ADD deja el check correcto.
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_source_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_source_check
  CHECK (source IN ('manual','belvo','sat_cfdi','pdf_ocr','whatsapp','efectivo'));

-- ==== A3. Columna para la foto de la nota ====
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS receipt_path text;

NOTIFY pgrst, 'reload schema';

-- ==== A4. Bucket privado para fotos de notas ====
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprobantes', 'comprobantes', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage: carpeta = user_id (mismo patrón que el bucket statements)
CREATE POLICY "comprobantes_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'comprobantes' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "comprobantes_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'comprobantes' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "comprobantes_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'comprobantes' AND (storage.foldername(name))[1] = auth.uid()::text);
```

A diferencia del bucket `statements` (staging temporal que la Edge Function borra), `comprobantes` es **archivo permanente**. Path: `${user.id}/${fecha}-${Date.now()}.jpg`. Visualización con URLs firmadas (`createSignedUrl`, 1 hora); thumbnails con transformación nativa (`transform: { width: 160 }`).

## A.2 PASO 3 — Frontend (dashboard.html)

**No hay página nueva.** Tres piezas:

### Pieza 1 — Botón de acceso (siempre a 1 tap)
- En `page-overview`, junto al botón "Subir estado" (L640): `<button class="btn btn-primary" onclick="openCashModal('entrada')">…Registrar efectivo</button>` con icono Lucide `banknote` (SVG inline `class="ic"`).
- Botón flotante SOLO móvil (media query `max-width: 768px`): `<button class="fab-cash" onclick="openCashModal('entrada')">` fijo abajo-derecha, círculo 56px, fondo `var(--p)`, icono `plus`, `box-shadow` del sistema. Clase nueva `.fab-cash` en el `<style>` del dashboard.

### Pieza 2 — Modal `cashModal` (clonar patrón de `txModal` L1276, simplificado)
Una sola vista, sin scroll, pensada móvil-primero:

| Elemento | Spec |
|---|---|
| Título `.modal-ttl` | "Registrar efectivo" |
| Toggle Entrada/Salida | 2 botones pill; Entrada preseleccionada (fondo `var(--pos-bg)`, texto `var(--pos-text)`); Salida usa `var(--neg-bg)/var(--neg-text)`. Guarda en `_cashTipo` |
| Monto | `<input class="finp" id="cashMonto" type="text" inputmode="decimal">` — fuente 2rem, centrado, autofocus, formateo en vivo `$18,500` (`inputmode="decimal"` abre teclado numérico nativo; NO construir teclado propio en v1) |
| Chips de concepto | fila de máx. 6 chips con los conceptos más usados del usuario (query de sus últimas 50 tx de efectivo, agrupadas) + defaults la primera vez: "Ventas del día", "Apartado", "Abono cliente", "Pago proveedor". 1 tap llena `cashConcepto` |
| Concepto | `<input class="finp" id="cashConcepto" placeholder="Concepto (opcional)">` |
| Fecha | `<input class="finp" type="date" id="cashFecha">` default hoy (usar `dateLocal` de app.js, NO `toISOString`, por zona horaria MX) |
| Foto | dos botones `.btn-ghost`: "📷 Tomar foto" → `<input type="file" accept="image/*" capture="environment" hidden>` y "Galería" → mismo input sin `capture`. Al elegir: thumbnail 64px + botón ✕ para quitar |
| Footer | `.btn-cancel` Cancelar / `.btn-save` id `cashSaveBtn` "Guardar" |

**Regla de oro:** único campo obligatorio = monto. Guardar NO espera a que suba la foto (subida en background, luego `UPDATE receipt_path`).

### Pieza 3 — Tarjeta "Efectivo de hoy" en `page-overview`
`.card` con: "Efectivo de hoy · Entradas **$X** · Salidas **$Y** · Neto **$Z**" + thumbnails de fotos del día + link "Ver movimientos" → `showPage('transactions')` con filtro source=efectivo. Se pinta con `renderCashToday()` dentro del flujo de `renderInicio`.

### Funciones JS nuevas (van junto al bloque de transacciones, después de `deleteTx` L2178)

```
openCashModal(tipo)        // abre modal, resetea form, fecha=hoy, carga chips, foco en monto
loadCashChips()            // query últimos conceptos de efectivo del usuario → pinta chips
comprimirImagen(file)      // canvas: max 1200px ancho, JPEG calidad 0.75 → Blob ~150-300KB. Promise<Blob>
subirComprobante(blob)     // upload a bucket 'comprobantes', path user.id/fecha-timestamp.jpg → path
saveCashMovement()         // valida monto>0 → INSERT en transactions:
                           //   { user_id, description: concepto || (tipo==='entrada'?'Efectivo del día':'Salida de caja'),
                           //     amount: tipo==='entrada' ? monto : -monto,
                           //     type: tipo==='entrada' ? 'ingreso' : 'egreso',
                           //     date, category: tipo==='entrada' ? 'Ventas' : (categoría elegida || 'Proveedores'),
                           //     source: 'efectivo', is_fiscal: false, receipt_path: null }
                           // → cierra modal, toast, dispara subida de foto en background → UPDATE receipt_path
                           // → refresca renderCashToday() y loadRecentTx()
renderCashToday()          // suma tx de hoy con source='efectivo' → pinta tarjeta
verComprobante(path)       // createSignedUrl 3600s → abre overlay con la imagen
```

### Toques mínimos a lo existente (aditivos)
1. `srcLabel()` L1933: agregar `efectivo:'Efectivo'` + clase CSS `.src-efectivo` (badge fondo `var(--pos-bg)`).
2. `txRowFull` L1917: si `receipt_path`, icono 📎/`image` clickeable → `verComprobante()`.
3. Reportes `_repFilter` L4170: mapear `source==='efectivo'` a banco virtual "Efectivo" (cambio aditivo; hoy caerían en "Sin banco").
4. Calendario: cero cambios — `loadCalendario` L3027 ya lee transactions del mes; el efectivo aparece solo.

## A.3 Microcopy (español mexicano)

- Botón: **"Registrar efectivo"** · FAB tooltip: "Registra tu efectivo del día"
- Toggle: **"Entró"** / **"Salió"**
- Placeholder monto: "$0" · Concepto: "¿De qué fue? (opcional)"
- Confirmación (toast): **"$18,500 registrados 💵 — Hoy en efectivo: $18,500"**
- Tarjeta: "Efectivo de hoy" / vacío: "Aún no registras efectivo hoy. Toma 20 segundos."
- Error monto: "Ponle monto al movimiento"
- Foto subiendo: "Guardado ✓ — tu foto se está subiendo"
- Vocabulario del usuario: "corte", "notas", "fondo de caja". PROHIBIDO: "arqueo", "conciliación", "comprobante fiscal".

## A.4 Qué NO hacer en v1 (Fase A)

- ❌ Corte de caja formal (fondo inicial, conteo físico, faltantes/sobrantes) — es para negocios con cajeros empleados; agrega fricción al dueño. Es la v2 si el uso diario se confirma.
- ❌ OCR de la foto para sugerir el monto (reusar pipeline de visión) — v2, diferenciador fuerte pero no bloquea el hábito.
- ❌ Registro venta por venta, inventario, tickets impresos, teclado numérico custom.
- ❌ Cuenta `accounts.type='CASH'` con saldo de caja — opcional futuro, no ahora.
- ❌ Recordatorio push "¿ya registraste tu efectivo?" — v1.1 con el calendario existente.

## A.5 PASO 4 — Checklist de verificación

1. SQL A1 devuelve el constraint → correr A2–A4 sin errores.
2. En móvil real (iPhone Safari + Android Chrome): abrir dashboard → FAB visible → tap → teclado numérico abre solo.
3. Registrar $18,500 "Ventas del día" con foto de notas → toast en <2s aunque la foto siga subiendo.
4. La tarjeta "Efectivo de hoy" muestra $18,500; la tx aparece en Transacciones con badge "Efectivo" y 📎.
5. Tap en 📎 → la foto abre (URL firmada). En Supabase → Storage: el archivo pesa <400KB y está en carpeta del user_id.
6. El calendario muestra el ingreso en el día; Reportes muestra banco "Efectivo".
7. Registrar una SALIDA de $2,000 "Pago proveedor" → neto de la tarjeta = $16,500.
8. Con otro usuario: no ve las fotos ni movimientos del primero (RLS).
9. Registrar con fecha de ayer (caso "se me olvidó") → cae en el día correcto del calendario.

---

# FASE B — GASTOS FIJOS INTELIGENTES

**Promesa:** "Horizen detectó 7 gastos fijos por $12,400/mes. Revísalos en 1 minuto."

**Arquitectura:** el detector corre EN EL NAVEGADOR (cientos de transacciones = JS aguanta de sobra; no se necesita Edge Function). Propone → el usuario confirma/rechaza/edita → al confirmar se inserta en la tabla existente `fixed_expenses` (NO duplicar modelo de datos). Nada se activa sin confirmación (patrón Monarch/Copilot). Umbral industria: 3+ ocurrencias = confirmado, 2 = tentativo.

## B.1 PASO 1 — SQL

```sql
CREATE TABLE IF NOT EXISTS public.recurring_suggestions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  firma        text NOT NULL,            -- descripción normalizada (llave de agrupación)
  nombre       text NOT NULL,            -- nombre legible sugerido/editado
  monto_tipico numeric(12,2) NOT NULL,
  monto_variable boolean NOT NULL DEFAULT false,   -- luz/agua: cadencia fija, monto variable
  frecuencia   text NOT NULL CHECK (frecuencia IN ('semanal','quincenal','mensual','bimestral','trimestral','anual')),
  dia_tipico   int,
  proximo_cargo date,
  ocurrencias  int NOT NULL,
  confianza    int NOT NULL,             -- 0-100
  categoria    text,
  status       text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','confirmado','rechazado')),
  evidence     jsonb,                    -- últimas 3 tx: [{id,date,amount}]
  created_at   timestamptz DEFAULT now(),
  UNIQUE (user_id, firma, monto_tipico)  -- no re-sugerir lo mismo; 'rechazado' = lista negra
);
ALTER TABLE public.recurring_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recurring_suggestions_all" ON public.recurring_suggestions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_recsug_user ON public.recurring_suggestions(user_id);
NOTIFY pgrst, 'reload schema';
```

La lista negra NO es tabla aparte: una fila con `status='rechazado'` bloquea esa `firma` para siempre (el detector la salta).

## B.2 Algoritmo de detección — pseudocódigo JS exacto

Va en dashboard.html como bloque nuevo `// ===== DETECTOR DE GASTOS FIJOS =====` (después del bloque de page-gastos, ~L3000). Cadencia quincenal como ciudadano de primera clase (nóminas/rentas mexicanas) y normalización pensada para estados de cuenta mexicanos:

```js
// ============ 1. NORMALIZAR DESCRIPCIÓN (calidad de datos > algoritmo) ============
function normalizarDescripcion(desc) {
  let s = (desc || '').toUpperCase();
  // Prefijos bancarios mexicanos (BBVA/Banorte/Santander)
  s = s.replace(/\b(SPEI (ENVIADO|RECIBIDO)|PAGO CUENTA DE TERCERO|TRANSF(ERENCIA)? INTERBANCARIA|DOMICILIACION|CARGO (RECURRENTE|AUTOMATICO)|COMPRA (EN|CON) (TARJETA|TDC|TDD)|PAGO INTERBANCARIO|RETIRO SIN TARJETA)\b/g, ' ');
  s = s.replace(/\b\d{2}[\/\-]\d{2}([\/\-]\d{2,4})?\b/g, ' ');   // fechas embebidas
  s = s.replace(/\b[A-Z]{3,4}\d{6}[A-Z0-9]{0,7}\b/g, ' ');       // RFC
  s = s.replace(/\b\d{5,}\b/g, ' ');                              // folios, claves de rastreo
  s = s.replace(/\b(REF|FOLIO|AUT|CLAVE|SUC|TER)\.?:?\s*\S+/g, ' ');
  s = s.replace(/[^A-ZÑ ]/g, ' ').replace(/\s+/g, ' ').trim();
  return s.split(' ').slice(0, 4).join(' ');                      // firma = primeras 4 palabras
}

// ============ 2. PRIORS POR CATEGORÍA ============
const CATS_CASI_SIEMPRE_FIJAS = ['renta','hipoteca','software','suscripciones','seguros','nomina','sueldos','internet','telefono','colegiaturas','streaming','gimnasio','contabilidad'];
const CATS_CASI_NUNCA_FIJAS   = ['restaurantes','gasolina','supermercado','entretenimiento','viajes','compras','comida','cafe'];

// ============ 3. CADENCIAS (quincenal y bimestral CFE incluidas) ============
const CADENCIAS = [
  { nombre: 'semanal',    dias: 7,   tol: 2 },
  { nombre: 'quincenal',  dias: 15,  tol: 3 },   // cubre 14 (bisemanal) y 15/16 (quincena mexicana)
  { nombre: 'mensual',    dias: 30,  tol: 4 },   // ±4 cubre meses de 28-31 días
  { nombre: 'bimestral',  dias: 61,  tol: 6 },   // CFE cobra bimestral
  { nombre: 'trimestral', dias: 91,  tol: 8 },
  { nombre: 'anual',      dias: 365, tol: 15 },
];
const mediana = a => { const s = [...a].sort((x,y)=>x-y), m = s.length>>1; return s.length%2 ? s[m] : (s[m-1]+s[m])/2; };

// ============ 4. DETECTOR PRINCIPAL ============
// txs: egresos (amount < 0) de los últimos 180 días. Deduplicar antes: misma firma+monto+fecha = 1 sola.
function detectarGastosFijos(txs) {
  const grupos = {};
  for (const t of txs) {
    const k = normalizarDescripcion(t.description);
    if (k.length < 3) continue;
    (grupos[k] ||= []).push(t);
  }
  const sugerencias = [];
  for (const [firma, lista] of Object.entries(grupos)) {
    if (lista.length < 2) continue;
    lista.sort((a,b) => new Date(a.date) - new Date(b.date));

    // Sub-agrupar por banda de monto ±25% (mismo comercio, 2 suscripciones distintas — patrón Copilot)
    const bandas = [];
    for (const t of lista) {
      const m = Math.abs(t.amount);
      const banda = bandas.find(b => Math.abs(m - b.montoMediano) / b.montoMediano <= 0.25);
      if (banda) { banda.txs.push(t); banda.montoMediano = mediana(banda.txs.map(x=>Math.abs(x.amount))); }
      else bandas.push({ montoMediano: m, txs: [t] });
    }

    for (const banda of bandas) {
      const b = banda.txs;
      if (b.length < 2) continue;
      const fechas = b.map(t => new Date(t.date).getTime());
      const intervalos = fechas.slice(1).map((f,i) => (f - fechas[i]) / 86400000);
      const medInt = mediana(intervalos);

      const cad = CADENCIAS.find(c => Math.abs(medInt - c.dias) <= c.tol);
      if (!cad) continue;
      const regularidad = intervalos.filter(i => Math.abs(i - cad.dias) <= cad.tol).length / intervalos.length;
      if (regularidad < 0.6) continue;

      // Estabilidad del monto (coeficiente de variación)
      const montos = b.map(t => Math.abs(t.amount));
      const prom = montos.reduce((a,x)=>a+x,0) / montos.length;
      const cv = Math.sqrt(montos.reduce((a,x)=>a+(x-prom)**2,0)/montos.length) / prom;

      const categoria = (b[b.length-1].category || '').toLowerCase();
      const priorFija   = CATS_CASI_SIEMPRE_FIJAS.some(c => categoria.includes(c));
      const priorNoFija = CATS_CASI_NUNCA_FIJAS.some(c => categoria.includes(c));

      // Score 0-100
      let score = 0;
      score += Math.min(b.length, 6) * 10;                              // ocurrencias (máx 60)
      score += regularidad * 20;                                        // cadencia (máx 20)
      score += cv <= 0.05 ? 20 : cv <= 0.15 ? 12 : cv <= 0.30 ? 5 : 0;  // monto (máx 20)
      if (priorFija)  score += 15;
      if (priorNoFija) score -= 20;
      if (b.length === 2) score -= 15;                                  // tentativo (early_detection de Plaid)

      if (score < 45) continue;                        // umbral de sugerencia
      if (cv > 0.30 && !priorFija) continue;           // monto muy variable sin prior → descartar

      const ultima = new Date(fechas[fechas.length-1]);
      sugerencias.push({
        firma,
        nombre: firma.split(' ').map(w => w[0]+w.slice(1).toLowerCase()).join(' '),
        montoTipico: Math.round(mediana(montos) * 100) / 100,
        montoVariable: cv > 0.15,                      // luz/agua: badge "Monto variable"
        frecuencia: cad.nombre,
        diaTipico: Math.round(mediana(b.map(t => new Date(t.date).getDate()))),
        proximoCargo: new Date(ultima.getTime() + cad.dias * 86400000).toISOString().slice(0,10),
        ocurrencias: b.length,
        confianza: Math.min(Math.round(score), 100),
        estado: b.length >= 3 ? 'confirmado' : 'tentativo',
        categoria: b[b.length-1].category,
        evidencia: b.slice(-3).map(t => ({ id: t.id, date: t.date, amount: t.amount })),
      });
    }
  }
  return sugerencias.sort((a,b) => b.confianza - a.confianza);
}
```

## B.3 Dónde se engancha (puntos exactos)

1. **Al confirmar un estado de cuenta:** al final del camino feliz de `confirmarEstado()` (L3870, DESPUÉS del insert exitoso de transactions — como llamada adicional, SIN modificar su lógica interna): `runFixedExpenseDetection()`.
2. **Al abrir page-gastos:** en `loadGastos()` L2767, llamada aditiva `loadSuggestionsBanner()` (lee sugerencias `status='pendiente'` ya guardadas; NO re-corre el detector).

```
runFixedExpenseDetection()
  // 1. query: select id,date,description,amount,category from transactions
  //    where user_id=X and amount<0 and date >= now()-interval '180 days'
  // 2. si el usuario tiene <90 días de historial → no correr; banner "Sube otro estado de cuenta
  //    para detectar tus gastos fijos automáticamente"
  // 3. dedup (firma+monto+fecha) → detectarGastosFijos(txs)
  // 4. filtrar contra recurring_suggestions existentes (misma user_id+firma+monto_tipico
  //    con cualquier status → saltar; 'rechazado' es lista negra permanente)
  // 5. filtrar contra fixed_expenses activos con nombre similar (no sugerir lo ya capturado a mano)
  // 6. upsert de nuevas con status='pendiente' → mostrar banner
```

### Funciones JS nuevas (bloque nuevo, tras page-gastos)
`runFixedExpenseDetection()`, `loadSuggestionsBanner()`, `openSuggestionsModal()`, `renderSuggestionCard(s)`, `confirmSuggestion(id)` — UPDATE `status='confirmado'` + INSERT en `fixed_expenses` `{name: nombre, amount: monto_tipico, due_day: dia_tipico, category: categoria, frequency: frecuencia === 'quincenal' ? 'quincenal' : frecuencia === 'anual' ? 'anual' : frecuencia === 'semanal' ? 'semanal' : 'mensual', is_active: true}` (bimestral/trimestral se guardan como mensual con nota en `notes`, porque el CHECK de `fixed_expenses.frequency` solo admite mensual/quincenal/anual/semanal) + refresh `loadGastos()`; `rejectSuggestion(id)` — UPDATE `status='rechazado'`; `editSuggestion(id)` — precarga `gastoModal` existente (L1444) con los datos y al guardar marca la sugerencia confirmada.

## B.4 UI — pantalla por pantalla

**Banner (en page-gastos, arriba del resumen; y tarjeta pequeña en overview):**
`.card` con borde `var(--p-border)`, fondo `var(--p-soft)`, icono `sparkles`: **"✨ Detectamos 7 gastos fijos por $12,400/mes"** + `.btn .btn-primary` "Revisar". Si hay 0 pendientes, el banner no existe.

**Modal `suggestionsModal`** (patrón overlay/modal estándar): pila de tarjetas, una por sugerencia:
- Línea 1: nombre editable + badges: `Mensual · ~día 15` · `Monto variable` (si cv>0.15, fondo `var(--state-warn-bg)`) · `Tentativo — visto 2 veces` (si ocurrencias=2).
- Línea 2: monto típico grande.
- Línea 3 (evidencia): "Visto: 15 abr · 15 may · 15 jun — $9,000 · $9,000 · $9,200".
- Acciones: `.btn-save` **"Sí, es fijo"** · `.btn-ghost` **"No es fijo"** · `.btn-ghost` **"Editar"**.
- Al terminar la pila: "Listo ✓ Tus gastos fijos suman $X/mes" + los próximos cargos aparecen en el calendario financiero (ya lo hace `loadCalendario` al leer `fixed_expenses`).

**Aviso de efectivo (siempre al pie del modal):** "Estos son los fijos que vimos en tu banco. Si pagas renta o sueldos en efectivo, agrégalos aquí →" (link abre `gastoModal`).

## B.5 Microcopy

- Banner: "✨ Detectamos {N} gastos fijos por {$X}/mes" / CTA "Revisar"
- Botones tarjeta: "Sí, es fijo" / "No es fijo" / "Editar"
- Tentativo: "Visto 2 veces — confírmalo tú"
- Variable: "El monto cambia (como luz o agua)"
- Sin historial: "Sube otro estado de cuenta para detectar tus gastos fijos automáticamente"
- Post-confirmación: "Agregado a tus gastos fijos ✓"

## B.6 Qué NO hacer en v1 (Fase B)

- ❌ Edge Function / detección server-side, ni pg_cron.
- ❌ Alertas "tu fijo subió >10%" o "no llegó su cargo" — v1.1, requiere job programado.
- ❌ Detección de ingresos recurrentes (nómina que te pagan) — solo egresos en v1.
- ❌ Cancelación de suscripciones, negociación, logos de comercios.
- ❌ Re-correr el detector en cada carga de página (solo tras nuevo PDF).

## B.7 Checklist de verificación

1. Correr SQL B.1 sin errores; tabla visible en Table Editor con RLS activo.
2. Subir un estado de cuenta con ≥3 meses de un cargo repetido (ej. renta) → al confirmar, aparece el banner.
3. Abrir "Revisar": la tarjeta muestra frecuencia, día típico y las 3 fechas de evidencia correctas.
4. "Sí, es fijo" → aparece en la lista de page-gastos y en el calendario del mes próximo.
5. "No es fijo" → desaparece; subir OTRO estado con el mismo cargo → NO se vuelve a sugerir (lista negra).
6. Un cargo de luz CFE (montos distintos, bimestral) → aparece con badge "Monto variable".
7. Cargos de gasolina irregulares → NO se sugieren.
8. Usuario con 1 solo PDF → mensaje de "sube otro estado de cuenta", sin sugerencias basura.
9. Probar `normalizarDescripcion` con descripciones reales de BBVA, Banorte y Santander ANTES de lanzar (advertencia de la investigación: difieren mucho).

---

# FASE C — ESTADO DE RESULTADOS

**Promesa:** "De cada $100 que vendiste este mes, te quedaron $12 — y aquí está el PDF para tu contador."

**Arquitectura:** página nueva `page-resultados` en el menú (grupo "Inteligencia", junto a Reportes). Todo se calcula en el navegador desde `transactions` (banco + efectivo) del período. Es un estado **base efectivo (gerencial)**, presentado con el esqueleto NIF B-3 "por función" que todo contador mexicano reconoce, etiquetado honesto.

## C.1 PASO 1 — SQL (solo 1 tabla opcional-pero-incluida)

```sql
-- Permite al usuario mover una categoría de línea (caso "Envíos": ¿costo o gasto?)
CREATE TABLE IF NOT EXISTS public.category_pnl_map (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category   text NOT NULL,
  pnl_line   text NOT NULL CHECK (pnl_line IN ('ventas','costo','gasto_operativo','financiero','impuestos','excluir','personal')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, category)
);
ALTER TABLE public.category_pnl_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "category_pnl_map_all" ON public.category_pnl_map
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_pnlmap_user ON public.category_pnl_map(user_id);
NOTIFY pgrst, 'reload schema';
```

## C.2 Mapeo categoría → línea (constante JS `PNL_MAP_DEFAULT`)

Basado en las categorías reales de `_PREDEFINED_CATS`/`_CAT_GROUPS` (dashboard.html L3239–3250). El mapa del usuario (`category_pnl_map`) tiene prioridad; lo no mapeado hereda por grupo (`_CAT_GROUPS['Negocios']` → `gasto_operativo`); lo desconocido → `gasto_operativo`.

| Línea (`pnl_line`) | Categorías |
|---|---|
| `ventas` | Ventas (ingresos con `type='ingreso'` de negocio; sublíneas por `source`: efectivo vs banco) |
| `costo` | Mercancía, Proveedores |
| `gasto_operativo` | Nómina, Renta, Publicidad, Software, Papelería, Contabilidad, Servicios, Honorarios, Envíos, Viajes |
| `financiero` | Comisiones |
| `impuestos` | SAT/Impuestos |
| `excluir` (SIEMPRE) | Transferencia, Pago TDC, Inversiones — incluirlos duplica o distorsiona |
| `personal` (fuera del cálculo, bloque informativo) | Comida, Café, Supermercado, Farmacia, Salud, Entretenimiento, Ropa, Transporte, Educación |

## C.3 Fórmulas exactas (`computePnl(txs, mapa)`)

```
ventasBanco    = Σ amount de tx type='ingreso', línea='ventas', source ≠ 'efectivo'
ventasEfectivo = Σ amount de tx type='ingreso', línea='ventas', source = 'efectivo'
ventas         = ventasBanco + ventasEfectivo
costo          = Σ |amount| de egresos con línea='costo'
utilidadBruta  = ventas − costo                        → margenBruto    = utilidadBruta / ventas × 100
gastosOp       = Σ |amount| de egresos línea='gasto_operativo' (desglose por categoría)
utilidadOper   = utilidadBruta − gastosOp              → margenOperativo = utilidadOper / ventas × 100
financieros    = Σ |amount| egresos línea='financiero'
impuestos      = Σ |amount| egresos línea='impuestos'
utilidadNeta   = utilidadOper − financieros − impuestos → margenNeto     = utilidadNeta / ventas × 100
retirosPersonales = Σ |amount| egresos línea='personal'   // informativo, NO resta en el estado
// Si ventas === 0: no dividir; mostrar "—" en márgenes.
// Ingresos manuales recurrentes (income_sources) NO entran: solo transactions reales del período.
```

## C.4 Layout de la página (5 bloques, lenguaje llano + término formal)

Header: selector de mes (`navPnlMes` estilo `navCalMes` L3189) + botón `.btn .btn-primary` "Descargar PDF" + subtítulo permanente: *"Estado de resultados (base efectivo) — reporte gerencial"*.

Cada bloque es una `.card`; los subtotales en fila destacada (fondo `var(--p-soft)`, monto en bold, margen % a la derecha con color `var(--pos)`/`var(--neg)`):

1. **💰 Lo que vendiste (Ventas)** — sublíneas "Banco $X" / "Efectivo $Y" (badge `.src-efectivo`).
2. **📦 Lo que te costó la mercancía (Costo de mercancía — compras del mes)** → fila **UTILIDAD BRUTA** + "de cada $100 vendidos te quedan $N después de la mercancía".
3. **🏢 Lo que cuesta operar (Gastos de operación)** — desglose por categoría colapsable (solo categorías con movimiento; menores al 3% agrupadas en "Otros") → fila **UTILIDAD DE OPERACIÓN** + margen %.
4. **🏦 Bancos e impuestos** — Comisiones e intereses / SAT (tooltip ⚠️) → fila grande **UTILIDAD NETA** + frase resumen: **"De cada $100 que vendiste, te quedaron $N"**. Referencia visual de salud: neto <5% rojo, 5–10% ámbar (`--state-warn`), >10% verde (`--state-ok`).
5. **👤 Retiros personales (informativo)** — "$X salieron para gastos personales. No cuentan como gasto del negocio."

**Comparativo:** toggle "Comparar con mes anterior" → columnas `[Mes actual | % de ventas | Mes anterior | Δ%]`, flechas con **lógica invertida en gastos** (gasto que sube = rojo `var(--trend-down)`… usar tokens trend existentes).

## C.5 Export PDF

Reutilizar jsPDF + autoTable ya cargados (patrón `repDownloadPDF` L4279). El PDF usa términos formales (Ventas netas, Costo de ventas, Utilidad bruta, Gastos de operación, Utilidad de operación, Utilidad neta), incluye período, desglose por categoría, comparativo si está activo, y pie OBLIGATORIO: *"Reporte gerencial elaborado sobre base de flujo de efectivo. No sustituye la contabilidad fiscal."*

## C.6 Funciones JS nuevas (bloque `// ===== ESTADO DE RESULTADOS =====`, después de page-reportes ~L4300)

```
loadResultados()        // loader del dispatcher: query transactions del mes + category_pnl_map → computePnl → renderPnl
getPnlLine(tx, mapaUsuario)  // resuelve línea: mapa usuario > PNL_MAP_DEFAULT > grupo de _customCats > 'gasto_operativo'
computePnl(txs, mapa)   // fórmulas C.3, devuelve objeto {ventas:{banco,efectivo,total}, costo, ub, gastosOp:{total,porCategoria}, uo, fin, imp, un, margenes, personal}
renderPnl(actual, anterior|null)  // pinta los 5 bloques + comparativo
navPnlMes(delta)        // cambia mes y recarga
movePnlCategory(cat, linea)      // upsert en category_pnl_map + recompute (UI: menú ⋮ en cada categoría "Mover a…")
pnlDownloadPDF()        // jsPDF + autoTable, términos formales + pie obligatorio
```

Toques a lo existente (3 del patrón): botón sidebar en grupo "Inteligencia" (`showPage('resultados')`, icono `trending-up`), `titles['resultados']='Estado de resultados'`, branch `if (id==='resultados') loadResultados();`.

## C.7 Microcopy

- Título del menú: **"Estado de resultados"** (el término formal SÍ, porque es lo que pide el contador; el lenguaje llano va dentro).
- Tooltip SAT: "Los pagos de IVA no son gasto de tu negocio: es impuesto que cobras por cuenta del SAT."
- Aviso doble conteo: "Los 'Pago TDC' están excluidos para no contar doble tus gastos de tarjeta."
- Ventas=0 con gastos>0: "¿Vendiste en efectivo este mes? Regístralo para que tu estado no salga en pérdida →" (botón abre `cashModal`).
- Vacío total: "Sube un estado de cuenta o registra tu efectivo para armar tu estado de resultados."

## C.8 Qué NO hacer en v1 (Fase C)

- ❌ Devengado, inventarios, depreciación, costo de ventas contable — es base efectivo y se dice.
- ❌ Comparativo de 3–12 meses en columnas (estilo Bind) — v2; v1 solo mes actual vs anterior.
- ❌ Cálculo/provisión automática de ISR — la línea impuestos solo suma lo realmente pagado; si es 0, se fusiona "antes de impuestos" con neta.
- ❌ Export Excel/CSV (ya existe en Reportes generales) ni edición de transacciones desde esta página.
- ❌ Presupuestos vs real.

## C.9 Checklist de verificación

1. SQL C.1 corre sin errores.
2. Con datos de un mes real (banco + efectivo registrado en Fase A): Ventas muestra las 2 sublíneas y suma bien contra la página Transacciones.
3. Transferencias, Pago TDC e Inversiones NO aparecen en ninguna línea (verificar con una transferencia de prueba).
4. Utilidad bruta/operación/neta cuadran a mano con calculadora (tolerancia $0.01).
5. Gastos personales aparecen SOLO en el bloque informativo y no restan a la utilidad.
6. Mover "Envíos" a Costo con el menú ⋮ → recalcula al instante y persiste tras recargar.
7. Comparativo: mes sin datos previos muestra "—", no NaN; gasto que sube sale rojo, venta que sube verde.
8. PDF: abre en el celular, términos formales, pie de "reporte gerencial" presente. Mandárselo a un contador real y pedir su visto bueno (prueba de fuego de la fase).
9. Mes con ventas=0 y gastos>0 → aparece el CTA de registrar efectivo, no una pérdida alarmante sin contexto.

---

# FASE D — CLIENTES

**Promesa:** "Tu libreta de clientes, con WhatsApp a un tap y la cuenta clara de quién te debe."

**Arquitectura:** página nueva `page-clientes` en grupo nuevo del sidebar **"Operación"** (entre "Finanzas" e "Inteligencia", como reserva el ROADMAP). Cliente = registro maestro; los abonos son `transactions` ligadas por `client_id` (los números — gastado total, saldo — se CALCULAN, nunca se capturan). Vocabulario mexicano: Cliente, Cotización, Apartado, Abono, Debe/Pagó. Cero jerga CRM.

## D.1 PASO 1 — SQL

```sql
-- ==== D1. Clientes ====
CREATE TABLE IF NOT EXISTS public.clients (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  phone      text,                          -- 10 dígitos MX; se asume +52 al armar wa.me
  email      text,
  tag        text CHECK (tag IN ('nuevo','frecuente','vip')) DEFAULT 'nuevo',
  notes      text,                          -- nota libre: "anillo 14k talla 6, le gusta oro rosa"
  is_active  boolean NOT NULL DEFAULT true, -- soft-delete, patrón del proyecto
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clients_all" ON public.clients
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_clients_user ON public.clients(user_id);

-- ==== D2. Cotizaciones / apartados (el "trato") ====
CREATE TABLE IF NOT EXISTS public.quotes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id    uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  description  text NOT NULL,               -- "Anillo oro 14k talla 6"
  amount       numeric(12,2) NOT NULL CHECK (amount > 0),
  status       text NOT NULL DEFAULT 'cotizado' CHECK (status IN ('cotizado','apartado','entregado','pagado','cancelado')),
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quotes_all" ON public.quotes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_user ON public.quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_client ON public.quotes(client_id);

-- ==== D3. Ligar pagos a clientes (los abonos son transactions normales) ====
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS quote_id  uuid REFERENCES public.quotes(id)  ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tx_client ON public.transactions(client_id) WHERE client_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
```

**Números derivados (queries, NO columnas):** gastado total = Σ ingresos con `client_id`; saldo pendiente por cotización = `quotes.amount − Σ abonos con ese quote_id` (solo status apartado/entregado); última visita = `max(date)` de sus transactions.

## D.2 PASO 3 — Frontend

### Pantalla 1 — Lista (`page-clientes`)
- Header: buscador `.finp` (filtra por nombre/teléfono en memoria) + `.btn .btn-primary` **"+ Cliente"** (icono `user-plus`).
- Chips de orden/filtro: **"Todos" · "Me deben" · "Sin venir 3+ meses" · "VIP"** — los dos de en medio son el valor sin capturar nada.
- Fila por cliente (`.card` compacta o tabla estilo transacciones): avatar-inicial con color derivado del nombre, nombre + badge tag, "Debe $X" en `var(--neg-text)` si tiene saldo, última visita relativa ("hace 2 meses"), botón WhatsApp directo (icono `message-circle`, verde #25D366). Click en fila → ficha.

### Pantalla 2 — Modal alta rápida `clienteModal` (clonar `ingresoModal` L1405)
**Solo 2 campos obligatorios**: Nombre + Teléfono (10 dígitos, validar `^\d{10}$`, se asume +52). Colapsado bajo "Más datos ▾": email, etiqueta (Nuevo/Frecuente/VIP), nota. Si el teléfono ya existe → aviso "Ya tienes a {nombre} con ese teléfono — ¿abrir su ficha?" (anti-duplicados). Alta en <10 segundos.

### Pantalla 3 — Ficha (`page-cliente-detalle`, o panel dentro de page-clientes con `_clienteActual`; recomendado: sub-vista dentro de page-clientes mostrada/ocultada con JS, para no tocar el router)
Cuatro bloques en `.card`:
1. **Encabezado:** nombre + tag editable + DOS botones grandes: **WhatsApp** (`.btn` fondo #25D366) → abre menú de plantillas (D.4) → `window.open('https://wa.me/52'+phone+'?text='+encodeURIComponent(msg))` · **Llamar** (`.btn-ghost`, `href="tel:"`).
2. **Números automáticos** (fila de 4 KPIs estilo `renderIngresosKPIs`): Total gastado · **Debe $X** · Visitas · Última visita.
3. **Cotizaciones/Apartados:** lista de `quotes` con pipeline visual de 4 pasos `Cotizado → Apartado → Entregado → Pagado` (chips clickeables para avanzar estado), monto, abonado, restante + botones **"+ Cotización"** y **"+ Abono"**. "+ Abono" abre el `cashModal` de Fase A precargado (`openCashModal('entrada', {clientId, quoteId, concepto: 'Abono '+cliente.name})`) — el abono ES un ingreso: alimenta corte del día, calendario, reportes y Estado de Resultados sin código extra.
4. **Notas + historial:** textarea de nota libre siempre visible (autosave con debounce 800ms) + timeline (merge de quotes y transactions del cliente, orden desc).

### Funciones JS nuevas (bloque `// ===== CLIENTES =====`; plantilla: patrón de page-ingresos L2443–2611)

```
loadClientes()             // query clients activos + agregados (2 queries: clients, y transactions con client_id para saldos)
renderClientes(filtro)     // pinta lista con chips de filtro
saveCliente()              // valida nombre+teléfono, checa duplicado por phone, INSERT/UPDATE
openClienteFicha(id)       // oculta lista, muestra sub-vista ficha, carga quotes+tx del cliente
renderFichaKPIs(cliente)   // total gastado, debe, visitas, última visita (calculados)
saveQuote() / advanceQuoteStatus(id)   // alta de cotización y avance de pipeline (updated_at=now())
saveClienteNote(id)        // autosave debounced de notes
waLink(phone, plantilla, datos)        // arma https://wa.me/52{phone}?text={plantilla rellenada}
deleteCliente(id)          // soft-delete is_active=false (patrón deleteIngreso L2603)
```

Extensión mínima a Fase A: `openCashModal(tipo, prefill)` acepta objeto opcional `{clientId, quoteId, concepto}` y `saveCashMovement()` los incluye en el INSERT si vienen.

Toques al router (los 3 de siempre): sidebar `<div class="nav-lbl">Operación</div>` + botón `showPage('clientes')` (icono `users`), `titles['clientes']='Clientes'`, branch `loadClientes()`.

## D.3 Microcopy

- Alta: "+ Cliente" / "Nombre" / "Celular (10 dígitos)" / "Más datos ▾"
- Duplicado: "Ya tienes a {nombre} con ese teléfono. ¿Abrir su ficha?"
- KPIs: "Ha gastado" · "Te debe" · "Visitas" · "Última visita"
- Pipeline: "Cotizado" · "Apartado" · "Entregado" · "Pagado"
- Abono guardado: "Abono de $2,000 registrado ✓ — {nombre} debe $5,500"
- Filtros: "Me deben" · "Sin venir 3+ meses"
- Vacío: "Aquí van tus clientes. Empieza con los 5 que más te compran."

## D.4 Plantillas WhatsApp (constante `WA_TEMPLATES`, editables en v2)

1. **Cobro:** "Hola {nombre} 👋 Te recuerdo tu saldo pendiente de {monto} por {descripcion}. ¿Te queda bien pasar esta semana?"
2. **Pedido listo:** "Hola {nombre} 👋 ¡Tu {descripcion} ya está listo! Te esperamos 😊"
3. **Recordatorio de cita:** "Hola {nombre} 👋 Te esperamos {fecha} a las {hora}. Si necesitas mover tu cita, avísame por aquí."
4. **Libre:** abre wa.me sin texto.

## D.5 Qué NO hacer en v1 (Fase D)

- ❌ WhatsApp Business API / mensajes automáticos (cuesta dinero, requiere Meta Business; `wa.me` es gratis y suficiente).
- ❌ Importar contactos del teléfono, foto del cliente, campos custom, etiquetas ilimitadas.
- ❌ Kanban de pipeline, "leads", embudos, recordatorios automáticos de cobranza.
- ❌ Cotización en PDF para enviar — v1.1 (reusar jsPDF cuando la ficha esté validada).
- ❌ Ligar retroactivamente transactions viejas a clientes de forma masiva.

## D.6 Checklist de verificación

1. SQL D.1 corre sin errores; `transactions.client_id` existe.
2. Alta de cliente con solo nombre+teléfono en <10 segundos desde el celular.
3. Teléfono repetido → aviso de duplicado con link a la ficha.
4. Botón WhatsApp abre WhatsApp con el mensaje de cobro ya escrito, monto correcto, al +52 correcto.
5. Crear cotización $7,500 "Anillo 14k" → estado Cotizado; avanzar a Apartado; "+ Abono" $2,000 en efectivo → la ficha muestra "Debe $5,500" y el abono aparece en Efectivo de hoy (Fase A), calendario y Estado de Resultados (Fase C) como venta en efectivo.
6. Filtro "Me deben" muestra solo clientes con saldo; "Sin venir 3+ meses" ordena bien.
7. Nota libre se guarda sola y sobrevive recarga.
8. Segundo usuario no ve clientes del primero (RLS).
9. Soft-delete: cliente eliminado desaparece de la lista pero sus transacciones históricas no se rompen.

---

# FASE E — CITAS TIPO CALENDLY

**Promesa:** "Comparte un link por WhatsApp y tus clientes agendan solos — sin ping-pong de '¿te queda el martes?'."

**Arquitectura (del reporte calendly):** 3 tablas + 3 RPCs `SECURITY DEFINER` + 1 página pública + 1 sección en el dashboard. El cliente final NUNCA crea cuenta. Zona horaria fija `America/Mexico_City`. Anti-doble-reserva a nivel BD con EXCLUSION constraint (nunca confiar en JS). Los slots se calculan al vuelo, JAMÁS se pre-generan filas de slots vacíos.

## E.1 PASO 1 — SQL

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ==== E1. Página pública de reservas (1 por usuario en v1) ====
CREATE TABLE IF NOT EXISTS public.booking_pages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  slug             text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{2,39}$'),
  business_name    text NOT NULL,
  slot_minutes     int  NOT NULL DEFAULT 30 CHECK (slot_minutes IN (15,30,45,60)),
  min_notice_hours int  NOT NULL DEFAULT 4  CHECK (min_notice_hours BETWEEN 0 AND 72),
  max_days_ahead   int  NOT NULL DEFAULT 30 CHECK (max_days_ahead BETWEEN 1 AND 90),
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz DEFAULT now()
);

-- ==== E2. Disponibilidad semanal (varias filas por día = horario partido 9-14 y 16-19) ====
CREATE TABLE IF NOT EXISTS public.availability_rules (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week int  NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0=domingo
  start_time  time NOT NULL,
  end_time    time NOT NULL,
  CHECK (end_time > start_time)
);

-- ==== E3. Citas ====
CREATE TABLE IF NOT EXISTS public.appointments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id      uuid REFERENCES public.clients(id) ON DELETE SET NULL,   -- liga con Fase D
  customer_name  text NOT NULL,
  customer_phone text NOT NULL,          -- teléfono, NO email: el cliente mexicano da celular
  starts_at      timestamptz NOT NULL,
  ends_at        timestamptz NOT NULL,
  status         text NOT NULL DEFAULT 'confirmada' CHECK (status IN ('confirmada','hecha','cancelada')),
  cancel_token   uuid NOT NULL DEFAULT gen_random_uuid(),
  origin         text NOT NULL DEFAULT 'publica' CHECK (origin IN ('publica','manual')),
  notes          text,
  created_at     timestamptz DEFAULT now(),
  CHECK (ends_at > starts_at),
  -- LA doble reserva es imposible a nivel base de datos:
  CONSTRAINT no_double_booking EXCLUDE USING gist
    (user_id WITH =, tstzrange(starts_at, ends_at) WITH &&) WHERE (status = 'confirmada')
);

-- ==== E4. RLS: el dueño todo; el público NADA directo (solo vía RPCs) ====
ALTER TABLE public.booking_pages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments       ENABLE ROW LEVEL SECURITY;
CREATE POLICY "booking_pages_all" ON public.booking_pages
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "availability_all" ON public.availability_rules
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "appointments_all" ON public.appointments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_appt_user_start ON public.appointments(user_id, starts_at);

-- ==== E5. RPC: datos públicos de la página ====
CREATE OR REPLACE FUNCTION public.get_public_page(p_slug text)
RETURNS json LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object('business_name', business_name, 'slot_minutes', slot_minutes,
                           'max_days_ahead', max_days_ahead)
  FROM booking_pages WHERE slug = lower(p_slug) AND is_active = true;
$$;

-- ==== E6. RPC: slots libres de un día (calculados al vuelo) ====
CREATE OR REPLACE FUNCTION public.get_available_slots(p_slug text, p_date date)
RETURNS TABLE (slot_start timestamptz) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_page booking_pages%ROWTYPE;
BEGIN
  SELECT * INTO v_page FROM booking_pages WHERE slug = lower(p_slug) AND is_active = true;
  IF NOT FOUND THEN RETURN; END IF;
  IF p_date < current_date OR p_date > current_date + v_page.max_days_ahead THEN RETURN; END IF;

  RETURN QUERY
  WITH reglas AS (
    SELECT r.start_time, r.end_time FROM availability_rules r
    WHERE r.user_id = v_page.user_id
      AND r.day_of_week = EXTRACT(dow FROM p_date)::int
  ),
  slots AS (
    SELECT generate_series(
      (p_date::text || ' ' || rg.start_time::text)::timestamp AT TIME ZONE 'America/Mexico_City',
      (p_date::text || ' ' || rg.end_time::text)::timestamp AT TIME ZONE 'America/Mexico_City'
        - (v_page.slot_minutes || ' minutes')::interval,
      (v_page.slot_minutes || ' minutes')::interval
    ) AS s FROM reglas rg
  )
  SELECT s FROM slots
  WHERE s >= now() + (v_page.min_notice_hours || ' hours')::interval
    AND NOT EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.user_id = v_page.user_id AND a.status = 'confirmada'
        AND tstzrange(a.starts_at, a.ends_at) &&
            tstzrange(s, s + (v_page.slot_minutes || ' minutes')::interval)
    )
  ORDER BY s;
END; $$;

-- ==== E7. RPC: crear cita (valida TODO server-side + anti-spam) ====
CREATE OR REPLACE FUNCTION public.create_appointment(
  p_slug text, p_starts_at timestamptz, p_name text, p_phone text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_page booking_pages%ROWTYPE; v_appt appointments%ROWTYPE;
BEGIN
  SELECT * INTO v_page FROM booking_pages WHERE slug = lower(p_slug) AND is_active = true;
  IF NOT FOUND THEN RETURN json_build_object('ok', false, 'error', 'pagina_no_existe'); END IF;
  IF length(trim(p_name)) < 2 OR p_phone !~ '^\d{10}$' THEN
    RETURN json_build_object('ok', false, 'error', 'datos_invalidos');
  END IF;
  -- Anti-spam: máx 3 citas futuras confirmadas por teléfono por negocio
  IF (SELECT count(*) FROM appointments WHERE user_id = v_page.user_id
      AND customer_phone = p_phone AND status = 'confirmada' AND starts_at > now()) >= 3 THEN
    RETURN json_build_object('ok', false, 'error', 'limite_telefono');
  END IF;
  -- El slot debe ser legítimo (recalcular, nunca confiar en el cliente)
  IF NOT EXISTS (SELECT 1 FROM get_available_slots(p_slug, (p_starts_at AT TIME ZONE 'America/Mexico_City')::date) g
                 WHERE g.slot_start = p_starts_at) THEN
    RETURN json_build_object('ok', false, 'error', 'slot_no_disponible');
  END IF;
  BEGIN
    INSERT INTO appointments (user_id, customer_name, customer_phone, starts_at, ends_at)
    VALUES (v_page.user_id, trim(p_name), p_phone, p_starts_at,
            p_starts_at + (v_page.slot_minutes || ' minutes')::interval)
    RETURNING * INTO v_appt;
  EXCEPTION WHEN exclusion_violation THEN
    RETURN json_build_object('ok', false, 'error', 'slot_no_disponible');  -- carrera perdida, con gracia
  END;
  RETURN json_build_object('ok', true, 'cancel_token', v_appt.cancel_token,
                           'starts_at', v_appt.starts_at, 'business_name', v_page.business_name);
END; $$;

-- ==== E8. RPC: cancelar por token (link del cliente) ====
CREATE OR REPLACE FUNCTION public.cancel_appointment(p_token uuid)
RETURNS json LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE appointments SET status = 'cancelada'
  WHERE cancel_token = p_token AND status = 'confirmada' AND starts_at > now()
  RETURNING json_build_object('ok', true);
$$;

-- Permisos: anon SOLO ejecuta los RPCs, jamás toca tablas
REVOKE ALL ON public.booking_pages, public.availability_rules, public.appointments FROM anon;
GRANT EXECUTE ON FUNCTION public.get_public_page(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_available_slots(text, date) TO anon;
GRANT EXECUTE ON FUNCTION public.create_appointment(text, timestamptz, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.cancel_appointment(uuid) TO anon;
NOTIFY pgrst, 'reload schema';
```

## E.2 PASO 3 — Frontend (2 piezas)

### Pieza 1 — Página pública NUEVA: `agenda.html` (archivo nuevo en Hostinger, junto a index.html)
Standalone, cliente Supabase con anon key (misma config de `assets/app.js` pero SIN requireAuth). Lee `?u=slug`. Diseño premium del sistema (morado `--p`, `.card`, `.btn`), móvil-primero. **3 pantallas máximo, cero login:**
1. **Día:** nombre del negocio + mini-calendario del mes (grid lunes-primero, reusar patrón visual de `renderCalMes`); días con reglas de disponibilidad resaltados; navegación mes ±. Al tocar día → RPC `get_available_slots`.
2. **Hora:** columna de botones-pill con las horas libres ("11:00", "11:30"…). Si vacío: "No hay horarios este día, prueba otro".
3. **Datos:** Nombre + Celular (10 dígitos) + botón "Confirmar cita" → RPC `create_appointment` → **Confirmación:** "✅ Tu cita: martes 8 de julio, 11:00 — {negocio}. Guarda este link por si necesitas cancelar: agenda.html?cancel={token}" + botón "Agregar recordatorio a WhatsApp" (wa.me al propio negocio con texto de la cita).
- Con `?cancel={token}`: pantalla de confirmación de cancelación → RPC `cancel_appointment`.
- Error `slot_no_disponible`: "Esa hora se acaba de ocupar 😅 Elige otra" + refresca slots (la carrera se maneja con gracia).
- Pie viral obligatorio: **"Agenda creada con Horizen · horizen.com.mx"** (el loop que le dio a Calendly 70% de sus registros).
- Funciones JS (inline en agenda.html): `initAgenda()`, `loadPublicPage(slug)`, `renderMiniCal()`, `loadSlots(fecha)`, `renderSlots()`, `submitBooking()`, `showConfirmation(r)`, `handleCancelToken(token)`.

### Pieza 2 — Sección en dashboard: `page-citas` (grupo "Operación", debajo de Clientes)
- **Card "Mi link de citas":** setup 1 sola vez — nombre del negocio, slug (validado `^[a-z0-9-]{3,40}$`, minúsculas al vuelo; si está tomado, sugerir alternativa), duración (15/30/45/60), aviso mínimo. Muestra el link `horizen.com.mx/agenda.html?u={slug}` + botones "Copiar" y "Compartir por WhatsApp".
- **Card "Mi horario":** editor semanal — 7 filas (Lun…Dom), cada una con toggle y rangos hora-inicio/hora-fin, botón "+ agregar rango" (horario partido 9-14 / 16-19). Guarda en `availability_rules` (delete+insert del día editado).
- **Card "Próximas citas":** lista (fecha, hora, nombre, teléfono con botón WhatsApp plantilla recordatorio de D.4) con acciones: **"Se hizo ✓"** → `status='hecha'` + ofrece "¿Registrar el cobro en efectivo?" → `openCashModal('entrada', {concepto:'Cita '+nombre})` (cierre del ciclo agenda→ingreso, el diferenciador vs Calendly) · **"Cancelar"** → `status='cancelada'`. También "+ Cita manual" (origin='manual', mismo INSERT vía cliente autenticado — el RLS del dueño lo permite).
- **Integración calendario financiero:** en `loadCalendario()` L3027, agregar 4ª query al `Promise.all` (L3040–3044): appointments del mes con status='confirmada'; nueva colección `citas[]` en `_calDayData` (L3049–3082); en la celda un punto morado `var(--p)` y en `showCalDay()` (L3132) la lista de citas del día. **NO tocar** `renderCalChart` ni las sumas de dinero: las citas son capa visual, no montos.
- Funciones JS nuevas: `loadCitas()`, `saveBookingPage()`, `renderHorarioEditor()`, `saveAvailabilityDay(dow)`, `renderProximasCitas()`, `marcarCitaHecha(id)`, `cancelarCitaOwner(id)`, `saveCitaManual()`, `copyAgendaLink()`.
- Toques al router: botón sidebar (icono `calendar-clock`), `titles['citas']='Citas'`, branch `loadCitas()`.

## E.3 Microcopy

- Setup: "Crea tu link de citas" / "Tu link: horizen.com.mx/agenda.html?u=joyeria-lopez" / "Compártelo por WhatsApp o ponlo en tu bio de Instagram"
- Página pública: "Agenda tu cita con {negocio}" / "Elige el día" / "Elige la hora" / "¿A nombre de quién?" / "Tu celular (10 dígitos)"
- Confirmación: "✅ ¡Listo, {nombre}! Tu cita: {día} {fecha}, {hora}."
- Slot ganado por otro: "Esa hora se acaba de ocupar 😅 Elige otra."
- Cancelación cliente: "Tu cita quedó cancelada. ¡Agenda otra cuando quieras!"
- Dashboard: "Se hizo ✓" / "¿Registrar el cobro en efectivo?" / vacío: "Comparte tu link y aquí verás las citas que agenden tus clientes."

## E.4 Qué NO hacer en v1 (Fase E)

- ❌ Google Calendar sync (el comerciante mexicano no vive ahí; su agenda ES Horizen).
- ❌ Múltiples tipos de evento, múltiples zonas horarias (fijo America/Mexico_City), buffers configurables.
- ❌ Pagos/anticipos en la reserva, SMS/email automáticos (recordatorio = botón wa.me manual).
- ❌ Reagendar (v1: cancelar + reservar de nuevo), bloqueo de fechas específicas/vacaciones (v1.1), límite de citas por día.
- ❌ Reservas de múltiples empleados/recursos.

## E.5 Checklist de verificación

1. SQL E.1 completo sin errores (extensión btree_gist activa; verificar con `\dx` o el panel Database → Extensions).
2. Crear página slug `joyeria-prueba`, horario Lun-Vie 10:00-14:00, duración 30, aviso 4h.
3. Abrir `agenda.html?u=joyeria-prueba` en incógnito (SIN sesión): carga, muestra solo días/horas válidos futuros (respeta aviso mínimo).
4. Reservar con nombre y celular → confirmación con fecha correcta y link de cancelación.
5. **Prueba de carrera:** dos pestañas incógnito en el mismo slot, confirmar en ambas → una gana, la otra ve "Esa hora se acaba de ocupar" y slots refrescados.
6. La cita aparece en page-citas y como punto en el calendario financiero, sin alterar los totales de dinero del mes.
7. Cancelar desde el link del cliente → el slot vuelve a aparecer libre en la página pública.
8. "Se hizo ✓" + registrar cobro → el ingreso en efectivo aparece en Efectivo de hoy y Estado de Resultados.
9. Intentar 4ª cita futura con el mismo teléfono → rechazada (anti-spam). Intentar INSERT directo a appointments con anon key (curl) → rechazado por RLS.
10. Slug con mayúsculas/espacios → el input lo normaliza; slug duplicado → error claro.

---

# CIERRE — Secuencia de entrega y dependencias

```
A (efectivo) ──► C (estado de resultados necesita ventas en efectivo)
B (gastos fijos) ──► C (línea de gastos más completa)        [B es independiente de A]
A + D (clientes: los abonos usan el cashModal de A)
D ──► E (citas se ligan a clientes; plantillas WhatsApp compartidas)
```

- **Deploy por fase:** SQL en Supabase → editar dashboard.html (un solo agente a la vez) → subir a Hostinger → correr el checklist completo → commit → siguiente fase.
- **Validación Fase 2 ⭐ de cada feature:** probar con el usuario real (la joyería) antes de pulir: A = ¿registra efectivo 5 días seguidos? · B = ¿confirma >70% de sugerencias? · C = ¿su contador acepta el PDF? · D = ¿usa el botón WhatsApp para cobrar? · E = ¿un cliente real agenda solo?
- **Recordatorio permanente:** `is_fiscal=false` en todo efectivo; Horizen administra el negocio, no factura ni sustituye al contador.

*Fin del plan. Fuentes y evidencia: INVESTIGACION-EMPRESARIAL.md. Referencias de línea verificadas contra dashboard.html al 2026-07.*
