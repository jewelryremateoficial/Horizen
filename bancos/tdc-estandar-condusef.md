# Estado de Cuenta Universal — Tarjeta de crédito (persona física)

**Obligatorio para TODOS los bancos y SOFOMes de México desde el 17-oct-2024.**
Fuente: Acuerdo CONDUSEF publicado en el DOF (formato estandarizado + guía de llenado).
Verificado contra un estado real de Santander (periodo nov–dic 2025).

Si el documento trae las secciones de abajo, es este formato — sin importar el banco.

---

## 0. LEER NO ES ANALIZAR — el documento se comprueba a sí mismo

Este es el principio que manda sobre todo lo demás.

Un estado de cuenta **no es una lista de datos sueltos**: es un documento donde
la misma información aparece varias veces de formas distintas. Esa repetición no
es adorno — **es la prueba**. Un número que no cuadra con las otras veces que
aparece está mal, aunque se vea bien.

Hay tres niveles, del más chico al más grande. **Usa los tres.**

### Nivel 1 — El renglón se comprueba solo

Cuando una compra es en moneda extranjera, el banco **imprime la operación
completa**: el importe en dólares, el tipo de cambio, y el resultado ya
multiplicado en la columna de montos, junto a todos los demás.

```
ULTRAMSG.COM     39.00 USD   TC 18.4643        + $ 720.11
                 └────── la operación ──────┘    └ el resultado ┘
```

`39.00 × 18.4643 = 720.11` ✅

**Multiplícalo. Si no da, el monto se leyó mal.** No lo corrijas en silencio:
márcalo para revisión.

> Este es el error que ya pasó en producción: la app reportó `$9,720.11` cuando
> el renglón decía `$720.11`. La multiplicación lo habría cazado al instante —
> 9,720.11 no es 39.00 por nada.

Aplica a cualquier banco que imprima compras en dólares. Búscalo en cada renglón
que traiga `USD`, `TC`, `T.C.`, `TIPO DE CAMBIO` o dos números en la descripción.

### Nivel 2 — La tabla se comprueba sola

La suma de los movimientos **debe dar** los totales impresos al pie:

```
suma de todos los cargos  ==  Total de cargos
suma de todos los abonos  ==  Total de abonos
```

Si no da, falta un movimiento, sobra uno duplicado, un monto se leyó mal, o un
signo quedó al revés. **La diferencia te dice cuánto falta.**

### Nivel 3 — El estado se comprueba solo

Los números de la portada tienen que amarrar con la tabla:

```
Adeudo del período anterior
  + Cargos regulares (no a meses)
  + Cargos y compras a meses (capital)
  + Monto de intereses + Monto de comisiones + IVA
  − Pagos y abonos
  ==  Saldo deudor total
```

Y `Pagos y abonos` de la portada debe coincidir con `Total de abonos` de la tabla.

### La regla

> **Nunca entregues un número que no hayas podido comprobar contra otra parte del
> mismo documento.** Si los tres niveles cuadran, el análisis es correcto. Si
> alguno no cuadra, dilo — no lo escondas ni lo maquilles.

## 1. Secciones, en orden

| Página | Sección (título impreso, en mayúsculas) |
|---|---|
| 1 | `TU PAGO REQUERIDO ESTE PERIODO` |
| 1 | `CUÁNTO PAGARÍAS POR TUS COMPRAS REGULARES (NO A MESES)` |
| 1 | `RESUMEN DE CARGOS Y ABONOS DEL PERIODO` |
| 1 | `INDICADORES DEL COSTO ANUAL DE LA TARJETA` |
| 1 | `NIVEL DE USO DE TU TARJETA` |
| 1 | `MENSAJES IMPORTANTES` |
| 2+ | `MENSAJES ADICIONALES` |
| 2+ | `SALDO SOBRE EL QUE SE CALCULARON LOS INTERESES DEL PERIODO` |
| 2+ | `DISTRIBUCIÓN DE TU ÚLTIMO PAGO` |
| 2+ | **`DESGLOSE DE MOVIMIENTOS`** ← aquí viven las transacciones |
| 2+ | `INFORMACIÓN DE OTRAS LÍNEAS DE CRÉDITO` (si aplica) |
| final | `CARGOS NO RECONOCIDOS`, `ATENCIÓN DE QUEJAS`, `REESTRUCTURA DE TU DEUDA`, `NOTAS ACLARATORIAS`, `GLOSARIO DE TÉRMINOS Y ABREVIATURAS` |

