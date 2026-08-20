# Santander México — Tarjeta de crédito

**Base:** sigue el Estado de Cuenta Universal → lee primero `tdc-estandar-condusef.md`.
**Verificado con:** PDF real, tarjeta Santander Free, periodo nov–dic 2025.

## Lo específico de Santander

| Detalle | Valor |
|---|---|
| Encabezado de página | `Número de cuenta: NNNN NNNN NNNN NNNN` (izq.) · `Página N de M` (der.) |
| Título de la tabla | `CARGOS, ABONOS Y COMPRAS REGULARES (NO A MESES)` |
| Subtítulo | `Tarjeta Titular NNNNNNNNNNNNNNNN` |
| Totales | Imprime **`Total Cargos`** y **`Total Abonos`** (sin el "de") |
| Producto visible | `Santander free`, con bloque de beneficios |

## ⚠️ El PDF de Santander NO TIENE TEXTO

Este es el dato crítico y hay que tenerlo presente siempre.

- Las páginas contienen **cero caracteres**. Todo es imagen.
- Cada renglón de la tabla es una **tira de imagen de ~2250 × 31 píxeles**.
- No es un escaneo del cliente: así lo genera el banco
  (productor del PDF: `Compart MFFPDF I/O Filter`).

**Consecuencia:** la IA no copia los números, los *mira*. Los errores de lectura
de dígitos son esperables, no excepcionales. La verificación contra
`Total Cargos` / `Total Abonos` no es opcional en Santander — es el único
mecanismo que los detecta.

## Descripciones observadas (nov 2025)

| Descripción | Signo | Tipo | Categoría |
|---|---|---|---|
| `PAGO POR TRANSFERENCIA` | `−` | ingreso | Pago TDC |
| `Alibaba.com` | `+` | egreso | Mercancía |
| `PAYPAL FACEBOOK` | `+` | egreso | Publicidad |
| `PAY PUB ENVIA` | `+` | egreso | Envíos |
| `ULTRAMSG.COM` (USD) | `+` | egreso | Software |
| `NOTION LABS, INC.` (USD) | `+` | egreso | Software |
| `OPENAI CHATGPT SUBSCR` (USD) | `+` | egreso | Software |
| `PAYPAL SHOPIFY` | `+` | egreso | Software |
| `APPLE.COM/BILL` | `+` | egreso | Software |
| `AMAZON PRIME` | `+` | egreso | Entretenimiento |
| `PAY PAL DISNEYPLUS` | `+` | egreso | Entretenimiento |

Nota: `PAGO POR TRANSFERENCIA` contiene la palabra `TRANSFERENCIA`. Cuidado con
las reglas por palabra clave: una regla guardada como `TRANSFERENCIA → egreso`
voltea los 12 pagos de la tarjeta a egreso.

## Errores reales que produjo este estado

| Renglón | PDF | La app leyó |
|---|---|---|
| `ULTRAMSG.COM  39.00 USD TC 18.4643` | `$720.11` | `$9,720.11` (le pegó el 9 de "39.00") |
| `PAY PAL DISNEYPLUS  OPM 150323DI1` | `$149.00` | `$9,141.00` |
| Nombre del comercio | `ULTRAMSG.COM` | `ULTRASG COM` (se comió la M) |
