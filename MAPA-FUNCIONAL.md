# Horizen — Mapa funcional (qué hace cada parte y cómo se conecta)

Este documento define el **objetivo de cada pantalla y botón** y **cómo fluyen los datos**.
Sirve como la "fuente de verdad" antes de seguir construyendo módulos nuevos.

---

## 1. La idea en una frase
El usuario **sube su estado de cuenta** → la IA **extrae y categoriza** los movimientos →
de ahí salen **reportes, KPIs, impuestos y alertas**. Todo lo demás (ingresos, gastos, plan)
se alimenta de esos mismos datos.

**El corazón del sistema es la tabla `transactions`** (los movimientos). Casi todo lee de ahí.

---

## 2. Las 3 capas del sitio

1. **Sitio público** (`index`, `pricing`, `login`, `signup`, `terminos`, `privacidad`)
   → Objetivo: **atraer y registrar** clientes. Termina en "Crear cuenta" / "Iniciar sesión".
2. **Dashboard del cliente** (`dashboard.html`)
   → Objetivo: que el empresario **vea y entienda sus finanzas** y tome decisiones.
3. **Panel admin** (`admin/dashboard.html`)
   → Objetivo: que TÚ **operes el negocio** (usuarios, ingresos del SaaS, métricas).

---

## 3. El flujo central de datos (cómo se conecta todo)

```
[📄 Subir Estado]  →  IA procesa  →  Guardas
        │                              │
        │                       crea registro en
        │                       ┌─ statements (el "estado": nombre, banco, período)
        │                       └─ transactions (cada movimiento, con statement_id)
        ▼
   La tabla transactions alimenta a:
        ├─ 📊 Transacciones (la lista; filtrable por estado con el botón "Ver")
        ├─ ⚡ One-Minute Check (KPIs: liquidez, runway, margen, semáforo)
        ├─ 🧾 SAT/Fiscal (ISR e IVA, usando los movimientos marcados como fiscales)
        ├─ 🧠 Plan Financiero (diagnóstico y proyección de NOVA)
        └─ 🔔 Alertas (se disparan según los KPIs)
```

Las **categorías** (`custom_categories`) y las **reglas** (`category_rules`) deciden
cómo se clasifica cada movimiento. NOVA aprende de tus correcciones.

---

## 4. Botones del Dashboard (cliente) — objetivo y conexión

### Grupo "Principal"
- **⚡ One-Minute Check (Inicio)** — *Objetivo:* tu salud financiera en 3 números (liquidez/caja libre, margen neto, semáforo de alertas). *Datos:* calcula desde `transactions` + `accounts` + `debts`. *Conecta:* es el resumen de todo; los botones "Ver" te llevan a Transacciones/Cuentas.
- **📊 Transacciones** — *Objetivo:* ver y editar TODOS los movimientos (de estados, manuales y SAT). *Datos:* `transactions`. *Conecta:* el botón "Ver" de un estado guardado la abre filtrada por ese estado (`statement_id`). Botón "+ Transacción" agrega uno manual.
- **🏦 Cuentas** — *Objetivo:* tus cuentas bancarias y saldos; calcula Patrimonio Neto (activos − deudas). *Datos:* `accounts` (captura manual; Belvo ya no se usa) + `debts`. *Conecta:* alimenta caja libre del One-Minute Check.

### Grupo "Finanzas"
- **💰 Ingresos** — *Objetivo:* registrar fuentes de ingreso recurrentes y ver total mensual. *Datos:* `income_sources` (manual). *Conecta:* alimenta el Plan Financiero y el Calendario.
- **📅 Gastos Fijos** — *Objetivo:* compromisos mensuales (renta, nómina, suscripciones). *Datos:* `fixed_expenses` (manual). *Conecta:* alimenta el burn rate / runway y el Calendario.
- **📆 Calendario** — *Objetivo:* ver el flujo diario (cobros y pagos) y vencimientos. *Datos:* `fixed_expenses`, `debts` (fechas de corte), ingresos. *Conecta:* visualiza en el tiempo lo de Ingresos/Gastos/Deudas.
- **📄 Subir Estado** — *Objetivo:* la entrada principal de datos. Subes PDF/CSV → IA → revisas → Guardas. *Datos:* crea `statements` + `transactions`. *Conecta:* es la fuente que alimenta a casi todo. Aquí está la lista "Estados guardados" (Ver / Eliminar).
- **🧾 SAT / Fiscal** — *Objetivo:* cálculo de ISR provisional e IVA. *Datos:* `transactions` con `is_fiscal = true` (las que tienen CFDI) + `tax_reserves`. *Conecta:* depende de cómo marques las transacciones.

### Grupo "Inteligencia"
- **🧠 Plan Financiero (NOVA)** — *Objetivo:* diagnóstico y recomendaciones concretas (qué gasto recortar, runway, proyección). *Datos:* lee todo lo anterior. *Conecta:* es la "capa de consejo" sobre los datos.

### Grupo "Cuenta"
- **⚙️ Configuración** — *Objetivo:* perfil, empresa, RFC, plan/suscripción. *Datos:* `profiles`, `payments`.

### Barra superior (topbar)
- **+ Transacción** — alta manual rápida de un movimiento → `transactions`.
- **🔔 (campana)** — abre Alertas. *Datos:* `alerts` (se generan de los KPIs).
- **Salir** — cerrar sesión.

---

## 5. Panel Admin — objetivo
Operar el negocio (no las finanzas de un cliente):
- **Usuarios** — quién se registró, su plan, su estado de suscripción (`profiles`).
- **Métricas del SaaS** — MRR/ingresos, altas, etc. (`payments`).
- **Gestión de planes** — los planes que se venden.

---

## 6. Tablas en la base de datos y quién las usa
| Tabla | Para qué | La usan |
|---|---|---|
| `transactions` | Movimientos (corazón del sistema) | Transacciones, One-Minute Check, SAT, Plan |
| `statements` | Cada estado de cuenta subido (con nombre) | Subir Estado, botón "Ver" |
| `accounts` | Cuentas y saldos | Cuentas, caja libre |
| `debts` | Tarjetas y préstamos | Cuentas, Calendario, runway |
| `income_sources` | Fuentes de ingreso | Ingresos, Plan, Calendario |
| `fixed_expenses` | Gastos fijos | Gastos, Calendario, runway |
| `tax_reserves` | Reservas fiscales | SAT/Fiscal |
| `alerts` | Alertas financieras | Campana / One-Minute Check |
| `custom_categories` + `category_rules` | Categorías y reglas de NOVA | Clasificación de transacciones |
| `profiles` + `payments` | Usuarios y cobros | Configuración, Admin |

---

## 7. Dónde se conectan los MÓDULOS NUEVOS (futuro)
- **Inventario** (`products`, `inventory_movements`) → módulo propio. *Conexión con finanzas:* una **venta** puede generar un ingreso; una **salida de stock** se liga a una venta.
- **Órdenes de compra** (`suppliers`, `purchase_orders`) → al **recibir** una orden: suma stock al inventario **y** puede generar un gasto/`transaction`.
- **Clientes (CRM interno)** (`clients`) → directorio; se liga a ventas/órdenes.
- **Citas / Agenda** (`appointments`) → módulo propio; opcionalmente ligado a un cliente.

**Regla de oro:** cada módulo nuevo = tabla(s) propia(s) + su pantalla + su entrada en el menú,
y se "engancha" a Finanzas creando `transactions` cuando hay dinero de por medio.
