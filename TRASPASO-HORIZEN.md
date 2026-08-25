# TRASPASO — Horizen

> **Si eres una sesión nueva de Claude: lee este archivo completo antes de tocar nada.**
> Aquí está el estado real del proyecto, qué se descubrió, qué se decidió y qué falta.
> Última actualización: 21 de agosto de 2026.

---

## 1. Qué es Horizen

Dashboard financiero para PYMEs mexicanas. `horizen.com.mx`

**El flujo central:** el usuario sube el PDF de su estado de cuenta → una IA lo lee
y extrae los movimientos → se guardan en la tabla `transactions`. De ahí salen
Reportes, SAT/Fiscal, Estado de Resultados, alertas y los consejos de NOVA.

**Todo cuelga de esa lectura.** Un dato malo en la entrada se reparte por toda la app.

| Pieza | Qué es |
|---|---|
| Frontend | HTML + JS puro, sin framework. `dashboard.html` es un solo archivo de ~7,800 líneas |
| Backend | Supabase (Postgres + Auth + Edge Functions en Deno) |
| Hosting | Hostinger → jala del repo |
| Pagos | PayPal Subscriptions + webhook |
| IA | **Claude Haiku 4.5** en las dos Edge Functions. Decisión de Eduardo — NO cambiar sin permiso |
| Repo | `jewelryremateoficial/Horizen`, rama `main` |
| Proyecto Supabase | `upcbznfkpswtxiffgsgj` |

**Planes:** Emprende $199 · Negocio $399 · Empresa $799 (MXN/mes), 7 días de prueba.
Límites: 5 / 35 / 150 estados de cuenta al mes.

---

## 2. Cómo trabajar con Eduardo — LÉELO

Esto vale tanto como el código.

1. **Habla simple.** Nada de jerga. Si dice "no te entiendo", empieza de nuevo más
   sencillo, no expliques lo mismo con más palabras. Le sirven las analogías.
2. **No cambies NADA que no te haya pedido.** Ya pasó: se cambió el idioma de los
   botones de PayPal sin pedirlo y hubo que revertirlo. Si crees que algo conviene,
   **dilo y espera respuesta**.
3. **No quiere parches.** Textual: *"no me estés dando soluciones del momento,
   soluciones cortas o a corto plazo. Quiero soluciones reales que sirvan a largo plazo."*
4. **Verifica antes de afirmar.** Varias veces se dio un diagnóstico de memoria que
   resultó equivocado. Lee el código, corre la prueba, y **di cuando te equivocaste**.
5. **Es el dueño, no un programador.** Explícale el *por qué*, no solo el *qué*.
6. Trabaja en **dos computadoras**: en una solo marketing, en la otra el desarrollo.

---

## 3. El principio técnico central: ANALIZAR, NO LEER

Eduardo lo formuló y es la regla que manda sobre el analizador de estados de cuenta.

**El caso que lo originó:** la app reportó un cargo de `$9,720.11` cuando el PDF
decía `$720.11`. Ese renglón traía impresa la operación completa:

```
ULTRAMSG.COM   39.00 USD  TC 18.4643        + $ 720.11
```

`39.00 × 18.4643 = 720.11`. **El renglón traía su propia prueba.** 9,720.11 no es
el resultado de nada ahí. Analizarlo lo habría cazado al instante.

**La regla, en tres niveles:**

| Nivel | Se comprueba con |
|---|---|
| **El renglón** | `USD × TC = Monto` |
| **La tabla** | suma de movimientos = `Total de cargos` / `Total de abonos` impresos |
| **La portada** | adeudo anterior + cargos − abonos = saldo deudor |

> **Nunca entregar un monto que no se haya comprobado contra otra parte del mismo
> documento.** Si algo no cuadra, decirlo — no maquillarlo.

Vive escrito en `bancos/tdc-estandar-condusef.md` §0.

---

## 4. Hallazgo grande: los estados de cuenta están estandarizados por ley

Desde el **17 de octubre de 2024**, CONDUSEF obliga a **todos** los bancos y SOFOMes
de México a usar el mismo formato en estados de cuenta de **tarjeta de crédito de
persona física** (*Estado de Cuenta Universal*). Verificado contra un Santander real.