Cada página trae `Página N de M` arriba a la derecha.

---

## 2. La tabla de movimientos — LO MÁS IMPORTANTE

Dentro de `DESGLOSE DE MOVIMIENTOS` hay hasta tres tablas. La principal se
titula **`CARGOS, ABONOS Y COMPRAS REGULARES (NO A MESES)`** y tiene
**exactamente cuatro columnas**, en este orden:

```
| Fecha de la operación | Fecha de cargo | Descripción del movimiento | Monto |
```

### 2.1 De dónde sale el MONTO

> **El monto es SIEMPRE el número de la última columna (`Monto`), el que está
> pegado al borde derecho de la tabla.**
> Es el único importe en pesos de ese renglón.

**Trampa #1 — cargos en moneda extranjera.** Un renglón de compra en dólares trae
**dos números**: el importe en USD y el tipo de cambio, impresos *dentro* de la
columna de descripción. Ejemplo real:

```
18-Nov-2025 | 19-Nov-2025 | ULTRAMSG.COM   39.00 USD  TC 18.4643 | + | $ 720.11
                                            └── NO es el monto ──┘        └ SÍ ┘
```

- El monto es **720.11**, no 39.00 y no ninguna combinación de los dos.
- Comprobación aritmética: `USD × TC = Monto` → `39.00 × 18.4643 = 720.11`.
  Si no cuadra, el monto se leyó mal.

**Trampa #2 — la referencia.** Otros renglones traen una referencia dentro de la
descripción (`OPM 150323DI1`, `EPA 211001FEA`, `ANE 140618P37`). Son letras y
números pegados, **nunca** el monto.

### 2.2 Cuál FECHA usar

Hay dos, y son distintas. Usa **`Fecha de cargo`** (la segunda columna) — es
cuando el movimiento afectó tu saldo, y es la que hace que los totales cuadren.
Sé consistente: nunca mezcles las dos columnas en un mismo estado.

Formato impreso: `DD-MMM-AAAA` (`24-dic-2022`, `18-Nov-2025`).

### 2.3 Cargo vs abono — VIENE AL REVÉS de lo que uno pensaría

Entre la descripción y el monto hay una columnita con un signo:

| Signo | Qué es | Para la app |
|---|---|---|
| **`+`** | **CARGO** — una compra. Te AUMENTA la deuda. | `egreso` |
| **`−`** | **ABONO** — un pago tuyo a la tarjeta. Te BAJA la deuda. | `ingreso` |

Es al revés de una cuenta de débito. En tarjeta, `+` = gastaste, `−` = pagaste.

Además el estándar los distingue visualmente:
- **Cargos**: signo `+`, alineados a la izquierda.
- **Abonos**: signo `−`, alineados a la derecha y **en negritas**.

> ⚠️ Ese signito es lo ÚNICO que dice la dirección del movimiento, y en un PDF
> escaneado un `−` es un `+` al que le falta la rayita. Cuando el signo no se
> distinga con seguridad, decide por la descripción (`PAGO`, `SU PAGO`, `ABONO`,
> `GRACIAS POR SU PAGO`, `BMOVIL PAGO`, `PAGO POR TRANSFERENCIA` = abono) y
> **márcalo para revisión**, no lo adivines en silencio.

### 2.4 Los TOTALES — el ancla de la verificación

La tabla cierra con dos renglones impresos:

```
                                        Total de cargos  +  $ 184,727.22
                                        Total de abonos  −  $ 190,931.00
```

(Algunos bancos imprimen `Total Cargos` / `Total Abonos`, sin el "de". Acepta ambas.)

