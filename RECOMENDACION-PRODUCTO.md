# Horizen — Recomendación de producto (basada en investigación)

Investigación con fuentes sobre qué necesitan las **personas** y las **PYMEs** (México) de una
herramienta que parte de **subir el estado de cuenta**. Objetivo: definir el MVP, y qué conservar,
fusionar o quitar.

---

## 1. La promesa central (en una frase)
> **"Sube tu estado de cuenta y mira si ganas o pierdes y a dónde se va tu dinero — sin contador y sin Excel."**

Esto ataca los 3 dolores más grandes y comprobados:
- **Flujo de efectivo**: causa #1 de muerte de negocios (factor en ~82% de cierres; en México ~52 de cada 100 negocios mueren antes de 2 años). [U.S. Bank; INEGI]
- **No saber si ganas o pierdes**: 68.8% de emprendedores cita falta de planificación financiera como causa de fracaso; 21% lleva contabilidad en libretas y 18% no lleva ninguna. [UAEH; Disi Operaciones]
- **Sorpresas con el SAT**: el problema no es deber, es enterarse cuando ya hay multa. [Uplaw / SAT]

---

## 2. Qué es MUST-HAVE para el MVP (y qué no)

| Función | Nivel | Por qué |
|---|---|---|
| Subir estado de cuenta (PDF/CSV → movimientos) | **MUST** | Es la puerta de entrada de tu promesa |
| Categorización automática que **aprende** de correcciones | **MUST** | Central en todas las apps; sin esto los reportes no sirven |
| **Paso de revisión** antes de guardar (ver §4) | **MUST** | Lo que separa una app confiable de una que se abandona |
| Reporte claro: **¿gano o pierdo?** (P&L) + gasto por categoría + flujo | **MUST** | Es el resultado que prometes |
| Exportar (CSV/PDF) para el contador | **MUST** | El usuario lleva los datos a su contador |
| Alertas simples (gasto raro, duplicado, reserva fiscal) | NICE | Alto valor percibido, pero no bloquea v1 |
| Reserva fiscal (apartar % para el SAT) | NICE | Ataca el dolor fiscal sin prometer cumplimiento |
| Balance general / doble partida | LATER | Requiere mecánica contable; abruma a no-contadores |
| Conciliación bancaria formal | LATER | Compleja; no indispensable para el primer reporte |
| Facturación / CFDI / timbrado | LATER (foso MX) | Gran diferenciador, pero módulo grande y de alto riesgo |
| Multiusuario, multimoneda, inventario | LATER | Deseable, no para el primer lanzamiento |

**Regla de oro de la investigación:** el 80% de las funciones de un software casi nunca se usan
(Pendo/Standish). QuickBooks/Xero se perciben "abrumadores". **Menos es más.** Mostrar **1–3 números
claros**, no un tablero con 15 gráficas. Lenguaje llano: "lo que entró / lo que salió / lo que te queda".

---

## 3. México: qué SÍ y qué NO (para no engañar al usuario)
- **Pedir el régimen fiscal** al inicio (RESICO PF / PF actividad empresarial / Persona Moral). Cambia TODO:
  RESICO PF **no deduce** y paga 1–2.5% sobre lo cobrado; el general sí deduce. [SAT]
- **Enseñar que un movimiento bancario ≠ comprobante fiscal (CFDI).** Subir el estado **organiza** el flujo,
  pero el efecto fiscal lo da el CFDI. Un depósito sin CFDI = riesgo de "ingreso omitido". [BBVA/SAT]
- **Detectar forma de pago**: gastos > $2,000 en efectivo **no son deducibles** (gasolina en efectivo nunca). [Art. 27-III LISR]
- **Posicionar la app como "organizador y semáforo de riesgo", NO como sustituto del contador.** Mostrar
  tasas con fecha y fuente; nunca afirmar un impuesto como definitivo sin el régimen.
- **NO en el MVP:** timbrar CFDIs, presentar declaraciones/DIOT, ISR anual exacto con deducciones personales,
  acreditamiento de IVA con proporción. Demasiado complejo y riesgoso.

---

## 4. El flujo correcto de "subir estado de cuenta" (lo más importante)
Hoy te falta el paso clave: **revisión con verificación**. El flujo ideal:

1. **Subir** — PDF/CSV; detectar banco y rango de fechas; cifrado en tránsito.
2. **Procesar** — OCR + autocategorización; en segundo plano **conciliar contra el saldo de cierre**
   (¿las transacciones suman al saldo final?) y **detectar duplicados**.