**No hacen falta 50 fichas de bancos. Una sola cubre todas las tarjetas de crédito.**

Las cuentas de **débito/nómina NO tienen estándar** — esas sí necesitan ficha por banco.

**Lo que más importa del formato:**
- Tabla `CARGOS, ABONOS Y COMPRAS REGULARES (NO A MESES)`, cuatro columnas:
  `Fecha de la operación` · `Fecha de cargo` · `Descripción del movimiento` · `Monto`
- El monto es **la última columna**. Nunca el importe en USD ni el tipo de cambio
- La fecha a usar es **`Fecha de cargo`** (la segunda), consistente en todo el estado
- **`+` = cargo = egreso. `−` = abono = ingreso.** Al revés que en débito
- Cierra con `Total de cargos` / `Total de abonos` — el ancla de verificación
- En tablas a meses el gasto del periodo es `Pago requerido`, **no** `Monto original`

⚠️ **Los PDF de Santander no tienen capa de texto.** Son puras imágenes (tiras de
~2250×31 px, generadas por el banco con `Compart MFFPDF I/O Filter`). La IA los lee
**mirando**, así que los errores de dígitos son esperables y la verificación de
totales no es opcional.

---

## 5. Qué se construyó (todo ya en `main`)

### Lectura de estados de cuenta
- `bancos/` — fichas de formato. `tdc-estandar-condusef.md` es la buena
- `supabase/functions/process-statement/formato-bancos.ts` — la versión operativa
  que se le pega al prompt de la IA
- Correcciones del lector (commit `4800ffa`): pagos a TDC como ingreso, descartar
  filas de resumen, y el monto correcto en tablas a meses

### NOVA
- Memoria real en `localStorage` (antes se perdía al recargar), 24 turnos
- Contexto con **dinero**, no solo conteos: entró/salió por mes y categoría
- Sabe los precios de los planes
- Markdown se pinta como negritas, no como asteriscos

### Precios y planes
- `assets/planes.js` — **los precios viven aquí y solo aquí**
- `pricing.html` ya **no rebota** a nadie (antes mandaba a login a quien no tenía
  sesión y al dashboard a quien ya pagaba: nadie podía ver los precios)
- Pantalla **"Mi plan"** en el dashboard: plan actual, uso del mes con barras, paquetes
- Cambio de plan automático con `revise()` de PayPal
- **Regla del cambio de plan:** sube → al instante. Baja → al terminar el ciclo
  que ya pagó (no se le quita algo comprado)
- Planes **sin prueba** para los cambios (los nuevos siempre llevan sus 7 días)
- Los IDs de PayPal **ya no se copian a mano**: se descubren por el NOMBRE del plan
  vía la función `paypal-planes`

### Reportes
- `_traerTodo()` — Supabase corta en 1000 filas; Reportes y Resumen se quedaban con
  los movimientos más recientes y los meses viejos desaparecían del selector
- Conteos de CFDI ahora los hace el servidor

### Errores encontrados de paso
- La calculadora de referidos usaba precios viejos ($990/$1990/$3990) → ganancias
  infladas ~5x. Corregido
- `paypal-setup` creaba un producto "Horizen" NUEVO cada corrida, partiendo el
  catálogo. PayPal solo deja cambiar de plan dentro del mismo producto. Corregido
- El webhook no guardaba el plan comprado

---

## 6. PENDIENTE — tareas de Eduardo

| # | Qué | Urgencia |
|---|---|---|
| 1 | **Correr el SQL de `file_hash`** (abajo) | 🔴 Sigue faltando |
| 2 | Desplegar `paypal-planes` (nueva), `paypal-setup`, `paypal-webhook` | 🟠 |
| 3 | Correr `paypal-setup` una vez desde su cuenta admin (crea los planes sin prueba) | 🟠 |
| 4 | Revisar en PayPal si al cambiar de plan le regalaron **otros 7 días gratis** | 🟠 Es fuga de dinero si sí |

```sql
ALTER TABLE public.statements
  ADD COLUMN IF NOT EXISTS file_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_statements_hash
  ON public.statements(user_id, file_hash);
```

