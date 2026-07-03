# SISTEMA DE DISEÑO HORIZEN v1.0

**Referencias:** Stripe Dashboard, Mercury Bank, Linear, Ramp.
**Usuario objetivo:** dueño de PYME mexicana, NO técnico. La claridad vale tanto como la estética.
**Restricciones:** vanilla CSS/HTML, SVG inline, Inter (ya cargada), sin frameworks ni fuentes nuevas.

Este documento es la única fuente de verdad visual. Si un valor no está aquí, no se inventa: se agrega aquí primero.

---

## 1. PRINCIPIOS (reglas duras, no negociables)

1. **El color solo aparece cuando significa algo.** Verde = dinero que entra / resultado positivo. Rojo = dinero que sale / resultado negativo. Morado = "esto se puede hacer clic" (acción primaria, links, estado activo). Ámbar = advertencia. Todo lo demás es neutro (tinta, gris, blanco). Un elemento decorativo nunca lleva color.
2. **Un solo número héroe por pantalla.** Cada página responde UNA pregunta ("¿gané o perdí este mes?"). Ese número es el más grande de la pantalla; nada compite con él en tamaño.
3. **Cero emojis en la interfaz.** Todos los iconos son SVG inline de Lucide (sección 3). Los emojis se ven distintos en cada sistema operativo, no se pueden colorear y gritan "amateur". Excepción única: NOVA puede usar tono conversacional en su TEXTO, nunca en iconos.
4. **Los montos siempre en números tabulares** (`font-variant-numeric: tabular-nums`) y siempre con el mismo formato: `$12,345` (sin centavos en resúmenes, con centavos solo en listas de transacciones editables). Los montos negativos se escriben con signo `−$1,234`, no solo con color (accesibilidad: 8% de hombres no distinguen rojo/verde).
5. **Datos densos, marco espacioso.** (Patrón Stripe.) Las tablas y listas pueden ser compactas, pero las tarjetas, márgenes y encabezados respiran con la escala de espaciado de la sección 5. Nunca valores de espaciado inventados.
6. **Máximo peso tipográfico: 700.** Se eliminan 800 y 900. El lujo se comunica con espacio y jerarquía, no con grosor. Se ajusta el `<link>` de Google Fonts a `wght@400;500;600;700`.
7. **Nada de gradientes en datos.** Los gradientes morados en barras, medidores y fondos se eliminan. Un dato se pinta de UN color plano. Los gradientes solo sobreviven en el avatar del usuario (identidad) — en ningún otro lugar.

---

## 2. PALETA DEFINITIVA

### 2.1 Bloque `:root` completo (reemplaza al actual, línea ~14)

```css
:root{
  /* Marca / interactivo — SOLO botones primarios, links, estado activo, focus */
  --p:#635bff;            /* se queda: es la identidad Horizen */
  --p-hover:#4b45c6;      /* antes --p2 */
  --p-soft:rgba(99,91,255,.08);   /* fondo de item activo del sidebar */
  --p-border:rgba(99,91,255,.25); /* borde de elementos seleccionados */

  /* Tinta y superficies */
  --ink:#0a2540;          /* texto principal (antes --text; --text queda como alias) */
  --text:#0a2540;
  --slate:#425466;        /* texto secundario largo (párrafos, explicaciones) */
  --muted:#697386;        /* labels, captions, metadatos */
  --bg:#f6f9fc;           /* fondo de la app */
  --bg2:#ffffff;          /* superficies (tarjetas, sidebar, topbar) */
  --bg3:#f3f5f9;          /* superficies hundidas (inputs, zonas de carga) */
  --bg4:#eef1f6;          /* tracks de medidores, hover de filas */
  --line:rgba(10,37,64,.08);   /* borde estándar (antes --border; se unifican) */
  --border:rgba(10,37,64,.08);

  /* Dinero — ÚNICO uso permitido de verde y rojo */
  --pos:#0e9f6e;          /* monto positivo / ingreso (en tamaños ≥1rem) */
  --pos-text:#0a7a55;     /* verde para texto chico (<1rem, mejor contraste) */
  --pos-bg:#e9f9f1;       /* fondo de chips/banners positivos */
  --neg:#df1b41;          /* monto negativo / egreso (rojo Stripe, único rojo) */
  --neg-text:#b3093c;     /* rojo para texto chico */
  --neg-bg:#fdecef;       /* fondo de chips/banners negativos */

  /* Advertencia — solo alertas reales (duplicados, datos sin clasificar, riesgo) */
  --warn:#b45309;
  --warn-bg:#fff7ed;
  --warn-border:rgba(217,119,6,.25);

  /* Radios (sección 5) */
  --r-sm:8px; --r-md:12px; --r-lg:16px;

  /* Sombras — SOLO estas dos */
  --shadow-1:0 1px 2px rgba(10,37,64,.06);
  --shadow-2:0 4px 16px -4px rgba(10,37,64,.12);
}
```