3. **REVISAR (no opcional)** — pantalla donde **nada se guarda todavía**:
   - Banner: "X movimientos · la suma **cuadra / NO cuadra** con tu saldo final".
   - Filas de baja confianza resaltadas; categoría editable; "crear regla a partir de esto".
   - Duplicados marcados (emparejar / excluir).
4. **Guardar** — solo al confirmar; **aprender** de las correcciones; guardar el archivo de origen
   para no reimportar (evita duplicados).
5. **Ver reportes / exportar** — P&L por categoría; CSV/PDF para el contador.

**Mejora técnica recomendada:** que `transactions` tenga estado `pending/confirmed` y guarde el `source`
del archivo. Esto da confianza (prueba matemática de que no se perdió ni inventó nada) y evita el
problema #1 de estas apps: **duplicados**. [QuickBooks; Xero; DocuClipper]

---

## 5. Recomendación por sección del dashboard (conservar / fusionar / quitar)

| Sección actual | Recomendación | Por qué |
|---|---|---|
| **📄 Subir Estado** | **CONSERVAR y volver el centro** + añadir paso de revisión (§4) | Es el corazón de la promesa |
| **📊 Transacciones** | **CONSERVAR** (lista editable, filtro por estado) | Es la base de todo |
| **⚡ One-Minute Check** | **CONSERVAR pero SIMPLIFICAR** a 1–3 números en lenguaje llano | Menos es más; es el "inicio" |
| **🧠 Plan Financiero (NOVA)** | **CONSERVAR simple** (2–3 recomendaciones) | Diferenciador de valor |
| **🧾 SAT / Fiscal** | **CONSERVAR pero REPOSICIONAR** como semáforo + reserva fiscal (pedir régimen) | Foso MX, sin prometer cumplimiento |
| **⚙️ Configuración** | **CONSERVAR** + agregar campo **régimen fiscal** | Necesario para cualquier lógica fiscal |
| **🔔 Alertas** | **CONSERVAR simple** | Alto valor percibido |
| **💰 Ingresos** (captura manual) | **QUITAR/OCULTAR en MVP** | Redundante: el estado de cuenta ya muestra los ingresos |
| **🏦 Cuentas** (saldos manuales) | **OCULTAR o reducir** | Belvo se quitó; el dato real viene del estado de cuenta |
| **📅 Gastos Fijos** | **MOVER a Fase 2** | Útil para proyectar, pero no indispensable en v1 |
| **📆 Calendario** | **MOVER a Fase 2** | Depende de Gastos Fijos/Deudas; secundario |
| **💳 Deudas** | **REDUCIR/Fase 2** | Afecta patrimonio/runway; no crítico para el primer reporte |

**Menú propuesto para el lanzamiento (lean):**
`Inicio (1–3 números)` · `Subir Estado` · `Transacciones` · `NOVA` · `SAT / Reserva` · `Configuración`.
El resto (Cuentas, Ingresos, Gastos Fijos, Calendario, Deudas) se oculta y regresa por fases cuando
demuestre valor (divulgación progresiva, estilo Slack).

---

## 6. Principios de simplicidad (para no caer en el error de QuickBooks)
1. **Time-to-value < 10 min**: que en la primera sesión el usuario vea su panorama.
2. **Mostrar valor antes de pedir cosas pesadas**: dejar subir un estado y ver el resultado antes de fricción.
3. **Pocas opciones por pantalla** (Ley de Hick): un CTA principal, máximo ~5–7 elementos.
4. **Cero jerga contable**: "lo que te deben / lo que debes / entró / salió".
5. **Divulgación progresiva**: lo avanzado se revela cuando el usuario ya obtuvo valor.

---

## Fuentes principales
INEGI (demografía de negocios); U.S. Bank / Preferred CFO (flujo de efectivo); Konfío; UAEH; Forbes/Bind
(cobranza); SAT (RESICO, ISR, IVA, CFDI 4.0); BBVA (CFDI); Pendo & Standish Group (80% de funciones sin usar);
NerdWallet/Trustpilot (QuickBooks "abrumador"); Sacra/Monarch (cierre de Mint); Laws of UX (Hick/Miller);
CleverTap/Netcore (onboarding fintech); DocuClipper/Xero/QuickBooks (flujo de importación, revisión, duplicados).