Sin eso, subir el mismo archivo con otro nombre pasa sin aviso y los ingresos se
cuentan doble. El código ya lo usa; se cae a comparar por nombre de archivo.

---

## 7. PENDIENTE — trabajo por construir

### 🔴 El candado del autoguardado — LO MÁS IMPORTANTE
`autoGuardarEstado()` en `dashboard.html` solo revisa que las fechas sean legibles
y que el archivo no esté repetido. **De los montos no revisa nada.**

La app ya SABE cuándo los totales no cuadran (lo muestra en rojo) pero **lo guarda
de todos modos**. Es una alarma que suena con la puerta abierta.

**Falta:** que si no cuadra contra `Total de cargos` impreso, NO se guarde solo.

Es lo que de verdad cierra el problema del $9,720.11. Todo lo demás hace que se
equivoque menos; esto hace que un error no llegue a los reportes.

### 🟡 Otros
- Fichas de bancos de **débito/nómina** (`bancos/debito-pendientes.md`) — vacías.
  Orden sugerido: BBVA, Santander, Banorte, Citibanamex, HSBC, Scotiabank, y
  fintechs (Nu, Hey, Klar, Mercado Pago, Stori)
- La pantalla **Transacciones** tiene el mismo corte de 1000 filas que se arregló
  en Reportes, pero solo cuando no se elige mes
- Las preguntas frecuentes de `pricing.html` ya dicen la verdad sobre el cambio de
  plan; revisar que sigan alineadas si cambia la regla

---

## 8. DECISIONES — tomadas y pendientes

### Tomadas
- **Modelo de IA: Haiku 4.5.** Se evaluó subir a Sonnet 5 (Haiku encoge las
  imágenes a 1568px y las tiras del PDF miden 2250px). Eduardo decidió quedarse.
  **No cambiar sin permiso explícito.**
- **Cambio de plan:** sube al instante (se le regalan los días que faltan del
  ciclo), baja al terminar lo pagado.
- **Cliente nuevo:** siempre sus 7 días de prueba. Sin excepción.

### 🟠 PENDIENTE DE DECIDIR — pasarela de pago
**PayPal NO permite pagar con tarjeta sin cuenta en suscripciones.** Es regla de
PayPal, no un error: *"los acuerdos de facturación y pagos recurrentes no ofrecen
experiencia de pago como invitado"*. En México eso pesa: el cliente típico no
tiene PayPal.

Se recomendó **Stripe**, que resuelve tres cosas de un golpe:
1. Tarjeta sin cuenta, siempre
2. OXXO y SPEI
3. **Prorrateo automático** al cambiar de plan (PayPal no lo hace — por eso hubo
   que programar a mano la regla sube/baja)

**Eduardo aún no decide.** Pidió que se le recuerde. **No tiene ningún cliente
pagando todavía** (solo su cuenta de pruebas) → es el momento más barato para
cambiar. Alternativas: PayPal Advanced Checkout (existe en MX pero requiere
aprobación y no resuelve OXXO ni prorrateo) o Mercado Pago.

---

## 9. Cosas que se aprendieron a la mala

- **PayPal se queda cargando sin decir por qué.** Pasó al cambiar de plan; después
  funcionó solo sin desplegar nada. Puede ser intermitente. No dar por buena una
  teoría sin comprobarla.
- **Los precios se duplican solos.** Estuvieron en 4 lugares a la vez y uno tenía
  los viejos. Hoy `assets/planes.js` manda; `app.js` tiene su propia copia (`PLANS`)
  que quedó correcta pero sin unificar.
- **Supabase corta en 1000 filas.** Cualquier consulta que lea todo el historial
  necesita `_traerTodo()`.
- **Lo que está en GitHub no está funcionando.** Las Edge Functions necesitan
  desplegarse aparte; las páginas las jala Hostinger.

---

## 10. Por dónde empezar en una sesión nueva

1. `git pull origin main` y leer `bancos/README.md`
2. Preguntarle a Eduardo qué de la sección 6 ya hizo
3. Lo siguiente en valor es **el candado del autoguardado** (§7)
4. Y recordarle la decisión de la pasarela de pago (§8)
