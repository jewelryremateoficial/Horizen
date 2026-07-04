# Horizen — Dirección de diseño V2: Color del dinero y fondos decorativos

**Documento definitivo. Un desarrollador debe poder implementarlo sin preguntar nada.**

Síntesis de 7 investigaciones (Stripe, PayPal, Mercury/Ramp/Capital One/Capital.com, motion, dataviz, tendencias 2025-26, auditoría del código actual).

---

## LA FILOSOFÍA EN UNA FRASE

> **El dinero es neutro por defecto. El color se gana: verde apagado solo cuando entra dinero, coral solo en chips de tendencia, rojo solo cuando algo está roto. El morado #635bff significa "haz clic aquí" y nada más.**

Es exactamente lo que hacen Stripe (montos neutros + badges tenues), PayPal (gasto = negro, nunca rojo), Mercury (salida = ink con −, entrada = verde bosque) y Ramp (cifras 100% neutras). Ninguna fintech premium pinta de rojo el gasto cotidiano: **gastar no es un error**.

---

## PARTE A — DECISIÓN DE COLOR

### A.1 Tokens definitivos (reemplazar bloque "Dinero" del `:root`, líneas 33–57 de dashboard.html)

```css
/* ═══ DINERO ═══════════════════════════════════════════════ */
/* Regla: el monto por defecto es tinta neutra. Verde SOLO en
   dinero que ENTRA. Los egresos NUNCA llevan color. */
--money-in:      #1e7a4f;   /* verde bosque desaturado (Mercury). Contraste 5.1:1 sobre blanco ✓ */
--money-in-bg:   #e6f4ec;   /* fondo de chips/badges de entrada */
--money-out:     var(--ink);/* egresos = #0a2540, siempre. El signo − hace el trabajo */

/* Chips de tendencia (▲/▼ junto a utilidad/neto — NUNCA en el número mismo) */
--trend-up:      #1e7a4f;   --trend-up-bg:   #e6f4ec;
--trend-down:    #c0492b;   --trend-down-bg: #fdeee8;  /* coral quemado, daltónico-seguro con el verde */

/* ═══ ESTADO DEL SISTEMA (toasts, alertas, errores) ════════ */
/* Separado del dinero. Aquí SÍ vive la semántica éxito/error. */
--state-ok:      #0a7a55;   --state-ok-bg:   #e9f9f1;
--state-err:     #b3093c;   --state-err-bg:  #fdecef;  --state-err-border: rgba(223,27,65,.2);
--state-warn:    #b45309;   --state-warn-bg: #fff7ed;  --state-warn-border: rgba(217,119,6,.25);

/* ═══ GRÁFICAS ═════════════════════════════════════════════ */
/* El color codifica CATEGORÍA, no bueno/malo. */
--chart-in:      rgba(99,91,255,.65);   /* ingresos = morado marca */
--chart-out:     rgba(148,163,184,.65); /* egresos = gris pizarra #94a3b8 */
--chart-line:    #635bff;               /* línea de saldo/evolución */
--chart-grid:    #e3e8ee;

/* ═══ ALIASES LEGADOS — remapear, no borrar aún ════════════ */
--pos:      var(--money-in);
--pos-text: var(--money-in);
--pos-bg:   var(--money-in-bg);
--neg:      var(--state-err);   /* solo debe quedar en alertas tras la migración */
--neg-text: var(--state-err);
--neg-bg:   var(--state-err-bg);
--warn:     var(--state-warn);
--warn-bg:  var(--state-warn-bg);
--warn-border: var(--state-warn-border);
--ok:       var(--state-ok);
--err:      var(--state-err);
```

> Nota: `--pos` cambia de #0e9f6e (esmeralda brillante) a #1e7a4f (verde bosque). Es un cambio de un solo valor que "apaga" todos los verdes de la app de golpe.

### A.2 Regla exacta por caso

