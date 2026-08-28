# Cuentas de débito / nómina / cheques — pendiente

**No existe formato estandarizado.** CONDUSEF estandarizó tarjeta de crédito
(oct-2024), pero las cuentas de depósito siguen variando banco por banco.
Aquí sí hacen falta fichas individuales.

## Diferencia clave contra tarjeta de crédito

En débito el signo **NO** va invertido:

| | Débito | Tarjeta de crédito |
|---|---|---|
| Entra dinero | depósito / abono → `ingreso` | pago a la tarjeta (`−`) → `ingreso` |
| Sale dinero | retiro / cargo → `egreso` | compra (`+`) → `egreso` |

Las instrucciones actuales de la IA están escritas para débito ("el dinero ENTRA
a la cuenta") y luego parchadas para TDC con una lista de palabras. Al separar
las dos fichas, cada una queda coherente.

## Orden sugerido para llenarlas

Por cobertura de mercado en PYMEs:

1. BBVA
2. Santander
3. Banorte
4. Citibanamex
5. HSBC
6. Scotiabank
7. Fintechs: Nu, Hey Banco, Klar, Mercado Pago, Stori

## Cómo llenarlas sin conseguir 50 PDFs

Cada estado que sube un cliente **ya es una muestra**. Al terminar un análisis,
guardar solo la **estructura**: banco detectado, etiquetas de columnas, etiquetas
de totales, si el PDF traía texto o no.

> 🔒 **Nunca guardar montos, nombres, número de cuenta ni descripciones de
> movimientos.** Solo el esqueleto del formato. Si esto se implementa, debe
> quedar dicho en `privacidad.html`.

Con eso, las fichas se llenan solas conforme entren clientes.

## Fuentes sin verificar

Notas de blogs y guías públicas sobre BBVA, Nu, Citibanamex, Hey Banco, Klar,
Mercado Pago, Stori, RappiCard, Plata y Liverpool. Sirven de pista, **no** de
ficha: nada entra a un archivo de banco hasta verse en un PDF real.