### 2.2 Qué se queda, qué se elimina

| Token actual | Decisión | Motivo |
|---|---|---|
| `--p:#635bff` | ✅ Se queda | Identidad de marca. Pero su uso se RESTRINGE a interactivo. |
| `--p2:#4b45c6` | ✅ Renombrado `--p-hover` | Solo hover del botón primario. |
| `--sec:#8b7cff` | ❌ Se elimina | Solo existía para gradientes. Los gradientes se van (Principio 7). |
| `--ok:#0e9f6e` | ✅ Renombrado `--pos` | Deja de ser "ok genérico" y pasa a significar SOLO dinero positivo. |
| `--err:#e2435f` | ❌ Reemplazado por `--neg:#df1b41` | Hoy conviven 4 rojos (#e2435f, #c0314a, #ef476f, #f43f5e). Queda UNO. |
| `--warn:#d97706` | ✅ Ajustado a #b45309 | Mejor contraste sobre blanco (WCAG AA en texto chico). |
| `--bg/--bg2/--bg3/--bg4` | ✅ Se quedan | Escala de superficies correcta, estilo Stripe. |
| `--text:#0a2540` | ✅ Se queda + alias `--ink` | **BUG actual:** `--ink`, `--line` y `--slate` se usan 8 veces en el código pero NUNCA se definieron — los bordes con `var(--line)` caen a `currentColor` (azul oscuro). Este bloque lo corrige. |
| `--border:rgba(10,37,64,.10)` | ✅ Bajado a `.08` y unificado con `--line` | Bordes más finos = más lujo. |
| Verdes sueltos #0a7a55, #075e41, #10b981, #16a34a | ❌ | Se mapean a `--pos` / `--pos-text` / `--pos-bg`. |
| Rojos sueltos #c0314a, #ef476f, #f43f5e, #ffb4c0 | ❌ | Se mapean a `--neg` / `--neg-text` / `--neg-bg`. |

### 2.3 Reglas de uso de rojo/verde (regla "solo dinero")

- Verde y rojo **solo** pueden tocar: montos, deltas ("▲ $2,300 vs mes anterior"), la palabra ganancia/pérdida y chips de tendencia.
- **Prohibido**: barras de gráficas decorativas en rojo, bordes de tarjetas KPI en rojo/amarillo "de semáforo" (`.kpi.red`, `.kpi.yellow` se eliminan), textos de error de formulario en `--neg` (usan `--warn`).
- **Corregir bug semántico actual:** `.kpi-val.c-green` hoy pinta MORADO (`var(--p)`). Un KPI "en verde" debe usar `--pos`. El morado nunca representa un estado de salud financiera.
- Un ingreso en una lista: monto en `--pos-text` con prefijo `+`. Un egreso: monto en `--ink` (¡no rojo!) — en una lista donde el 90% son egresos, pintar todo de rojo crea alarma permanente y el rojo pierde significado (patrón Mercury: los egresos son neutros, los ingresos verdes, el rojo se reserva para totales negativos y alertas).

### 2.4 Los 6 colores de acento de los grupos: SE NEUTRALIZAN

**Decisión: eliminar la codificación por color de los grupos (Negocios/Comida/Hogar/Personal/Finanzas/Otros).**

Fundamento:
1. **Dos colisiones semánticas graves hoy:** Negocios usa el morado de marca (#635bff → "parece clickeable") y Finanzas usa el verde de dinero (#0e9f6e → "parece ingreso/positivo"). Cualquier reasignación de 6 matices distintos vuelve a chocar con los 3 colores reservados (morado, verde, rojo).
2. **El usuario no memoriza 6 matices.** Un empresario no técnico identifica el grupo por el **icono + la etiqueta**, no por el rosa vs el teal. La codificación por color solo funciona con ≤3 categorías estables.
3. **Es el patrón Mercury/Linear:** interfaz monocromática donde el único color es significado. Es lo que hace que estos productos se vean "caros".

Implementación: se eliminan las reglas `[data-g="..."]{--ga:...}` (líneas ~400-405). Todas las tarjetas de grupo usan:
- Chip de icono: fondo `--bg4`, icono en `--slate`, 28×28px, radio `--r-sm`.
- Medidor: track `--bg4`, relleno `--ink` (un solo color plano).
- La barra superior de 2px en hover (`::after`) se elimina.

Los iconos por grupo (todos Lucide, sección 3): Negocios→`building-2`, Comida→`utensils`, Hogar→`home`, Personal→`user`, Finanzas→`landmark`, Otros→`box`.

### 2.5 Paleta de la gráfica de barras (erChart)

Se elimina el arcoíris de 11 colores hardcodeado en `renderERChart`. Una gráfica de "egresos por categoría" compara magnitudes de LA MISMA cosa → un solo matiz con opacidad decreciente:

```js
const colors = sorted.map((_, i) => `rgba(10,37,64,${Math.max(.25, .9 - i * .07)})`);
```

(Tinta #0a2540 del 90% al 25%. La barra más grande es la más oscura. Sin leyenda de colores que memorizar.)
Ticks de ejes: `#697386` (eje X) y `#425466` (eje Y) — los actuales `#8a9bb5`/`#c9d6e8` son ilegibles sobre blanco.

---

## 3. ICONOGRAFÍA — Lucide, SVG inline

**Set elegido: Lucide** ([lucide.dev](https://lucide.dev)). Fundamento:
- **Licencia ISC** (uso comercial libre, sin atribución obligatoria).
- **Geometría única y estricta:** 24×24, stroke 2, terminaciones redondeadas → todos los iconos pesan visualmente lo mismo (Phosphor con 6 pesos invita a inconsistencia; Heroicons solo tiene 292 iconos y mezcla outline/solid).
- **Cero dependencias:** cada icono es un `<svg>` que se pega en el HTML y hereda color con `currentColor` — encaja exacto con el stack vanilla y con Hostinger (nada que instalar ni CDN que pueda caerse).
- Es el estándar de facto de los dashboards tipo Stripe/Linear (nació como fork mantenido de Feather, +1,500 iconos).

### 3.1 Cómo usarlos (patrón único)

Envoltura estándar — se define UNA función JS y una clase CSS:

```html
<style>
.ic{width:16px;height:16px;flex-shrink:0;vertical-align:-2px}
.ic-20{width:20px;height:20px}
.ic-24{width:24px;height:24px}
</style>
```

```js
// Helper: icon('save')  →  string SVG listo para innerHTML/template literals
const ICONS = { /* nombre: contenido interno del svg (paths) — tabla 3.2 */ };
function icon(name, cls = 'ic') {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}
```

Tamaños permitidos: **16px** (dentro de texto, botones, filas), **20px** (nav del sidebar, headers de tarjeta), **24px** (estados vacíos, hero). Ningún otro. El icono SIEMPRE hereda el color del texto que acompaña (`currentColor`); nunca se le asigna color propio salvo dentro de un chip.

### 3.2 Los iconos (contenido interno; pegarlo en `ICONS` o directo en un `<svg>` con los atributos de arriba)

```js
const ICONS = {
  // ── Reemplazos directos de emojis ──────────────────────────────
  calendario:   '<rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>',                                                        // 📅 📆
  documento:    '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',                                                    // 📄 📑 (estado de cuenta)
  guardar:      '<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/>',                   // 💾
  engrane:      '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>', // ⚙️
  negocios:     '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>', // 🏢
  comida:       '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',                                                                                          // 🍽
  hogar:        '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',                                                                                                                      // 🏠 🛒(grupo Hogar)
  persona:      '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',                                                                                                                                       // 👤
  finanzas:     '<line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/>', // 🏦 (grupo Finanzas / Cuentas)
  moneda:       '<circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/>',                                                                                                                   // 💰 💵
  otros:        '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',                                     // 📦 ⬜ (grupo Otros)
  subir:        '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',                                                                                              // 📤 📁 (dropzone)
  grafica:      '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',                                                                                                                           // 📊
  tendencia:    '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',                                                                                                                                      // 📈 (Reportes)
  editar:       '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',                                                                                                                                          // ✏️
  eliminar:     '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',                     // 🗑
  campana:      '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',                                                                                                                            // 🔔
  salir:        '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',                                                                                              // 🚪 cerrar sesión
  atras:        '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',                                                                                                                                                                              // ←
  check:        '<path d="M20 6 9 17l-5-5"/>',                                                                                                                                                                                                 // ✓ ✅
  mas:          '<path d="M5 12h14"/><path d="M12 5v14"/>',                                                                                                                                                                                    // ➕ ＋
  buscar:       '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',                                                                                                                                                                   // 🔍
  // ── Complementarios (también aparecen en el dashboard) ─────────
  cerrar:       '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',                                                                                                                                                                                // ✕
  alerta:       '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',                                                                                              // ⚠️
  nova:         '<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>',                                            // 🤖 ✨ ✦ (NOVA)
  tarjeta:      '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>',                                                                                                                                      // 💳 (Deudas)
  recibo:       '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17V7"/>',                                                                 // 🧾 (SAT/Fiscal)
  rayo:         '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',                                                                                                                                                                  // ⚡ (One-Minute Check)
  arriba:       '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',                                                                                                                                                                                // ▲ delta positivo (flecha arriba-derecha)
  abajo:        '<path d="m7 7 10 10"/><path d="M17 7v10H7"/>'                                                                                                                                                                                 // ▼ delta negativo (flecha abajo-derecha)
};
```

Mapa de sustitución rápida en el sidebar: ⚡→`rayo`, 📊→`grafica`, 📈→`tendencia`, 🏦→`finanzas`, 💰→`moneda`, 📅/📆→`calendario`, 📄→`documento`, 💳→`tarjeta`, 🧾→`recibo`, 🧠→`nova`, 🤝→`persona`, ⚙️→`engrane`. El `<span class="ico">📄</span>` del nav se reemplaza por `icon('documento','ic ic-20')` (o el SVG pegado directo).

---

## 4. TIPOGRAFÍA — escala única (Inter)

`<link>` de fuentes queda: `family=Inter:wght@400;500;600;700`.
Base global: `html{font-size:16px}` · `body{font-feature-settings:'cv11'}` (opcional: mejora la "a" de Inter).

| Rol | Token | Tamaño | Peso | Extras |
|---|---|---|---|---|
| Título de página | `.t-page` | **1.25rem** (20px) | 700 | `letter-spacing:-.02em` |
| Subtítulo de página | `.t-sub` | **.875rem** (14px) | 400 | color `--muted`, `line-height:1.5` |
| Título de tarjeta | `.t-card` | **.875rem** (14px) | 600 | color `--ink` |
| Caption / label | `.t-cap` | **.75rem** (12px) | 600 | UPPERCASE, `letter-spacing:.05em`, color `--muted` |
| **Monto héroe** (1 por pantalla) | `.t-hero` | **2.5rem** (40px) | 700 | `letter-spacing:-.03em`, `line-height:1.05`, `tabular-nums` |
| Monto secundario (KPIs) | `.t-num` | **1.25rem** (20px) | 700 | `letter-spacing:-.01em`, `tabular-nums` |
| Monto en fila/lista | `.t-num-sm` | **.875rem** (14px) | 600 | `tabular-nums` |
| Cuerpo | `.t-body` | **.875rem** (14px) | 400 | `line-height:1.55`, color `--slate` |
| Meta / notas al pie | `.t-meta` | **.75rem** (12px) | 400 | color `--muted` |

Reglas:
- **Solo estos 5 tamaños existen**: .75 / .875 / 1.25 / 2.5 rem (+1rem para casos de cuerpo destacado). Hoy hay más de 20 tamaños arbitrarios (.6, .62, .64, .66, .67, .68, .69, .7, .72, .74…): todos se redondean al más cercano de la escala. **Nada por debajo de .75rem** — 12px es el mínimo legible para un usuario de 45+ años.
- Todo monto lleva `font-variant-numeric:tabular-nums` sin excepción (los dígitos se alinean en columnas).
- El `ini-big` actual (3rem/800) baja a `.t-hero` (2.5rem/700): más contenido visible sin perder jerarquía, porque ya nada compite con él.

```css
.t-page{font-size:1.25rem;font-weight:700;letter-spacing:-.02em;color:var(--ink)}
.t-sub{font-size:.875rem;color:var(--muted);line-height:1.5}
.t-card{font-size:.875rem;font-weight:600;color:var(--ink)}
.t-cap{font-size:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}
.t-hero{font-size:2.5rem;font-weight:700;letter-spacing:-.03em;line-height:1.05;font-variant-numeric:tabular-nums}
.t-num{font-size:1.25rem;font-weight:700;letter-spacing:-.01em;font-variant-numeric:tabular-nums}
.t-num-sm{font-size:.875rem;font-weight:600;font-variant-numeric:tabular-nums}
.t-body{font-size:.875rem;line-height:1.55;color:var(--slate)}
.t-meta{font-size:.75rem;color:var(--muted)}
```

---

## 5. ESPACIADO Y COMPONENTES

### 5.1 Escala de espaciado (base 4px — únicos valores permitidos)

`4 · 8 · 12 · 16 · 20 · 24 · 32 · 48` px (en rem: .25 · .5 · .75 · 1 · 1.25 · 1.5 · 2 · 3).
Gap estándar entre tarjetas: **16px**. Padding de página: **24px 32px**. Separación entre secciones de página: **24px**.

### 5.2 Radios — solo 3 + pill

| Token | Valor | Uso |
|---|---|---|
| `--r-sm: 8px` | inputs, botones, selects, chips de icono | |
| `--r-md: 12px` | tarjetas estándar, banners, filas de lista | |
| `--r-lg: 16px` | tarjeta héroe, modales, dropzone | |
| `999px` | SOLO chips de tendencia y badges | |

Hoy conviven 4, 6, 8, 9, 10, 12, 13, 14, 16, 18px — todos se mapean al más cercano de estos 3.

### 5.3 Sombras — exactamente 2 niveles

```css
--shadow-1: 0 1px 2px rgba(10,37,64,.06);        /* toda tarjeta en reposo */
--shadow-2: 0 4px 16px -4px rgba(10,37,64,.12);  /* hover de tarjeta clickeable, modales, dropdowns */
```
Se eliminan todas las sombras compuestas actuales (`0 12px 28px -14px…`, `0 16px 32px -14px…`, glows de semáforo `box-shadow:0 0 10px var(--ok)`). El hover con `transform:translateY(-2px)` SOLO se permite en tarjetas que abren algo al hacer clic; una tarjeta informativa no se mueve.

### 5.4 Tarjeta estándar (componente base)

```css
.card{background:var(--bg2);border:1px solid var(--line);border-radius:var(--r-md);
  padding:20px;box-shadow:var(--shadow-1)}
.card--hero{border-radius:var(--r-lg);padding:24px}
```
Padding de tarjeta: **20px** siempre (24px la héroe). Se eliminan los paddings actuales de 1.1, 1.15, 1.25, 1.35, 1.5×1.6 rem.

### 5.5 Botones

```css
.btn{font:600 .875rem/1 'Inter';padding:10px 16px;border-radius:var(--r-sm);border:1px solid transparent;
  cursor:pointer;display:inline-flex;align-items:center;gap:8px;transition:background .15s,border-color .15s}
.btn-primary{background:var(--p);color:#fff}
.btn-primary:hover{background:var(--p-hover)}          /* SIN translateY */
.btn-ghost{background:var(--bg2);color:var(--ink);border-color:var(--line)}
.btn-ghost:hover{border-color:var(--muted)}            /* el ghost NO se pinta de morado en hover */
.btn-danger{background:var(--bg2);color:var(--neg-text);border-color:var(--line)}  /* eliminar */
```
Solo existen estos 3. `tb-btn/tb-primary/tb-ghost`, `dl-btn`, `ecta`, `ini-pill` se migran a estas clases (los selects tipo píldora del filtro de mes conservan `border-radius:999px` como excepción de "chip").

---

## 6. REDISEÑO DE LAS 2 PÁGINAS PRIORITARIAS

### 6a. One-Minute Check (`#page-overview`, `renderInicioBody`)

Renombrar en sidebar: "One-Minute Check" → **"Resumen"** (anglicismo fuera; el icono `rayo` puede quedarse).

| Elemento | Hoy | Debe verse |
|---|---|---|
| **Saludo** | "Hola 👋" 1.5rem/800 + emoji | `Hola, {nombre}` en `.t-page` (1.25rem/700), sin emoji. Subtítulo `.t-sub`: "Así va tu negocio en {mes}". |
| **Filtros mes/banco** | `.ini-pill` con `var(--ink)` (¡variable indefinida!) | Mismas píldoras pero con tokens reales: `border:1px solid var(--line); color:var(--ink); font-size:.875rem`. |
| **Botón "＋ Subir estado"** | Carácter fullwidth ＋ | `icon('mas') + "Subir estado"` con `.btn-primary`. |
| **Tarjeta héroe (utilidad)** | `.ini-big` 3rem/800 verde/rojo, chip de tendencia, sparkline, fila Entró/Salió | Se conserva la estructura (es correcta). Cambios: monto en `.t-hero` (2.5rem/700) en `--pos` o `--neg` (único elemento gigante de la página); label "UTILIDAD DE JUNIO" en `.t-cap`; chip de tendencia con `icon('arriba'/'abajo')` en vez de ▲▼, fondo `--pos-bg`/`--neg-bg`, texto `--pos-text`/`--neg-text`; "Entró" en `--pos-text`, "Salió" en `--ink` (NO rojo — es un dato, no una alarma), "Movimientos" en `--ink`. Sombra: `--shadow-1` (quitar la doble sombra actual). Radio `--r-lg`, padding 24px. |
| **Tarjeta "Entró vs salió"** | 2 barras con gradientes morado y rosa | Barras planas: Entró `--pos`, Salió `#94a3b8` (gris — el egreso no es "malo", es un hecho). Sin gradientes. Ancho 48px, radio 6px 6px 0 0. Labels `.t-meta`, montos `.t-num-sm`. |
| **4 KPIs** (Movimientos / Mayor gasto / Margen / Por clasificar) | 1.45rem/800, tamaños mixtos | Valores en `.t-num` (1.25rem/700), labels `.t-cap`, nota `.t-meta`. "Por clasificar" ≥30% se pinta `--warn` (advertencia real, no `--neg` — no es dinero perdido). Tarjetas `.card` padding 20px. |
| **Banner NOVA** | Gradiente lila, chip gradiente con "✦", tag morado 800 | Fondo plano `--bg3` (o blanco con borde `--line`), SIN gradiente. Chip 32×32 `--p-soft` con `icon('nova')` en `--p` (NOVA es producto/acción → morado permitido). Tag "NOVA" en `.t-cap` color `--p`. Texto en `.t-body`. Radio `--r-md`. |
| **Tarjetas de grupo** (`_grpCardsHTML`) | Emoji por grupo, 6 acentos de color, medidor del color del grupo, hover con barra superior | Ver sección 2.4: chip 28×28 `--bg4` + icono Lucide en `--slate`; nombre `.t-cap`; monto `.t-num-sm` (.875rem/600 — hoy 1.18rem/800 compite con los KPIs); medidor track `--bg4` / relleno `--ink` alto 4px; "% de tus egresos" en `.t-meta`. Sin hover flotante (no navegan a nada). Botón "⚙️ Organizar categorías" → `icon('engrane')+"Organizar categorías"` `.btn-ghost`. |
| **Desglose "A dónde se fue tu dinero"** | Barras con gradiente morado→lila | Relleno plano `--ink`. Nombre `.t-body` (color `--ink`), monto `.t-num-sm`, % `.t-meta`. Track 8px `--bg4`. |
| **CTA final "📈 Ver reporte completo"** | Emoji en botón primario | `icon('tendencia')+"Ver reporte completo"` `.btn-primary`; "Ver movimientos" `.btn-ghost`. |
| **Estado vacío** | Emoji 📄 2.2rem | `icon('documento','ic ic-24')` en `--muted` dentro de círculo 48px `--bg4`; título `.t-card`; texto `.t-body`; CTA `.btn-primary`. |
| **"🕐 Últimas Transacciones"** | Emoji en título | `.t-card` "Últimas transacciones" (sin emoji, minúscula tras la inicial). Montos: ingresos `+$1,234` en `--pos-text`, egresos `−$1,234` en `--ink`. |

### 6b. Subir Estado (`#page-estados`) + análisis (`estadosStep3`)

| Elemento | Hoy | Debe verse |
|---|---|---|
| **Título de página** | "📄 Subir Estado de Cuenta" + sub técnico ("la IA extrae y categoriza…") | `.t-page` "Subir estado de cuenta" sin emoji. Sub `.t-sub`: "Sube el PDF de tu banco y en un minuto tendrás tus números listos." |
| **Pasos 1-2-3** | Dots 28px con líneas, labels .68rem | Se conserva. Dots: activo `--p`, hecho `--ink` con `icon('check')` blanco (no verde — el verde es dinero), pendiente `--bg3`+borde. Labels suben a `.t-meta` (.75rem). |
| **Dropzone** | Borde punteado 2px, emoji 📁 3rem, fondo `--bg3` | Borde `1.5px dashed var(--line)`, radio `--r-lg`, padding 48px 24px. `icon('subir','ic ic-24')` en `--muted` dentro de círculo 48px fondo `--bg4`. Título `.t-card` "Arrastra tu estado de cuenta aquí". Sub `.t-meta` "o da clic para buscarlo · PDF o CSV · hasta 10 MB". Hover/drag: borde `--p`, fondo `--p-soft`. **BUG de copy: el texto dice "máximo 5MB" pero el código valida 10MB (`applyEstadoFile`) — unificar en 10 MB.** |
| **Chip de archivo + CTA** | "📄 archivo.pdf" y botón "✨ Analizar con IA" | Chip: `icon('documento')` + nombre + peso en `.t-num-sm`, fondo `--bg3`, radio `--r-sm`. CTA principal: **"Analizar estado de cuenta"** `.btn-primary` (sin ✨ ni "IA" — al usuario le importa el resultado, no la tecnología). Secundario "Cambiar archivo" `.btn-ghost`. |
| **Paso 2 procesando** | Spinner + "La IA está analizando…" | Se conserva el spinner (color `--p`). Título `.t-card` "Leyendo tu estado de cuenta…". Msg `.t-meta` "Esto tarda de 15 a 60 segundos. No cierres la ventana." |
| **Lista "📑 Estados guardados"** | Emoji título; filas con 📄, botón "📊 Ver análisis" primario por fila, 🗑 | Título `.t-card` "Estados guardados". Fila: `.card` padding 12px 16px, radio `--r-md`; `icon('documento','ic ic-20')` en chip 32px `--bg4`; nombre `.t-num-sm`; meta `.t-meta`. Acciones: "Ver análisis" `.btn-ghost` (NO primario — el primario de esta pantalla es subir; un morado por fila mata la jerarquía), "Movimientos" `.btn-ghost`, eliminar = botón icono `icon('eliminar')` `.btn-danger` sin texto con `title="Eliminar"`. |
| **Header del análisis** | "📊 {banco}" + input nombre + "⚙️ Categorías / ← Subir otro / 💾 Guardar" | Título `.t-page` "{Banco} · Resultados" sin emoji. Periodo `.t-sub`. Botones: `icon('engrane')+"Categorías"` ghost, `icon('atras')+"Subir otro"` ghost, `icon('guardar')+"Guardar {n} movimientos"` primario. |
| **Banner de conciliación** | Fondo lila con 🧮, texto denso con la ecuación | Fondo `--bg3`, borde `--line`, radio `--r-md`, `icon('check')` en `--muted`. Texto `.t-body`: ver microcopy #6. Banner duplicados: `--warn-bg`/`--warn-border` con `icon('alerta')` en `--warn`. Banner "ya guardado": `--pos-bg` con `icon('check')` en `--pos-text`. |
| **Tarjetas de grupo** (`erGroupStrip`) | Idéntico a overview | Misma especificación de 6a (neutralizadas, iconos Lucide). Un solo componente compartido. |
| **4 métricas** (`er-metrics`) | 1.45rem/900; "Ingresos" verde, "Egresos" rojo permanente | Labels `.t-cap`: "Entró" / "Salió" / "Te quedó" / "Margen". Valores `.t-num` (1.25rem/700): Entró en `--pos`; **Salió en `--ink`** (no rojo: gastar no es un error); "Te quedó" en `--pos` o `--neg` según signo, con signo `−` explícito; Margen en `--ink` (y `--neg` solo si es negativo). |
| **Gráfica de barras** | 11 colores arcoíris, ticks #c9d6e8 casi invisibles | Monocromática en tinta con opacidad decreciente (sección 2.5). Ticks legibles. |
| **Desglose por categoría** | Filas .72rem con 📅 y botón ✏️ de .6rem | Categoría `.t-num-sm` + total; filas internas: descripción `.t-body` truncada, fecha `.t-meta` con `icon('calendario')` 12px opcional (o sin icono), monto `.t-num-sm`, editar = `icon('editar')` botón icono 24×24. **Nada de texto bajo .75rem.** El panel de "Mover a categoría" usa fondo `--bg3` (hoy usa `rgba(0,0,0,.25)` — negro translúcido sobre tarjeta blanca, error evidente). Botón "✓ Guardar" → `icon('check')+"Aplicar"`. |
| **NOVA insights** | "🤖 NOVA IA te dice", fondo gradiente lila | Igual que banner NOVA de 6a: fondo plano, chip `--p-soft` + `icon('nova')`, título `.t-cap` "NOVA · LO IMPORTANTE DE ESTE ESTADO". |
| **Transacciones editables** | Toggle "Ver y editar transacciones ▼"; selects con "💰 Ingreso / 💸 Egreso" | Toggle `.t-card` + chevron SVG (rotar 180° al abrir con `transition:transform .15s`). Header de columnas `.t-cap`. Filas: inputs `.t-num-sm`/`.t-body`, alto 36px, fondo `--bg3` al foco. Select de tipo SIN emojis: "Ingreso / Egreso / Transferencia". Botón ✕ por fila → `icon('cerrar')` 16px en `--muted`, hover `--neg-text`. |

---

## 7. MICROCOPY — reemplazos exactos (español mexicano, cero jerga)

| # | Hoy (confunde) | Reemplazo |
|---|---|---|
| 1 | "One-Minute Check" (sidebar y página) | **"Resumen"** — un empresario no técnico no debe traducir el nombre del menú. |
| 2 | "Tasa de ahorro" (métrica del análisis) | **"Margen"** con nota `.t-meta`: "De cada $100 que entraron, te quedaron ${X}". "Tasa de ahorro" es de finanzas personales, no de negocio. |
| 3 | "Flujo neto" | **"Te quedó"** (+ signo −/+ en el monto). "Flujo neto" es jerga contable. |
| 4 | "Ingresos totales" / "Egresos totales" | **"Entró" / "Salió"** — consistente con la página Resumen, que ya usa estas palabras. Un mismo concepto = una misma palabra en toda la app. |
| 5 | "✨ Analizar con IA" | **"Analizar estado de cuenta"** — el beneficio, no la tecnología. |
| 6 | "🧮 Revisa antes de guardar: 47 movimientos · Ingresos $X − Egresos $Y = Neto $Z. Confirma que el neto cuadre con el saldo de tu estado de cuenta." | **"Encontramos 47 movimientos: entró $X y salió $Y. Compara contra tu estado de cuenta: si los totales coinciden, dale Guardar."** — instrucción en dos pasos, sin ecuación. |
| 7 | "📊 Estado de Resultados" (título del paso 3) | **"{Banco} · Resultados de tu periodo"** — "Estado de Resultados" es un término contable que aquí ni siquiera es exacto. |
| 8 | "Por clasificar / en 'Otros'" (KPI) | **"Sin clasificar"** con nota: "movimientos que NOVA no supo etiquetar. Clasifícalos para que tu reporte sea exacto." |
| 9 | "La IA extrae y categoriza todas las transacciones automáticamente" | **"Sube el PDF de tu banco y en un minuto tendrás tus números listos."** |
| 10 | "¿Eliminar este estado de cuenta y sus transacciones? Esta acción no se puede deshacer." (confirm) | **"Vas a borrar este estado y sus {n} movimientos. Tus totales del mes cambiarán. ¿Continuar?"** — dice la consecuencia real, no solo la advertencia genérica. |

Reglas generales de voz: tuteo siempre; verbos en botones ("Guardar", "Subir estado", nunca "OK"); los mensajes de error dicen qué hacer después ("Revisa tu internet e intenta de nuevo" ✅ — esto ya se hace bien); ningún término contable sin traducción al lado.

---

## 8. ORDEN DE IMPLEMENTACIÓN SUGERIDO (sin romper nada)

1. **Tokens** — reemplazar bloque `:root` (arregla de paso el bug de `--ink/--line/--slate` indefinidas). Riesgo: cero.
2. **Iconos** — agregar `ICONS` + `icon()` + clases `.ic`; sustituir emojis página por página (sidebar primero: es lo más visible).
3. **Tipografía y botones** — clases `.t-*` y `.btn-*`; migrar overview y estados.
4. **Neutralizar grupos y gráfica** — quitar `[data-g]`, acentos y arcoíris del chart.
5. **Microcopy** — tabla 7.
6. Deploy a Hostinger y verificación visual con la checklist: ningún emoji visible, un solo número gigante por página, rojo solo en dinero negativo, ningún gradiente en datos, ningún texto menor a 12px.

*Fin del documento. Cualquier pantalla nueva se construye solo con estos tokens.*