| # | Caso | Tratamiento definitivo |
|---|------|------------------------|
| 1 | **Utilidad POSITIVA** (hero Resumen, KPI Reportes, neto mensual, neto del día) | Número en `--ink`, tamaño grande. La señal de "va bien" vive en el **chip de tendencia**: `▲ +12% vs mes anterior` con texto `--trend-up` sobre `--trend-up-bg`. El número NUNCA verde. |
| 2 | **Utilidad NEGATIVA** | Número en `--ink` con signo menos real **− (U+2212, nunca guion)**. Chip `▼ −8%` en `--trend-down` sobre `--trend-down-bg`. El número NUNCA rojo. Pérdida ≠ error del sistema. |
| 3 | **Ingresos en tablas** (.amt-in) | Monto en `--money-in` CON prefijo `+` explícito: `+$8,200.00`. Doble codificación (signo + color) para daltónicos y usuarios no técnicos. Solo el monto — jamás la fila ni fondos. |
| 4 | **Egresos en tablas** (.amt-out) | Monto en `--ink` con `−$12,500.00`. Ya está así — es la referencia; extender este criterio a TODA la app. |
| 5 | **Barras de gráficas** (Chart.js) | Ingresos = `--chart-in` (morado). Egresos = `--chart-out` (gris pizarra). Línea de saldo = `--chart-line` con área degradada a transparente. Cero verde/rojo en gráficas. |
| 6 | **KPIs Entró/Salió/Utilidad** (Reportes, hero, calendario totales) | "Entró" en `--money-in`. "Salió" en `--ink` (hoy Reportes lo pinta rojo fijo — corregir). "Utilidad" en `--ink` + chip de tendencia (regla 1/2). |
| 7 | **Toasts de éxito** | SÍ conservan semántica (es estado del sistema, no dinero): fondo **blanco**, sombra `--shadow-2`, borde izquierdo 3px `--state-ok`, icono check verde, texto `--ink`. |
| 8 | **Toasts de error** | Igual pero borde/icono `--state-err`. Info: borde/icono `#635bff`. |
| 9 | **Alertas críticas reales** (caja libre negativa, runway crítico, pago vencido, corte urgente, formError de login) | Se quedan como están: `--state-err`/`--state-warn` en intensidades suaves. Aquí el rojo cumple su función. NO TOCAR. |
| 10 | **Saldo de cuenta NEGATIVO** (sobregiro) | Mantener rojo `--state-err`: es excepción-alarma, no dinero cotidiano. |
| 11 | **Deuda total, gastos fijos, IVA pagado** | Neutro `--ink`. Deber renta o pagar IVA no es una emergencia diaria. |
| 12 | **Botón eliminar** | Rojo solo en hover (`--state-err`), como hoy. Correcto. |

### A.3 Tipografía del dinero (obligatorio, gratis)

```css
.money, .amt-in, .amt-out, .ini-big, .rep-kpi .v {
  font-variant-numeric: tabular-nums lining-nums;
  letter-spacing: -0.02em;
}
td.money { text-align: right; }
.centavos { font-size: .62em; color: var(--muted); vertical-align: .28em; font-weight: 500; }
```
Uso: `$52,340<span class="centavos">.18</span>`. Signo menos siempre `−` (U+2212). Dos decimales siempre.

---

## PARTE B — FONDOS DECORATIVOS

### B.1 Decisión

**Regla Stripe/Capital.com: el movimiento vive en el marco (marketing/login), nunca sobre datos.** El propio Stripe no tiene un solo píxel animado dentro de su Dashboard.

| Zona | Fondo | ¿Animado? |
|------|-------|-----------|
| index.html (hero + cta-band) | meshShift existente (ya está bien) | SÍ — solo falta reduced-motion |
| login.html panel derecho | meshShift existente | SÍ — solo falta reduced-motion |
| **Hero del Resumen (.ini-hero)** | **Aurora ESTÁTICA** (radial-gradients morados, sin blur, sin animación) | **NO** |
| Header del Plan Financiero y .rf-hero Referidos | Misma aurora estática | NO |
| Header del análisis de estado de cuenta | **NADA** — es zona de datos densos | NO |
| Tablas, gráficas, tarjetas con montos, calendario | **NADA. Blanco quieto. Prohibido.** | NO |

**No usamos canvas WebGL (whatamesh) en esta fase.** El meshShift CSS ya existente da el 90% del efecto con 0 KB extra y cero riesgo en los Android/laptops modestos de los usuarios. Si algún día se quiere el efecto Stripe completo, va solo en login y con `gradient.pause()` cableado a reduced-motion.

### B.2 Código listo para pegar

**1) Aurora estática para el hero del Resumen (dashboard.html — costo de render ~cero):**

