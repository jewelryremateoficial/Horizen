# Instrucciones permanentes para Claude — Proyecto Horizen (FinancialOS)

## Regla principal de entrega
Cada vez que el usuario pida algo nuevo, SIEMPRE entregar en este orden:

1. **PASO 1 — Base de datos** (si aplica): SQL listo para copiar en Supabase → SQL Editor
2. **PASO 2 — Backend / Edge Functions** (si aplica): código + instrucciones de deploy
3. **PASO 3 — Frontend**: deploy en Hostinger desde GitHub
4. **PASO 4 — Verificar**: checklist exacto de qué probar y qué deberías ver

Nunca entregar solo el código sin los pasos completos.

---

## Metodología de construcción de software (aplicar siempre)

### Fase 0 — Preparación y cimientos
**Objetivo:** decidir el stack, montar el repositorio, definir el alcance antes de construir.
- Repositorio con control de versiones (git)
- Stack definido con justificación
- README con instrucciones para correr el proyecto
- Promesa principal de la app en una sola frase
- Lista de pantallas y funciones del MVP
- Lista de lo que NO entra en el MVP
- Secretos siempre en variables de entorno, nunca en código

### Fase 1 — Esqueleto navegable (crudo)
**Objetivo:** ver y recorrer la app completa aunque nada funcione todavía.
- Todas las pantallas existen como vistas
- Navegación entre pantallas funciona
- Todos los botones están colocados (aunque no hagan nada)
- Layout no se rompe en el tamaño objetivo
- Datos de relleno (placeholder) visibles
- Una persona externa puede entender qué hará cada parte sin explicación

### Fase 2 ⭐ — Core con usuario falso (LA FASE MÁS IMPORTANTE)
**Objetivo:** que la promesa principal funcione de verdad, sin perder tiempo en login todavía.
**Por qué va aquí:** lo más valioso y lo más incierto debe probarse primero. Si el core no sirve, mejor descubrirlo antes de construir login, DB y diseño bonito.
- La función principal funciona de inicio a fin con datos de prueba
- Un usuario de prueba logra el objetivo central de la app
- La lógica del core está separada de la interfaz
- Probado con alguien externo que confirma que entrega valor
- Decisión consciente: ¿la promesa realmente sirve?

### Fase 3 — Registro, autenticación y base de datos real
**Objetivo:** usuarios reales con datos persistentes y separados.
- Registro, login, logout, recuperación de contraseña
- Contraseñas guardadas con hash (nunca texto plano)
- Cada usuario ve solo sus propios datos (RLS en Supabase)
- El core de Fase 2 funciona conectado a usuarios reales
- Manejo de errores claro (correo ya registrado, contraseña incorrecta, etc.)
- Secretos en variables de entorno, conexiones cifradas

### Fase 4 — Cobros / pagos
**Objetivo:** cobrar de forma confiable.
- Pasarela de pago integrada (PayPal, Stripe, etc.)
- Flujo completo: pago → activación del beneficio automática
- Manejo de pagos fallidos, cancelados, reembolsos
- Confirmación al usuario (pantalla + correo)
- Probado primero en sandbox, luego con transacción real pequeña
- Nunca almacenar datos de tarjeta propios

### Fase 5 — Panel de administrador
**Objetivo:** operar la app sin tocar código.
- Acceso restringido solo a admins
- Gestión de usuarios y transacciones
- Métricas básicas (usuarios activos, ingresos, errores)
- Acciones críticas con auditoría (logs)
- Detección y respuesta a errores en producción

### Transversal (aplica en TODAS las fases)
- Commits frecuentes con mensajes claros
- Pruebas manuales mínimo en cada fase
- Seguridad: secretos fuera del código desde el día uno
- Documentación actualizada al cerrar cada fase
- Estética se pule DESPUÉS de que el core (Fase 2) demuestra que vale la pena

---

## Stack del proyecto Horizen
- **Frontend:** HTML + Vanilla JS (sin framework)
- **Base de datos:** Supabase (PostgreSQL + Auth + Realtime + Edge Functions)
- **Hosting:** Hostinger (archivos estáticos + PHP)
- **Auth:** Supabase + Google OAuth (PKCE flow)
- **Open Banking:** ~~Belvo~~ — **YA NO EN USO** (oculto de la UI). Los datos ahora entran por carga manual y por subida de estado de cuenta. No reintroducir Belvo en la interfaz salvo petición explícita.
- **Pagos:** PayPal Subscriptions
- **Backend serverless:** Supabase Edge Functions (Deno)

## Tablas existentes en Supabase
- `profiles` — usuarios y suscripciones
- `accounts` — cuentas bancarias (captura manual; Belvo ya no en uso)
- `transactions` — movimientos (SAT + manual + estado de cuenta; Belvo ya no en uso)
- `debts` — deudas y tarjetas (captura manual)
- `income_sources` — fuentes de ingreso (manual)
- `fixed_expenses` — gastos fijos (manual)
- `tax_reserves` — reservas fiscales
- `alerts` — alertas financieras
- `sync_logs` — historial de syncs (Belvo, ya no en uso)
- `payments` — pagos PayPal

## URLs importantes
- Sitio: https://horizen.com.mx
- Dashboard usuario: https://horizen.com.mx/dashboard.html
- Dashboard admin: https://horizen.com.mx/admin/dashboard.html
- Supabase: https://upcbznfkpswtxiffgsgj.supabase.co
- Edge Function Belvo: https://upcbznfkpswtxiffgsgj.supabase.co/functions/v1/belvo-auth
- Repo GitHub: https://github.com/jewelryremateoficial/Horizen
