// Fichas de formato de estados de cuenta de México que se le pegan al prompt.
//
// Versión operativa (resumida) de /bancos/tdc-estandar-condusef.md — ese archivo
// es la documentación completa para humanos; este es lo que ve la IA.
// Si cambias uno, cambia el otro.
//
// Base legal: desde el 17-oct-2024 CONDUSEF obliga a TODOS los bancos y SOFOMes
// de México a usar el mismo formato en estados de cuenta de tarjeta de crédito
// de persona física ("Estado de Cuenta Universal"). Verificado contra un
// Santander real de nov-2025.

export const FORMATO_BANCOS = `
════════════════════════════════════════════════════════════════
ANALIZA, NO SOLO LEAS — el documento se comprueba a sí mismo
════════════════════════════════════════════════════════════════

Un estado de cuenta repite la misma información de varias formas. Esa repetición
NO es adorno: es la PRUEBA. Un número que no cuadra con las otras veces que
aparece en el mismo documento está mal, aunque se vea bien.

NIVEL 1 — El renglón se comprueba solo.
Cuando una compra es en moneda extranjera, el banco imprime la operación
COMPLETA: el importe en dólares, el tipo de cambio, y el resultado ya
multiplicado en la columna de montos, junto a los demás. Ejemplo real:

  ULTRAMSG.COM   39.00 USD  TC 18.4643        + $ 720.11
                 └─── la operación ───┘         └ el resultado ┘

  39.00 × 18.4643 = 720.11  ✅  → el monto es 720.11

Si un renglón trae USD, TC, T.C. o TIPO DE CAMBIO: MULTIPLICA y confirma que da
el monto de la columna. El importe en dólares NUNCA es el monto. Tampoco lo son
las referencias tipo "OPM 150323DI1" o "ANE 140618P37".

NIVEL 2 — La tabla se comprueba sola.
La suma de los movimientos debe dar los totales impresos al pie de la tabla.

NIVEL 3 — El estado se comprueba solo.
adeudo del periodo anterior + cargos − pagos y abonos = saldo deudor total.

REGLA: no entregues un monto que no hayas podido comprobar contra otra parte del
mismo documento. Si algo no cuadra, extráelo igual — la app se lo avisa al
usuario. Nunca inventes un número para que cuadre.

════════════════════════════════════════════════════════════════
SI ES TARJETA DE CRÉDITO (formato estandarizado, todos los bancos MX)
════════════════════════════════════════════════════════════════

Lo reconoces por: "DESGLOSE DE MOVIMIENTOS", "Fecha de corte", "Pago mínimo",
"Límite de crédito", "TU PAGO REQUERIDO ESTE PERIODO".

La tabla principal se llama "CARGOS, ABONOS Y COMPRAS REGULARES (NO A MESES)" y
tiene EXACTAMENTE cuatro columnas, en este orden:

  | Fecha de la operación | Fecha de cargo | Descripción del movimiento | Monto |

- MONTO: es SIEMPRE el número de la última columna ("Monto"), pegado al borde
  derecho. Es el único importe en pesos del renglón.
- FECHA: usa "Fecha de cargo" (la SEGUNDA columna). Sé consistente en todo el
  estado; nunca mezcles las dos columnas de fecha.
- SIGNO (esto viene al revés de lo que uno pensaría):
    "+" = CARGO  = una compra, te AUMENTA la deuda  → egreso
    "−" = ABONO  = un pago tuyo a la tarjeta         → ingreso
  Los abonos suelen ir alineados a la derecha y en negritas.
  Si el signo no se distingue con seguridad, decide por la descripción (PAGO,
  SU PAGO, ABONO, GRACIAS POR SU PAGO, BMOVIL PAGO, PAGO POR TRANSFERENCIA =
  abono/ingreso). No lo adivines.
- TOTALES: la tabla cierra con "Total de cargos" (+) y "Total de abonos" (−).
  Algunos bancos los imprimen como "Total Cargos" / "Total Abonos". Extráelos
  SIEMPRE al #META: total_depositos = total de ABONOS, total_retiros = total de
  CARGOS. Esos dos renglones van SOLO al #META: son totales, NUNCA movimientos.
  Lo mismo con el encabezado "PAGOS Y ABONOS" y con cualquier "Saldo/Adeudo
  anterior" — no los metas a la lista (error real: se coló "PAGOS Y ABONOS" por
  $190,931 como si fuera un pago, cuando era la suma de los 12 pagos de abajo).
- TABLAS A MESES ("COMPRAS A MESES SIN/CON INTERESES"): SÍ SE EXTRAEN. Cada
  renglón de esas tablas es un movimiento más de este periodo, con su fecha, su
  descripción y categoría normales. El monto que se extrae es "Pago requerido"
  (la mensualidad de este mes), NUNCA "Monto original" (ese es el precio total de
  la compra a meses, ya se cobró repartido). Si las omites, tus cargos van a
  quedar por debajo del "Total de cargos" impreso y el estado no va a cuadrar.
- CUADRE FINAL DE LA TARJETA: la suma de TODOS tus egresos (tabla principal +
  mensualidades de las tablas a meses + intereses + comisiones) debe dar el
  "Total de cargos" impreso. Si te queda corto, te faltó una tabla.
- El AÑO sale de "Periodo:" o "Fecha de corte:".

════════════════════════════════════════════════════════════════
SI ES CUENTA DE DÉBITO / NÓMINA / CHEQUES
════════════════════════════════════════════════════════════════

No hay formato estandarizado; varía por banco. Aquí el signo NO va invertido:
un depósito/abono es ingreso y un retiro/cargo es egreso. Guíate por la columna
(depósitos vs retiros) y busca los totales impresos del resumen del periodo.
`;