```css
.ini-hero {
  position: relative;
  background-color: #ffffff;
  background-image:
    radial-gradient(at top left,     rgba(99,91,255,.10),  transparent 55%),
    radial-gradient(at top right,    rgba(139,133,255,.07), transparent 55%),
    radial-gradient(at bottom right, rgba(110,195,244,.06), transparent 60%);
}
```
Sin animación, sin blur(), texto oscuro encima sin cambios. Igual para la tarjeta Diagnóstico (L854, ya trae gradiente estático — solo unificar valores) y `.rf-hero` (L690).

**2) Guard de accesibilidad para index.html y login.html (añadir a ambos):**

```css
@media (prefers-reduced-motion: reduce) {
  .cta-band::before, .auth-right::before, .gradient-hero {
    animation: none !important;
    background-size: 100% 100%;
  }
}
```

**3) Opcional (solo si tras probar se quiere "vida" en el hero del Resumen) — versión animada permitida, lentísima:**

```css
@media (prefers-reduced-motion: no-preference) {
  .ini-hero { background-size: 160% 160%; animation: auroraShift 45s ease-in-out infinite; }
  @keyframes auroraShift {
    0%,100% { background-position: 0% 0%; }
    50%     { background-position: 100% 60%; }
  }
}
```
Ciclo de 45s y saturación <10%: se percibe como luz, no como movimiento. Si distrae en un Android de gama media, se borra el bloque y queda la versión estática.

**4) Grain sutil global (opcional, último):** generar ruido en fffuel.co/nnnoise, exportar PNG diminuto, y en el `body`: `background-image: url(assets/grain.png); opacity vía capa ::before a 0.03`. NUNCA filtro SVG en vivo (CPU). Solo sobre `--bg`, jamás sobre tarjetas.

---

## PARTE C — TOQUES PREMIUM (tema claro, sin ruido)