> **Estos dos números son la verdad.** La suma de todos los movimientos marcados
> como cargo DEBE dar `Total de cargos`, y la de los abonos DEBE dar
> `Total de abonos`. Si no cuadra, algo se leyó mal o falta un movimiento.
> Extráelos SIEMPRE.

> ⚠️ **Estos renglones van al `#META`, nunca a la lista de movimientos.** Igual el
> encabezado `PAGOS Y ABONOS` y los `Saldo/Adeudo anterior`. Caso real (nov-2025):
> la IA metió `PAGOS Y ABONOS $190,931.00` como si fuera un pago más — era la suma
> de los 12 pagos que ya estaban listados abajo. Se contó el mismo dinero dos veces.

> ⚠️ **Los pagos a la tarjeta son INGRESO, no gasto.** En ese mismo estado los 12
> `PAGO POR TRANSFERENCIA` quedaron marcados como egreso, y los $168,578 de compras
> se mostraron como $359,509 de gasto. Hoy el parser lo corrige solo cuando el
> `#META` declara `tdc`, o cuando lo marcado como "Pago TDC" suma exacto el
> `Total de abonos` — el documento probándose a sí mismo.

### 2.5 Las otras dos tablas

`COMPRAS A MESES SIN INTERESES` y `COMPRAS A MESES CON INTERESES` tienen columnas
distintas: `Fecha de la operación`, `Descripción`, `Monto original`,
`Saldo pendiente`, `Pago requerido`, `Núm. de pago`, `Tasa de interés aplicable`
(y las con intereses agregan `Intereses del período` e `IVA de intereses del período`).

> ⚠️ **`Monto original` NO es el gasto de este mes.** Es el precio total de la
> compra a meses. Lo que corresponde a este periodo es `Pago requerido`.
> No sumes `Monto original` a los gastos del mes.

> ⚠️ **Pero SÍ hay que extraer estas tablas.** Cada renglón es un movimiento más
> del periodo, con su `Pago requerido` como monto. Caso real (nov-2025): la IA se
> saltó estas tablas y sus cargos sumaron $168,578.05 contra los $184,727.22
> impresos — **faltaban $16,149.17**, justo el tamaño de las mensualidades.

---

## 3. Los números de control de la portada

Sirven para cuadrar el estado completo. Están en `RESUMEN DE CARGOS Y ABONOS DEL PERIODO`:

- `Adeudo del período anterior`
- `Cargos regulares (no a meses)`
- `Cargos y compras a meses (capital)`
- `Monto de intereses`
- `Monto de comisiones`
- `IVA de intereses y comisiones`
- `Pagos y abonos`

Y en `TU PAGO REQUERIDO ESTE PERIODO`:

- `Periodo:` (fecha inicial a fecha final) ← **de aquí sale el AÑO**
- `Fecha de corte:`
- `Número de días en el período:`
- `Fecha límite de pago`
- `Pago para no generar intereses`
- `Pago mínimo`

En `NIVEL DE USO DE TU TARJETA`: `Saldo deudor total`, `Límite de crédito`,
`Crédito disponible`.

---

## 4. Resumen para la IA (esto es lo que hay que obedecer)

0. **Analiza, no solo leas.** Comprueba cada monto contra el propio documento
   (renglón → tabla → portada, sección 0). Un número sin comprobar no se entrega.
1. Es tarjeta de crédito si ves `DESGLOSE DE MOVIMIENTOS` o `Fecha de corte` o `Pago mínimo`.
2. El **monto** es el número de la columna `Monto`, la última, pegada a la derecha.
   Jamás el importe en USD ni el tipo de cambio.
3. Si el renglón trae `NN.NN USD TC NN.NNNN`, comprueba `USD × TC = Monto`.
4. La **fecha** sale de `Fecha de cargo` (segunda columna). Consistente en todo el estado.
5. **`+` = egreso, `−` = ingreso.** Al revés que en débito.
6. El **año** sale de `Periodo:` / `Fecha de corte:`. Si no está impreso, deja el periodo vacío.
7. Extrae **siempre** `Total de cargos` y `Total de abonos`. Son la comprobación.
8. En tablas a meses, el gasto del periodo es `Pago requerido`, no `Monto original`.
