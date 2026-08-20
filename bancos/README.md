# bancos/ — Cómo la app entiende los estados de cuenta de México

## Qué es esto

Una carpeta de **fichas técnicas**: cómo se ve el estado de cuenta de cada banco,
qué palabras usa, dónde están sus totales, cuál columna es el monto.

Estas fichas **se le pegan a las instrucciones de la IA** justo antes de que lea
el PDF. No es que la IA "aprenda y recuerde" — la IA no tiene memoria entre
análisis. Cada vez que alguien sube un estado, le mandamos el PDF **y** la ficha
del banco correspondiente, en la misma petición.

## El hallazgo que cambia el tamaño del problema

No hacen falta 50 fichas.

Desde el **17 de octubre de 2024**, CONDUSEF obliga a **todos** los bancos y
SOFOMes de México a usar el mismo formato en los estados de cuenta de **tarjeta
de crédito de persona física**: el *Estado de Cuenta Universal*. Mismas
secciones, mismos encabezados de columna, mismos totales, misma forma de marcar
cargos y abonos.

Entonces:

| Producto | Estandarizado | Fichas necesarias |
|---|---|---|
| **Tarjeta de crédito** (persona física) | ✅ Sí, por ley desde oct-2024 | **1** (`tdc-estandar-condusef.md`) + notas por banco |
| **Débito / nómina / cheques** | ❌ No hay estándar | Una por banco, sacadas de estados reales |

## Archivos

| Archivo | Qué trae | Estado |
|---|---|---|
| `tdc-estandar-condusef.md` | El formato obligatorio de TDC, campo por campo | ✅ Verificado contra el DOF y contra un Santander real |
| `santander-tdc.md` | Lo específico de Santander sobre el estándar | ✅ Verificado con PDF real (nov 2025) |
| `_plantilla.md` | Molde para agregar un banco nuevo | — |
| `debito-pendientes.md` | Lo que falta del lado de débito | 🚧 Por llenar |

## Cómo agregar un banco

1. Copia `_plantilla.md`.
2. Llénalo con un estado de cuenta **real** de ese banco. Nunca de memoria ni
   de un blog: si no lo viste en un PDF, va marcado como `SIN VERIFICAR`.
3. Guarda **solo estructura** — etiquetas, encabezados, posiciones. Nunca montos,
   nombres, números de cuenta ni datos de nadie.

## Regla de oro

Conocer el formato **no impide** que la IA lea mal un número — sigue siendo una
foto. Lo que logra es distinto y más valioso:

1. Quita la adivinanza de **estructura** (cuál columna es el monto, cuál fecha usar).
2. Le dice dónde están los **totales impresos**, que es con lo que se comprueba
   el resultado.

Sin el paso 2, esto es documentación bonita. Con el paso 2, es un candado.