1. **Hairlines de baja alfa** — ya existe `--line: rgba(10,37,64,.08)`. Auditar que NINGUNA tarjeta use grises sólidos (#e0e0e0 etc.); todo borde pasa por `--line`.
2. **Sombras azuladas 2 niveles** — ya existen `--shadow-1/--shadow-2` teñidas de `rgba(10,37,64,…)`. Regla dura: tarjetas = borde + shadow-1; SOLO dropdowns/modales/toasts usan shadow-2. Nunca sombras en botones ni nav.
3. **Cifras tabulares + centavos de-enfatizados** (código en A.3) — el detalle que más distingue un dashboard financiero serio, cuesta 5 líneas de CSS.
4. **Microestados** — `transition: 150ms cubic-bezier(.4,0,.2,1)` en botones/tarjetas; hover de tarjeta `translateY(-1px)` + shadow-2 suave; focus ring `outline: 2px solid #635bff; outline-offset: 2px`.
5. **Iconos en vez de emojis semáforo** — sustituir 🔴🟡✅🚨 (calcFinPlan L2562–2646 y otros) por los iconos Lucide ya disponibles (`icon('alerta')`, `icon('check')`) que heredan `currentColor` y respetan la paleta.

**Prohibido (leería "developer tool", no "mi negocio está sano"):** fondos oscuros con glows neón, glassmorphism, grids blueprint, fuentes mono display, bento asimétrico, cualquier animación detrás de cifras.

---

## PARTE D — PLAN DE IMPLEMENTACIÓN

Todo es frontend: `dashboard.html` + `assets/app.js` + 2 bloques en `index.html`/`login.html`. Sin SQL, sin Edge Functions. Deploy: Hostinger.

### PASO 1 — Tokens (dashboard.html `:root` L33–57)
1.1 Reemplazar bloque "Dinero" por los tokens de A.1 (incluye remapeo de aliases `--pos/--neg/--ok/--err`).
1.2 Eliminar hex hardcodeados que esquivan tokens: `#10b981`/`#22c55e` (L205, L1719, app.js), `rgba(16,185,129,…)` (L205/223/243/274/358), `rgba(244,63,94,…)` (L165/215/221/244/333/358/3141), `#0e9f6e` directo (L4174), `#f43f5e` (app.js) → sustituir por la variable que corresponda según A.2.

### PASO 2 — Dinero neutro (mapa auditoría → nuevo tratamiento)
| Línea(s) | Hoy | Cambio |
|---|---|---|
| L198 `.amt-in` | verde brillante | `color:var(--money-in)` + prefijo `+` en render (L1842/L1857) |
| L4270 utilidad hero `.ini-big` | verde/rojo según signo | SIEMPRE `var(--ink)`; signo − real; la semántica queda en el chip |
| L558–559 `.ini-trend.up/.down` + L4257–4259 | pos/neg | `--trend-up(-bg)` / `--trend-down(-bg)` + flechas ▲▼ |
| L564 `.ini-flow .v.in` | verde | `var(--money-in)` (apagado por el token nuevo) |
| L572 `.ini-bars .in` | verde | `var(--chart-in)` morado (la barra "Salió" ya es gris — queda) |
| L4285 frase "ganó/gastaste" | pos/neg-text | ganó → `--money-in`; gastó → `--ink` |
| L636 + L4049–4051 KPIs Reportes | Salió en rojo fijo | Entró `--money-in`, Salió `--ink`, Utilidad `--ink`+chip |
| L395 + L3377/3380 tarjetas análisis | pos/neg | mismo criterio que Reportes |
| L1626 heroUtil, L1784 neto, L3030/3053/3110 calendario netos | verde/rojo | `--ink` + signo; en calendario un punto 6px `--money-in` solo si el día fue positivo |
| L358–363 celdas calendario teñidas | verde/rojo en masa | quitar tinte de celda completa; dejar solo el punto del neto |
| L3071–3095 modal día: "↓ Egresos" y montos | rojo | `--ink` (la flecha ya comunica) |
| L3141 Chart.js egresos | `rgba(244,63,94,.65)` | `--chart-out` gris pizarra |
| L225/776/1171 deuda + L229 barra | rojo grande | `--ink`; barra en `--p` morado o gris |
| L906 gTotal gastos fijos, L1969–1971 IVA | rojo/verde | `--ink` |
| L916, L806, L2436/2464/2484, L4174 | verdes decorativos | `--ink` (máx. un acento `--money-in` por vista) |
| L981/985 calTotalIn/Out | verde/rojo | In `--money-in`, Out `--ink` |
| L2562–2646 calcFinPlan | ok/warn/err + emojis | umbrales: bien `--money-in`, atención `--state-warn`, crítico `--state-err`; emojis → iconos Lucide |
| L1719 accountColor() | verdes/rojo hardcode | paleta neutra: SAVINGS/CASH tonos de morado-gris, CREDIT_CARD `--slate` |
| L205 badge SAT, L223 corte ok, L243 tax paid, L274 sync live, L655 rep-saved, L710 rf-badge | verdes decorativos | neutro/morado: badge gris con check, rep-saved en `--p-soft` |

### PASO 3 — toast() en assets/app.js (L118–128)
Reescribir para tema claro: fondo `#ffffff`, texto `--ink`, `box-shadow: var(--shadow-2)`, `border-left: 3px solid` según tipo: `success/ok → var(--state-ok)`, `error → var(--state-err)`, `info → #635bff`. **Fix del bug:** añadir `ok` como alias de `success` (hoy 4 llamadas — L2512, 2536, 2902, 2930 — caen a `undefined`).

### PASO 4 — Fondos (código de B.2)
4.1 Aurora estática en `.ini-hero` (L554), Diagnóstico (L854), `.rf-hero` (L690).
4.2 Bloque `prefers-reduced-motion` en index.html y login.html.
4.3 (Opcional, probar en móvil primero) animación auroraShift 45s en `.ini-hero`.

### PASO 5 — Limpieza
5.1 Borrar CSS muerto: `.kpi-val.c-green/.c-yellow/.c-red` (L151–153), `.sem-light` + `@keyframes blink` (L161–165) — verificar con búsqueda que ningún JS los asigna.
5.2 Añadir A.3 (tabular-nums, centavos) y los microestados de C.4.

### QUÉ NO TOCAR
Alertas críticas (L333, L1690–1694, L221–222, L2779), saldo negativo de cuenta (L1741/1763), botón eliminar en hover, formError de login. Ahí el rojo trabaja.

### VERIFICAR (checklist)
- [ ] Ningún monto de egreso aparece en rojo en toda la app.
- [ ] Utilidad del hero en tinta con chip ▲/▼ de color.
- [ ] Toast de "guardado" se ve blanco con borde verde; toast tipo `ok` ya no sale sin color.
- [ ] Gráfica de barras: morado vs gris, sin rojo.
- [ ] Con "Reducir movimiento" activado en el sistema, index/login quedan estáticos.
- [ ] Simular daltonismo (Color Oracle): la dirección del dinero se entiende solo con los signos +/−.
- [ ] Probar dashboard en un Android de gama media antes del deploy final.
