# Investigación Horizen Empresarial — 6 reportes

## efectivo-mx

### Hallazgos
## 1. Cómo manejan el efectivo los negocios mexicanos hoy (realidad de campo)

**El efectivo domina, sobre todo fuera de CDMX.** Según la ENIF 2024 (INEGI) y los Censos Económicos 2024: el efectivo sigue siendo el método principal de cobro en negocios (83.8% en 2023, bajando desde 94.9% en 2018); en el sur del país el 82% de las compras mayores a $500 se pagan en efectivo (vs 55.2% en CDMX); 64.3% de las unidades económicas operan en la informalidad y prefieren efectivo por no dejar rastro. Conclusión: el usuario típico de Horizen (joyero, hotelero, comerciante) tiene una parte enorme de sus ingresos que NUNCA aparecerá en el estado de cuenta PDF que Horizen ya procesa. Ese es el hueco exacto a cubrir.

**Herramientas reales que usan hoy:**
- **Talonario de notas de venta en papel** (se compra en cualquier papelería): original para el cliente, copia para el dueño. Al final del día el dueño junta las copias, suma con calculadora y anota el total en una libreta. Este es el "sistema contable" de la mayoría.
- **Libreta física**: una página por día con ventas, gastos, "fiados" (crédito informal a clientes) y el total del corte.
- **Corte de caja diario** (ritual universal en México): al cierre se cuenta el efectivo físico, se compara contra la suma de notas/tickets, se separan los vouchers de tarjeta, se anota faltante o sobrante, y se decide cuánto se deposita al banco y cuánto queda como fondo de caja para mañana.
- **Terminales**: Clip y Mercado Pago Point capturan lo pagado con TARJETA, pero muchos negocios registran ahí también ventas en efectivo solo si usan el módulo POS completo (la mayoría no lo hace; la terminal es solo para tarjeta). El efectivo queda fuera del sistema.
- **Apps tipo "libreta digital"**: Treinta (7M+ de negocios en LATAM) es la referencia: registrar venta/gasto/deuda "en segundos", caja virtual con apertura y cierre, comprobante enviado por WhatsApp. Su éxito demuestra que el patrón ganador para usuarios no técnicos es "libreta digital", no "sistema contable".

## 2. Anatomía del corte de caja (para digitalizarlo bien)

Flujo estándar documentado (Clip, Sait, Microsip, agendapro): (a) saldo inicial / fondo de caja con que abrió el día; (b) + ventas en efectivo del día; (c) − gastos/retiros pagados de la caja; (d) = efectivo esperado; (e) conteo físico real; (f) diferencia = faltante o sobrante; (g) evidencia (notas, vouchers); (h) cuánto se retira/deposita y cuánto queda de fondo para mañana. Los POS modernos automatizan (d) y alertan si hay diferencia. Un corte digital SIMPLE no necesita los 8 pasos: para un dueño (no un cajero empleado) basta con: "¿cuánto entró hoy en efectivo?", "¿cuánto salió?", foto de las notas, y opcionalmente conteo para detectar faltantes.

## 3. Cómo capturan las mejores apps (patrones de UX de registro rápido)

- **Expensify / Easy Expense / Smart Receipts**: el patrón dominante es "snap first, ask later": un botón grande de cámara, tomas la foto y la IA (OCR) extrae monto, fecha y comercio; el usuario solo confirma. "Very little interaction to get to the final submission".
- **Apps de gasto personal rápidas (Monefy, etc.)**: teclado numérico gigante como pantalla inicial, categorías como iconos grandes (1 tap), fecha = hoy por defecto. Total: 3 taps + monto = registro guardado en menos de 10 segundos.
- **Treinta**: dos botones grandes (+Venta verde / −Gasto rojo), monto, método de pago (efectivo preseleccionado), listo. Deudas ("fiado") como tercera entidad de primera clase — muy relevante culturalmente en México.
- Reglas comunes: cero campos obligatorios además del monto; categoría y concepto opcionales o inferidos; confirmación con vibración/animación y regreso inmediato a la pantalla principal; edición posterior siempre posible.

## 4. Patrones técnicos de foto de comprobante (stack de Horizen)

- `<input type="file" accept="image/*" capture="environment">` abre la cámara trasera directo en móvil (MDN); un segundo input sin `capture` permite elegir de galería. En iOS Safari ambos funcionan sin permisos especiales de app nativa.
- **Compresión en cliente antes de subir** (crítico: fotos de celular pesan 3–8 MB y los usuarios tienen datos limitados): canvas API o librería tipo compressorjs/browser-image-compression, bajar a ~1200px de ancho y calidad 0.7–0.8 → ~150–300 KB. Patrón documentado específicamente con Supabase Storage (mikeesto.com, DEV Community).
- **Supabase Storage**: bucket privado con RLS por usuario (`user_id/` como prefijo de path), URLs firmadas para visualizar, y transformaciones de imagen nativas (imgproxy) para thumbnails en listados sin costo de ancho de banda.
- Horizen ya tiene IA que lee estados de cuenta PDF: el mismo patrón (Edge Function + visión) puede leer la foto de las notas y sugerir el total, invirtiendo el flujo a "foto primero, monto sugerido después" como Expensify.

## 5. UX ideal para el caso del joyero ("$18,500 de hoy con foto de las notas" en <20 segundos)

Flujo validado por los patrones anteriores, desde el celular:
1. Botón flotante permanente "+ Efectivo" (o acceso desde pantalla de inicio / ícono en home screen vía PWA). 1 tap.
2. Pantalla única, sin scroll: teclado numérico grande ya abierto, monto en fuente enorme. Escribe 18500 (~4 seg).
3. Toggle Entrada/Salida (Entrada preseleccionada, verde). Fecha = hoy por defecto (editable con 1 tap para "se me olvidó ayer").
4. Concepto opcional: chips de conceptos frecuentes del usuario ("Ventas del día", "Apartado", "Abono cliente") — 1 tap, sin teclear.
5. Botón cámara: abre cámara trasera directo (`capture="environment"`), foto de las notas apiladas, thumbnail visible al instante; subida en segundo plano mientras el usuario ya guardó (~6 seg).
6. "Guardar" → confirmación grande "$18,500 registrados" + total acumulado del día visible ("Hoy en efectivo: $18,500"). Total: ~15 segundos.
Anti-patrones a evitar (documentados en la categoría): formularios con 8 campos, categorías obligatorias, obligar a esperar a que suba la foto, y pedir el registro venta por venta — el dueño mexicano registra EL TOTAL DEL DÍA, no 47 tickets individuales.

Fuentes principales: [ENIF 2024 INEGI](https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/enif/ENIF2024_RR.pdf), [Payments CMI: economía informal LATAM 2025](https://paymentscmi.com/insights/economia-informal-pagos-digitales-america-latina-2025/), [Censos Económicos 2024](https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/ce/CE_2024_RO_Nal.pdf), [Clip: cierre de caja por turno](https://blog.clip.mx/articulo/cierre-caja-turno), [agendapro: cómo se hace un corte de caja](https://agendapro.com/blog/como-se-hace-un-corte-de-caja/), [Sait: corte en 5 pasos](https://ayuda.sait.mx/sait-erp/11-capacitacion-modulo-caja/a-corte-de-caja-en-5-pasos/), [Treinta](https://treinta.co/), [Treinta en Google Play](https://play.google.com/store/apps/details?id=com.treintaapp&hl=en_US), [Expensify receipt scanning](https://use.expensify.com/receipt-scanning-app), [Easy Expense](https://apps.apple.com/us/app/receipt-scanner-easy-expense/id1528787066), [MDN: atributo capture](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/capture), [Compresión cliente + Supabase Storage](https://mikeesto.com/posts/supabaseimagecompression/), [Supabase image transformations](https://supabase.com/docs/guides/storage/serving/image-transformations), [Mercado Pago PDV App](https://www.mercadopago.com.mx/blog/pdv-app-cobros-fisicos), [EdiFactMx: formato nota de venta](https://www.edifact.com.mx/masinfo/formato-de-nota-de-venta.html).

### Recomendaciones
## Recomendaciones accionables para Horizen

**1. Construir "Caja" como módulo de registro diario de efectivo, no como POS.** No competir con Clip/Treinta en venta-por-venta ni inventario. El posicionamiento correcto de Horizen: "al final del día, registra en 20 segundos cuánto entró en efectivo, con foto de tus notas, y Horizen lo integra a tu panorama financiero completo (junto con lo que ya lee de tus estados de cuenta)". Eso es exactamente lo que ninguna app hace bien: unir efectivo + banco en una sola vista.

**2. Modelo de datos mínimo (Supabase):** una tabla `movimientos_efectivo` con: id, user_id, fecha (date, default hoy), tipo ('entrada'/'salida'), monto (numeric), concepto (text, opcional), foto_url (text, opcional), created_at; RLS por user_id. Segunda tabla opcional para fase posterior: `cortes_caja` (fecha, fondo_inicial, total_entradas, total_salidas, efectivo_contado, diferencia) — pero lanzar primero solo con movimientos; el corte formal es fase 2 del módulo.

**3. Pantalla de captura móvil de una sola vista (HTML+VanillaJS):** teclado numérico propio en pantalla (botones grandes, formato $18,500 en vivo), toggle Entrada/Salida con Entrada preseleccionada, chips de conceptos frecuentes del propio usuario (query de sus últimos conceptos), fecha hoy editable, y dos botones de foto: "Tomar foto" (`<input accept="image/*" capture="environment">`) y "De galería" (mismo input sin capture). Ningún campo obligatorio excepto el monto. Guardar debe funcionar aunque la foto siga subiendo (subida en background; actualizar foto_url al terminar).

**4. Fotos: comprimir en cliente y bucket privado.** Comprimir con canvas a ~1200px / calidad 0.75 antes de subir (las fotos de notas pesan 3-8 MB; sin esto el usuario con datos móviles abandona). Bucket `comprobantes-efectivo` privado, path `{user_id}/{fecha}-{uuid}.jpg`, política RLS de Storage por carpeta de usuario, URLs firmadas para ver, y transformaciones de Supabase para thumbnails en el listado.

**5. Aprovechar la IA que ya existe:** reutilizar el pipeline de Edge Functions con visión que hoy lee PDFs para ofrecer (fase 2) "foto primero": el usuario fotografía las notas apiladas y la IA sugiere el total y el concepto; el usuario solo confirma. Es el patrón Expensify y sería un diferenciador fuerte en México.

**6. Vista "Hoy" con lenguaje de corte de caja:** en el dashboard, una tarjeta "Efectivo de hoy: entradas $X, salidas $Y, neto $Z" con las fotos como thumbnails. Usar el vocabulario del usuario ("corte", "notas", "fondo de caja"), nunca jerga contable ("arqueo", "conciliación"). Los movimientos de efectivo deben fluir a los reportes PDF/Excel y al resumen que ya existen, marcados con etiqueta "Efectivo" para distinguirlos de lo bancario.

**7. Detalles de adopción que deciden el éxito:** (a) promover instalación como PWA / atajo en pantalla de inicio para que el registro esté a 1 tap; (b) recordatorio opcional a la hora de cierre del negocio ("¿Ya registraste tu efectivo de hoy?") vía el calendario financiero existente; (c) permitir registrar días pasados fácilmente (el dueño a veces captura 2-3 días juntos); (d) soportar el registro del TOTAL del día, no obligar venta por venta; (e) considerar "salidas de caja" con los mismos 20 segundos (pagó al proveedor en efectivo de la caja — caso real diario).

**8. Advertencia de alcance:** no agregar en v1 apertura/cierre formal con fondo inicial, conteo físico y faltantes/sobrantes — eso sirve cuando hay empleados cajeros y agrega fricción al dueño que se autoadministra. Medir uso primero; si los usuarios registran a diario, el corte formal (comparar esperado vs contado) es la evolución natural.

---

## calendly

### Hallazgos
## 1. EL FLUJO EXACTO DE CALENDLY (anatomía del producto)

**A) Lado del dueño (setup, se hace UNA vez):**
1. Crea "Event Types" (tipos de evento): plantillas reutilizables de cita. Cada una define: nombre ("Consulta 30 min"), duración (15/30/45/60 min), ubicación (presencial, teléfono, videollamada), y color.
2. Define disponibilidad semanal recurrente: por día de la semana, rangos de horas (ej. Lun-Vie 9:00-14:00 y 16:00-19:00). Esto es un "horario", no fechas individuales.
3. Reglas finas (las que evitan el caos): buffer antes/después de cada cita (ej. 15 min), aviso mínimo (no permitir reservar con menos de X horas de anticipación), ventana máxima (solo próximos 30/60 días), incremento de inicio de slots (cada 15/30 min), límite de citas por día, y bloqueo de fechas específicas (vacaciones).
4. Obtiene un link público: calendly.com/usuario y calendly.com/usuario/evento.

**B) Lado del cliente (booking, 3 pantallas, <60 segundos, SIN crear cuenta):**
1. Abre el link → ve nombre/foto del negocio y lista de tipos de evento (o va directo a uno).
2. Ve un mini-calendario mensual con días disponibles resaltados → clic en día → columna de horarios libres (calculados: disponibilidad semanal − citas ya tomadas − buffers − aviso mínimo, en la zona horaria del cliente detectada automáticamente).
3. Clic en hora → formulario mínimo: nombre + email (+ campos custom como teléfono) → botón "Confirmar".
4. Pantalla de confirmación con detalles + email de confirmación a ambos + opciones de reagendar/cancelar vía link único.
5. Recordatorios automáticos por email/SMS (ej. 24h y 1h antes) — reducen no-shows dramáticamente.

**C) Lado del dueño (operación diaria):** la cita aparece en su calendario/dashboard automáticamente. No hace NADA. Ese es el producto: eliminar el ping-pong de "¿te queda el martes? no, ¿y el jueves?".

## 2. POR QUÉ CALENDLY TUVO TANTO ÉXITO

- **Loop viral estructural:** cada cita agendada expone el producto a otra persona. ~70% de sus registros vienen de invitados que recibieron un link. Escaló a $70M ARR con solo $550K de inversión semilla; hoy vale ~$3B con 20M+ usuarios (fuentes: openviewpartners.com/blog/how-calendly-harnesses-plg-and-virality-for-growth, elevationcapital.com/perspectives/insights/calendly-product-led-growth).
- **CAC casi cero:** el link público ES el marketing (en firma de email, WhatsApp, Instagram bio).
- **Cero fricción para el invitado:** no crea cuenta, no descarga nada. Regla de oro que hay que copiar.
- **Simplicidad obsesiva:** cada feature debía "acercar al usuario al valor más rápido o se cortaba".
- **Free tier que resuelve el problema completo** (1 tipo de evento gratis); se paga por avanzado, no por lo básico.

## 3. EL 20% DE FEATURES QUE DA EL 80% DEL VALOR

Imprescindibles (v1): (1) link público por usuario sin login para el cliente, (2) disponibilidad semanal recurrente, (3) cálculo de slots libres restando citas existentes, (4) formulario mínimo nombre+teléfono, (5) prevención de doble reserva, (6) confirmación inmediata, (7) aviso mínimo de anticipación, (8) el dueño ve/cancela sus citas.
Casi imprescindibles (v1.1): recordatorios, cancelar/reagendar por link único, bloquear días específicos, buffer entre citas.
NO necesarios en v1: sync con Google Calendar, múltiples tipos de evento, zonas horarias múltiples (México es casi todo UTC-6), pagos, equipos, videollamadas, SMS.

## 4. LO QUE ENSEÑAN LAS ALTERNATIVAS SIMPLES

- **TidyCal ($29 pago único, de AppSumo):** demuestra que un Calendly reducido (booking pages simples + tipos de evento + Google Cal) es un producto vendible por sí solo. Su éxito = precio simple + producto simple.
- **Koalendar:** su diferenciador es literalmente "setup más rápido y menos fricción que Calendly". Valida que el mercado premia lo mínimo bien hecho. Free plan con reservas ilimitadas.
- **Cal.com (open source, github.com/calcom/cal.com):** referencia de arquitectura visible: tablas EventType, Schedule (disponibilidad semanal por día con hora inicio/fin), Availability, Booking, y slug de usuario para la URL pública (cal.com/usuario). Es Next.js+Prisma — demasiado pesado para copiar código, pero su modelo de datos es el mapa a seguir.
- Patrón común de los 3: disponibilidad = filas (día_semana, hora_inicio, hora_fin) por usuario; citas = filas con timestamp inicio/fin; slots se calculan al vuelo, NUNCA se pre-generan filas de slots vacíos (antipatrón).

## 5. VIABILIDAD TÉCNICA EN VANILLA JS + SUPABASE (sin Google Calendar en v1) — TOTALMENTE VIABLE

**Modelo de datos mínimo (3 tablas):**
- `booking_pages`: user_id, slug único (para horizen.com.mx/agenda/joyeria-lopez o ?u=slug), nombre del negocio, duración de cita (min), aviso mínimo (horas), activo.
- `availability_rules`: user_id, day_of_week (0-6), start_time, end_time (tipo TIME). Varias filas por día permiten horario partido (típico en comercios mexicanos: 9-14 y 16-19).
- `appointments`: user_id, starts_at/ends_at (TIMESTAMPTZ), customer_name, customer_phone, status ('confirmed'/'cancelled'), cancel_token (uuid para link de cancelación).

**Prevención de doble reserva (crítico):** Postgres lo resuelve nativamente con EXCLUSION constraint + btree_gist: `EXCLUDE USING gist (user_id WITH =, tstzrange(starts_at, ends_at) WITH &&) WHERE (status = 'confirmed')`. Dos clientes que intentan el mismo slot al mismo tiempo → uno recibe error y la UI le pide elegir otra hora. Garantía a nivel base de datos, no de JavaScript (fuente: jsupskills.dev/how-to-solve-the-double-booking-problem).

**Cálculo de slots:** una función SQL (RPC de Supabase, SECURITY DEFINER) `get_available_slots(slug, fecha)` que toma las reglas del día de la semana, genera slots con generate_series, resta citas confirmadas y slots dentro del aviso mínimo, y devuelve la lista. El frontend público solo pinta.

**Punto delicado — seguridad RLS:** la página pública NO tiene sesión de Supabase Auth. Solución estándar: (a) lectura de disponibilidad y (b) creación de cita se hacen vía funciones RPC SECURITY DEFINER (o una Edge Function) que validan internamente, con RLS cerrado en las tablas para anon. Nunca dar INSERT directo a anon en appointments sin validación de que el slot es legítimo.

**Zona horaria:** v1 puede fijar America/Mexico_City para todos (México eliminó el horario de verano en 2022 en casi todo el país), lo que elimina la parte más difícil de Calendly.

**Sin Google Calendar en v1 — por qué está bien:** el público objetivo (joyerías, hoteles, comercios con clientes en efectivo) mayormente NO vive en Google Calendar; su "calendario" es una libreta o WhatsApp. El dashboard de citas dentro de Horizen ES su calendario. Calendly necesita sync porque su usuario es oficinista con agenda llena; el comerciante mexicano no.

**Encaje con Horizen:** las citas alimentan el calendario financiero ya existente, y una cita completada puede convertirse en "ingreso en efectivo esperado/registrado" — cerrando el ciclo agenda→ingreso que ningún Calendly ofrece. Esto es diferenciador real: para un negocio de efectivo, cada cita ES un ingreso futuro.

### Recomendaciones
## RECOMENDACIONES PARA HORIZEN

**1. Construir el "Calendly mínimo" en 3 tablas + 2 RPCs + 2 páginas — no más.**
- PASO 1 (Supabase SQL): tablas `booking_pages` (slug, duración, aviso mínimo), `availability_rules` (día de semana + hora inicio/fin, permitiendo horario partido 9-14/16-19), `appointments` (con customer_name y customer_phone, NO exigir email — el cliente mexicano de a pie da teléfono, no email). Activar extensión `btree_gist` y poner EXCLUSION constraint sobre (user_id, tstzrange) para que la doble reserva sea imposible a nivel BD.
- PASO 2 (RPCs SECURITY DEFINER): `get_public_page(slug)`, `get_available_slots(slug, fecha)` y `create_appointment(...)`. RLS cerrado para anon en las tablas; todo pasa por las funciones. No se necesita Edge Function en v1 si la validación vive en SQL.
- PASO 3 (Hostinger): una página pública `agenda.html?u=slug` (calendario del mes → horas del día → nombre+teléfono → confirmación) y una sección "Mi agenda" dentro del dashboard de Horizen (configurar horario semanal + ver/cancelar citas). Mantener el diseño premium morado #635bff — la página pública es un escaparate del negocio del usuario y de Horizen.

**2. Copiar las 3 reglas de UX que hicieron ganar a Calendly:**
- El cliente final NUNCA crea cuenta ni ve un login.
- Máximo 3 pantallas para reservar (día → hora → nombre/teléfono).
- Confirmación instantánea y clara ("Tu cita: martes 8 de julio, 11:00, Joyería López") con link único de cancelación (uuid token), sin pedir nada más.

**3. Explotar el loop viral de Calendly a favor de Horizen:** en el pie de la página pública de reservas poner "Agenda creada con Horizen" con link. Cada cliente que reserva en una joyería ve la marca — es el mismo mecanismo que le dio a Calendly el 70% de sus registros con costo de adquisición casi cero. Para negocios mexicanos, el canal de distribución del link será WhatsApp e Instagram bio, no firmas de email: hacer el link corto y fácil de dictar.

**4. Dejar FUERA de v1 (y decirlo explícitamente para no caer en la tentación):** Google Calendar sync, múltiples tipos de evento, zonas horarias (fijar America/Mexico_City), pagos en la reserva, SMS, buffers configurables. v1.1: bloquear fechas específicas (vacaciones) y recordatorios. Los recordatorios v1.1 pueden ser un botón "Recordar por WhatsApp" que abre wa.me/52<teléfono> con mensaje pre-escrito — cero costo, cero API, y WhatsApp es donde vive el cliente mexicano; SMS/email automático puede venir después con pg_cron + Edge Function.

**5. Diferenciarse donde Calendly no puede — conectar cita con dinero:** al marcar una cita como "completada", ofrecer registrarla como ingreso (en efectivo) en el módulo de ingresos existente, y mostrar las citas próximas en el calendario financiero como ingresos esperados. Para una joyería o un hotel, la agenda es literalmente su pipeline de efectivo — esa integración convierte una feature genérica en inteligencia financiera, que es la tesis de Horizen.

**6. Advertencias antes de que fallen:**
- Sin la EXCLUSION constraint, dos clientes pueden ganar el mismo slot; no confiar en validación de JavaScript.
- La página pública debe manejar el error de slot tomado con gracia: "Esa hora se acaba de ocupar, elige otra" y refrescar slots.
- Proteger `create_appointment` contra spam básico (límite de citas pendientes por teléfono/por día dentro del RPC), porque es un endpoint abierto al público.
- El slug debe validarse (minúsculas, sin espacios, único) al crearlo, o los links compartidos por WhatsApp se romperán.

**7. Checklist de verificación (PASO 4):** crear página con slug de prueba → definir horario Lun-Vie 10-14 → abrir link en incógnito (sin sesión) → ver solo slots válidos futuros → reservar con nombre y teléfono → ver confirmación → intentar reservar el mismo slot en otra pestaña y confirmar que lo rechaza → verificar que la cita aparece en el dashboard y que cancelar desde el link del cliente libera el slot.

---

## crm-clientes

### Hallazgos
## 1. Qué campos tiene la ficha mínima de cliente en cada app

**Fresha (salones/spas, la referencia de UX en el sector):**
- Campos al crear: solo nombre + teléfono O email (uno de los dos basta). Todo lo demás es opcional y se llena después: fecha de nacimiento, género, pronombres, idioma preferido, "client source" (cómo te conoció), ocupación, nacionalidad.
- La vista de perfil muestra un "snapshot": datos de contacto, **gasto total acumulado**, reseñas, y pestañas de Appointments / Sales / Items (historial completo de citas y compras).
- Notas internas por cliente (no visibles al cliente): fórmulas de color, preferencias. Persisten en el perfil y aplican a todas las citas futuras. Permite adjuntar fotos y documentos al perfil.
- Recordatorios automáticos por **WhatsApp con fallback a SMS** (toggle "intenta WhatsApp primero, si falla manda SMS"). Fuente: fresha.com/help-center (artículos 50, 56, 204, 207, 130, 167).

**Booksy:**
- Ficha: contacto, cumpleaños, notas privadas + fotos ("el nombre de la mascota del cliente", fórmulas), historial de reservas y transacciones.
- Lo distintivo: **quick stats por cliente** — número de visitas, tasa de cancelación/no-show, dinero gastado total. Sirve para identificar mejores clientes y clientes problemáticos. Toggle para bloquear a un cliente de reservar.
- Protección anti no-show: tarjeta guardada + cobro de cuota de cancelación. Fuente: biz.booksy.com/en-us/features/client-management.

**Square Appointments:**
- Default al reservar: nombre, apellido, teléfono, email. Permite máximo **5 campos custom** ("cosas que se preguntan una sola vez": cumpleaños, alergias) — deliberadamente limitado para no crear formularios eternos.
- El perfil dentro del calendario muestra 3 cosas: Client Notes, Card on File, Appointment History. La transacción (pago) queda ligada a la cita y al cliente automáticamente porque agenda y POS son el mismo sistema. Grupos y filtros en el directorio. Fuente: squareup.com/help (artículos 6439, 8271, 6147).

**HubSpot free:**
- Contacto con propiedades default (nombre, email, teléfono, empresa, owner, lifecycle stage) + objetos asociados: Deals (monto + etapa), Notes, Tasks. WhatsApp solo como mensaje "loggeado" manualmente. Es el modelo correcto (contacto ↔ deal ↔ actividad) pero con demasiada estructura para un dueño de joyería: cientos de propiedades posibles, jerga de "pipeline/lifecycle". Fuente: knowledge.hubspot.com/properties/hubspots-default-contact-properties.

**Plantillas CRM de Notion (lo que la gente arma cuando quiere lo MÍNIMO):**
- La versión mínima que se repite en todas las plantillas: **Nombre, Etapa (Lead/Cotizado/Activo/Cerrado), Valor del trato ($), Teléfono/Email, Próxima acción con fecha, Notas.** Vistas: tabla de todos, Kanban por etapa, "seguimientos de esta semana". Fuente: notion.com/help/guides/simple-crm..., zapier.com/blog/notion-crm.

## 2. Cómo ligan cliente ↔ cita ↔ cobro
Patrón universal: el **cliente es el registro maestro**; la cita apunta al cliente; el cobro apunta a la cita (o directo al cliente si es venta sin cita). De ahí se derivan automáticamente los números que el dueño sí mira: gasto total, número de visitas, última visita, próxima cita, saldo pendiente. En Square esto funciona porque agenda y cobro viven en el mismo sistema; en Fresha el perfil junta pestañas de citas y ventas; en Booksy alimenta los "quick stats". Nadie pide capturar esos números a mano: **se calculan**.

## 3. Qué hace que un dueño NO técnico sí lo use
- **Captura en <10 segundos**: 2 campos obligatorios máximo (nombre + teléfono). Fresha y Square lo hacen así. Los estudios de adopción de CRM coinciden: ~50-55% de implementaciones fallan, y la causa #1 es fricción de captura — "cada campo obligatorio es una caseta de cobro" y el usuario regresa a su libreta/Excel (heydan.ai, syncmatters.com).
- **El sistema le regresa valor inmediato**: ver "este cliente ha gastado $48,000 conmigo" o "no ha venido en 4 meses" sin capturar nada extra.
- **WhatsApp como canal nativo**: en México el negocio YA opera por WhatsApp (agendar, cobrar, mandar CLABE — WhatsApp incluso agregó compartir CLABE para negocios mexicanos; marketing4ecommerce.mx, eluniversal.com.mx). Un link `wa.me/52XXXXXXXXXX?text=...` no cuesta nada y elimina el copy-paste del teléfono.
- **Cero jerga CRM**: "Clientes", "Cita", "Cotización", "Pagó / Debe" — no "leads", "pipeline", "lifecycle stage".
- **Notas libres + fotos** le ganan a campos estructurados: el joyero apunta "anillo 14k, talla 6, le gusta oro rosa" y el hotelero "siempre pide habitación con vista".

### Recomendaciones
## Ficha de cliente ideal para Horizen (joyería/hotel/servicio mexicano)

### A. Captura rápida (el formulario de alta = 10 segundos)
Solo 2 campos obligatorios: **Nombre** y **Teléfono (10 dígitos, se asume +52)**. Opcionales colapsados: email, etiqueta de tipo (Frecuente/Nuevo/VIP), cómo te conoció. Botón grande "+ Cliente" accesible desde cualquier pantalla. Si el teléfono ya existe, sugerir el cliente existente (evita duplicados).

### B. La ficha (vista de detalle) — estructura en 4 bloques
1. **Encabezado**: nombre, etiqueta VIP/Frecuente, y DOS botones grandes: 📱 **WhatsApp** (link `https://wa.me/52{telefono}?text={mensaje}` con plantillas: recordatorio de cita, cobro pendiente con monto, "tu pedido está listo") y 📞 Llamar (`tel:`). Esto es lo que más usará.
2. **Números automáticos (nunca capturados a mano)**: Total que ha gastado · Le debe / saldo pendiente · Visitas totales · Última visita · **Próxima cita** (ligada al calendario financiero que Horizen ya tiene).
3. **Trato actual**: Cotización/pedido abierto con monto estimado y estado simple: `Cotizado → Apartado (anticipo) → Entregado → Pagado`. Clave para joyería mexicana: **soportar anticipos y abonos en efectivo** (el "apartado" es cultura de negocio mexicana). Cada abono es un ingreso que alimenta los reportes existentes de Horizen.
4. **Notas + historial**: nota libre siempre visible arriba (talla, preferencias, "habitación con vista") + timeline de citas, abonos y ventas. Foto opcional (Supabase Storage ya disponible).

### C. Modelo de datos (Supabase — PASO 1 cuando lo implementes)
```
clientes(id, user_id, nombre, telefono, email, etiqueta, notas, foto_url, creado_en)
citas(id, user_id, cliente_id FK, fecha, titulo, monto_estimado, estado)
tratos(id, user_id, cliente_id FK, descripcion, monto_cotizado, estado, creado_en)
pagos(id, user_id, cliente_id FK, cita_id FK null, trato_id FK null, monto, metodo ['efectivo','transferencia','tarjeta'], fecha)
```
Gasto total, saldo pendiente y última visita = vistas/queries agregadas, no columnas. `pagos.metodo='efectivo'` conecta con el hueco actual de Horizen: ingresos en efectivo que nunca aparecen en el estado de cuenta PDF.

### D. Principios de adopción (lo que decide si lo usan o lo abandonan)
1. Máximo 2 campos obligatorios, siempre. Todo lo demás opcional y colapsado.
2. Vocabulario mexicano de negocio: Clientes, Cita, Cotización, Apartado, Abono, Debe/Pagó. Cero jerga CRM.
3. El botón de WhatsApp con mensaje pre-escrito (incluyendo monto de cobro) es la killer feature: convierte la ficha en herramienta de cobranza, no en base de datos muerta.
4. Lista de clientes ordenable por "me deben" y "no han venido en X tiempo" — eso da valor sin capturar nada.
5. Integración con lo existente: cada abono registrado = ingreso manual en los reportes actuales; cada cita = evento en el calendario financiero. No construir un módulo aislado.
6. Fase 2 de tu metodología: probar primero solo clientes + WhatsApp + abonos en efectivo con un usuario real (tu joyería) antes de citas recurrentes, recordatorios automáticos o WhatsApp API (esta última cuesta dinero y requiere Meta Business; el link wa.me es gratis y suficiente para arrancar).

Fuentes principales: help centers de Fresha (fresha.com/help-center/knowledge-base/clients), Booksy (biz.booksy.com/en-us/features/client-management), Square (squareup.com/help/us/en/article/6439 y 8271), HubSpot (knowledge.hubspot.com/properties/hubspots-default-contact-properties), guías de CRM en Notion (notion.com/help/guides, zapier.com/blog/notion-crm), estudios de adopción CRM (syncmatters.com, heydan.ai) y contexto WhatsApp-México (marketing4ecommerce.mx/whatsapp-negocios-mexico-clabe).

---

## gastos-recurrentes

### Hallazgos
## Cómo detectan gastos fijos/suscripciones las mejores apps

### 1. Rocket Money (el estándar de la industria en detección)
- Analiza transacciones de cuentas conectadas y decide si algo es recurrente combinando: **nombre del cargo, nombre del comercio, frecuencia y monto** (según su Help Center oficial).
- Detecta trials que se convirtieron en pago, cargos anuales olvidados y servicios duplicados.
- Limitación reconocida: si un cargo no aparece en ~1 mes, lo mueve a una lista de "Inactivos" en vez de borrarlo — patrón útil: nunca eliminar, solo archivar.
- Presenta todo en una pantalla "Recurring" ordenable por frecuencia/monto, con próximo cobro estimado y total mensual arriba.

### 2. Copilot Money
- En el onboarding detecta "likely recurrings" y los presenta en un **flujo de revisión uno por uno** (confirmar / rechazar), organizados en vista mensual de calendario.
- Su mecanismo interno son **filtros por recurrente**: "transacciones llamadas Spotify, de $9 a $10, alrededor del día 23 de cada mes". Es decir: nombre + **rango de monto** + **ventana de fecha**. El usuario puede editar esos filtros — esto resuelve el caso de dos suscripciones del mismo comercio con montos distintos.
- Estima la frecuencia a partir de las transacciones seleccionadas; el usuario puede corregirla.

### 3. Monarch Money
- Tiene un **"Recurring Review flow"**: cada vez que sincroniza transacciones nuevas, escanea y propone candidatos; NADA se marca como recurrente sin aprobación del usuario. En la revisión puedes: confirmar, marcar "este comercio no es recurrente" (lista negra), o **editar monto, frecuencia y fecha** antes de aceptar.
- Ellos mismos admiten que la detección automática atrapa ~**80%** de los recurrentes y falla cuando el monto o la fecha varían mucho (ej. luz/agua) — por eso el flujo manual de "marcar como recurrente" desde cualquier transacción es obligatorio como complemento.
- Detecta también ingresos recurrentes (nómina) y transferencias programadas, no solo gastos.

### 4. YNAB
- **No detecta automáticamente**: usa "Scheduled Transactions" creadas a mano por el usuario (filosofía de presupuesto manual). Confirma que la detección automática es un diferenciador, no un commodity — y que el flujo manual siempre debe existir.

### 5. Plaid (la referencia técnica más explícita — su producto Recurring Transactions es lo que usan muchas apps por debajo)
- Modela cada recurrente como un **"stream"**: comercio + categoría + frecuencia + monto promedio + último monto + fecha estimada del próximo cargo + status.
- Frecuencias que clasifica: WEEKLY, BIWEEKLY, **SEMI_MONTHLY** (quincenal — clave para México), MONTHLY, ANNUALLY.
- Recomienda **≥180 días de historial** para buenos resultados.
- Regla de madurez: un stream es confiable con **≥3 ocurrencias**; con 2 lo marca como `early_detection` (candidato tentativo). Este es el umbral de la industria: 2 ocurrencias = "posible", 3+ = "confirmado".

### El algoritmo típico consolidado (lo que todas hacen en esencia)
1. **Normalizar la descripción** del comercio (quitar folios, fechas, RFC, números de autorización, sufijos de terminal). La calidad de esta normalización importa más que el algoritmo — es el punto que más citan los proveedores (Finexer, Plaid): "es un problema de calidad de datos antes que de algoritmo".
2. **Agrupar** transacciones por comercio normalizado (a veces + rango de monto para separar 2 suscripciones del mismo comercio).
3. Por grupo con ≥2-3 cargos: calcular **intervalos entre fechas consecutivas** y ver si la mediana cae cerca de una cadencia conocida (7, 14, 15, 30, 60, 90, 365 días) con tolerancia de ±3-4 días (más laxa en anual).
4. Validar **estabilidad del monto**: coeficiente de variación bajo (≤~15-20%) o todos los montos dentro de ±% del mediano. Utilidades (luz, agua, teléfono) se detectan por cadencia aunque el monto varíe — se marcan como "monto variable".
5. Asignar **score de confianza** combinando: nº de ocurrencias, regularidad de intervalos, estabilidad de monto y prior de categoría.
6. **Prior por categoría**: renta, hipoteca, software/SaaS, seguros, nómina, internet/teléfono, colegiaturas, streaming y gimnasio son casi siempre fijos → bajan el umbral de evidencia necesario. Restaurantes, gasolina, súper casi nunca → suben el umbral.

### UX de presentación (patrones comunes)
- Banner/resumen agregado: "Detectamos 7 gastos fijos por $12,400/mes" con CTA "Revisar".
- Revisión tipo tarjetas, una por sugerencia: logo/nombre, monto típico, frecuencia detectada ("Mensual, ~día 15"), últimas 3 fechas como evidencia, y 3 acciones: **Confirmar / No es fijo / Editar** (monto, frecuencia, categoría).
- "No es fijo" alimenta una lista negra por comercio para no volver a sugerirlo.
- Después de confirmar: total mensual de fijos, calendario de próximos cargos, alerta cuando un cargo esperado no llega o sube de precio (Rocket Money notifica aumentos de precio — feature muy valorada).
- Nada se activa sin confirmación explícita del usuario (Monarch/Copilot): la detección propone, el usuario dispone.

### Recomendaciones
## Recomendaciones para Horizen

### A. Decisiones de diseño (adaptadas a México y a tu usuario)
1. **Detectar quincenal como ciudadano de primera clase** (15 días y también "día 15 y último de mes"): nóminas, rentas y abonos en México son quincenales. Plaid lo llama SEMI_MONTHLY; casi ninguna app gringa lo prioriza — es tu ventaja local.
2. **Normalización pensada para estados de cuenta mexicanos**: quitar prefijos como "PAGO CUENTA DE TERCERO", "SPEI ENVIADO/RECIBIDO", "DOMICILIACION", "CARGO RECURRENTE", "PAGO INTERBANCARIO", folios, RFC, claves de rastreo y fechas embebidas.
3. **Nunca activar sin confirmar**: flujo tipo Monarch — Horizen propone, el dueño confirma/rechaza/edita. Al confirmar, se inserta en tu tabla existente de gastos fijos manuales (no dupliques modelo de datos).
4. **Efectivo**: la detección solo cubre lo que pasa por el banco. Muestra un aviso: "Estos son los fijos que vimos en tu banco; si pagas renta o sueldos en efectivo, agrégalos aquí" con acceso directo al alta manual.
5. Umbrales estándar de la industria: **3+ ocurrencias = confirmado, 2 = tentativo** ("posible gasto fijo"); pide ≥90 días de historial (ideal 180) — es decir, mínimo 3 estados de cuenta subidos. Si el usuario solo ha subido 1-2 PDFs, muestra "Sube otro estado de cuenta para detectar tus gastos fijos automáticamente".
6. Copia del banner: **"Detectamos 7 gastos fijos por $12,400/mes — Revisar"**. Tras confirmar: total mensual, próximos cargos en tu calendario financiero ya existente, y alerta si un fijo sube >10% o no llega en su fecha.

### B. Algoritmo exacto en JS (corre en el navegador sobre `transactions` de Supabase)

```js
// ============ 1. NORMALIZAR DESCRIPCIÓN ============
function normalizarDescripcion(desc) {
  let s = (desc || '').toUpperCase();
  // Prefijos bancarios mexicanos
  s = s.replace(/\b(SPEI (ENVIADO|RECIBIDO)|PAGO CUENTA DE TERCERO|TRANSF(ERENCIA)? INTERBANCARIA|DOMICILIACION|CARGO (RECURRENTE|AUTOMATICO)|COMPRA (EN|CON) (TARJETA|TDC|TDD)|PAGO INTERBANCARIO|RETIRO SIN TARJETA)\b/g, ' ');
  s = s.replace(/\b\d{2}[\/\-]\d{2}([\/\-]\d{2,4})?\b/g, ' ');   // fechas embebidas
  s = s.replace(/\b[A-Z]{3,4}\d{6}[A-Z0-9]{0,7}\b/g, ' ');       // RFC
  s = s.replace(/\b\d{5,}\b/g, ' ');                              // folios, claves rastreo, autorizaciones
  s = s.replace(/\b(REF|FOLIO|AUT|CLAVE|SUC|TER)\.?:?\s*\S+/g, ' ');
  s = s.replace(/[^A-ZÑ ]/g, ' ').replace(/\s+/g, ' ').trim();
  return s.split(' ').slice(0, 4).join(' ');                      // primeras 4 palabras = firma del comercio
}

// ============ 2. PRIORS POR CATEGORÍA ============
const CATEGORIAS_CASI_SIEMPRE_FIJAS = ['renta','hipoteca','software','suscripciones','seguros','nomina','sueldos','internet','telefono','colegiaturas','streaming','gimnasio','contabilidad'];
const CATEGORIAS_CASI_NUNCA_FIJAS  = ['restaurantes','gasolina','supermercado','entretenimiento','viajes','compras'];

// ============ 3. CADENCIAS (quincenal incluida) ============
const CADENCIAS = [
  { nombre: 'semanal',    dias: 7,   tol: 2 },
  { nombre: 'quincenal',  dias: 15,  tol: 3 },  // cubre 14 (bisemanal) y 15/16 (quincena mexicana)
  { nombre: 'mensual',    dias: 30,  tol: 4 },
  { nombre: 'bimestral',  dias: 61,  tol: 6 },  // CFE cobra bimestral
  { nombre: 'trimestral', dias: 91,  tol: 8 },
  { nombre: 'anual',      dias: 365, tol: 15 },
];

const mediana = a => { const s = [...a].sort((x,y)=>x-y), m = s.length>>1; return s.length%2 ? s[m] : (s[m-1]+s[m])/2; };

// ============ 4. DETECTOR PRINCIPAL ============
// txs: [{ id, date, description, amount, category }] — solo egresos (amount < 0 o type='expense')
function detectarGastosFijos(txs) {
  // Agrupar por firma normalizada
  const grupos = {};
  for (const t of txs) {
    const k = normalizarDescripcion(t.description);
    if (k.length < 3) continue;
    (grupos[k] ||= []).push(t);
  }

  const sugerencias = [];
  for (const [firma, lista] of Object.entries(grupos)) {
    if (lista.length < 2) continue;
    lista.sort((a,b) => new Date(a.date) - new Date(b.date));

    // Sub-agrupar por banda de monto (mismo comercio, 2 suscripciones distintas — patrón Copilot)
    const bandas = [];
    for (const t of lista) {
      const m = Math.abs(t.amount);
      const banda = bandas.find(b => Math.abs(m - b.montoMediano) / b.montoMediano <= 0.25);
      if (banda) { banda.txs.push(t); banda.montoMediano = mediana(banda.txs.map(x=>Math.abs(x.amount))); }
      else bandas.push({ montoMediano: m, txs: [t] });
    }

    for (const banda of bandas) {
      const b = banda.txs;
      if (b.length < 2) continue;
      const fechas = b.map(t => new Date(t.date).getTime());
      const intervalos = fechas.slice(1).map((f,i) => (f - fechas[i]) / 86400000);
      const medInt = mediana(intervalos);

      const cad = CADENCIAS.find(c => Math.abs(medInt - c.dias) <= c.tol);
      if (!cad) continue;
      // Regularidad: % de intervalos dentro de tolerancia de la cadencia
      const regularidad = intervalos.filter(i => Math.abs(i - cad.dias) <= cad.tol).length / intervalos.length;
      if (regularidad < 0.6) continue;

      // Estabilidad de monto (coef. de variación)
      const montos = b.map(t => Math.abs(t.amount));
      const prom = montos.reduce((a,x)=>a+x,0) / montos.length;
      const cv = Math.sqrt(montos.reduce((a,x)=>a+(x-prom)**2,0)/montos.length) / prom;

      const categoria = (b[b.length-1].category || '').toLowerCase();
      const priorFija  = CATEGORIAS_CASI_SIEMPRE_FIJAS.some(c => categoria.includes(c));
      const priorNoFija = CATEGORIAS_CASI_NUNCA_FIJAS.some(c => categoria.includes(c));

      // Score 0-100
      let score = 0;
      score += Math.min(b.length, 6) * 10;          // ocurrencias (máx 60)
      score += regularidad * 20;                      // cadencia (máx 20)
      score += cv <= 0.05 ? 20 : cv <= 0.15 ? 12 : cv <= 0.30 ? 5 : 0; // monto (máx 20)
      if (priorFija) score += 15;
      if (priorNoFija) score -= 20;
      if (b.length === 2) score -= 15;                // tentativo estilo Plaid early_detection

      if (score < 45) continue;                       // umbral de sugerencia
      if (cv > 0.30 && !priorFija) continue;          // monto muy variable sin prior → descartar

      const ultima = new Date(fechas[fechas.length-1]);
      sugerencias.push({
        firma,
        nombreSugerido: firma.split(' ').map(w => w[0]+w.slice(1).toLowerCase()).join(' '),
        montoTipico: Math.round(mediana(montos) * 100) / 100,
        montoVariable: cv > 0.15,                     // luz/agua: "monto variable"
        frecuencia: cad.nombre,
        diaTipico: mediana(b.map(t => new Date(t.date).getDate())),
        proximoCargo: new Date(ultima.getTime() + cad.dias * 86400000).toISOString().slice(0,10),
        ocurrencias: b.length,
        confianza: Math.min(Math.round(score), 100),
        estado: b.length >= 3 ? 'confirmado' : 'tentativo',
        categoria: b[b.length-1].category,
        evidencia: b.slice(-3).map(t => ({ id: t.id, date: t.date, amount: t.amount })),
      });
    }
  }
  return sugerencias.sort((a,b) => b.confianza - a.confianza);
}
```

### C. Piezas de Supabase necesarias (siguiendo tu Regla #1)
- **SQL**: tabla `recurring_suggestions` (user_id, firma, monto_tipico, frecuencia, proximo_cargo, confianza, status: 'pendiente'|'confirmado'|'rechazado', evidence jsonb, created_at) con RLS por user_id, y columna/tabla de lista negra (`firma` rechazada) para no re-sugerir. Al confirmar → INSERT en tu tabla actual de gastos fijos + status='confirmado'.
- **Dónde correr**: en el frontend tras cada carga de PDF (los volúmenes de un negocio chico son de cientos de transacciones — JS en navegador aguanta de sobra; no necesitas Edge Function todavía). Query: `select id, date, description, amount, category from transactions where user_id = X and amount < 0 and date >= now() - interval '180 days'`.
- **UX**: banner en el resumen "Detectamos N gastos fijos por $X/mes — Revisar" → modal con tarjetas (nombre, monto, "Mensual · ~día 15", últimas 3 fechas como evidencia) y botones **Confirmar / No es fijo / Editar**. Badge "Monto variable" para luz/agua y "Tentativo — visto 2 veces" para los de 2 ocurrencias.
- **Qué puede salir mal (avisado antes)**: (1) descripciones de BBVA/Banorte/Santander difieren mucho — prueba `normalizarDescripcion` con estados de cuenta reales de tus 3 bancos principales antes de lanzar; (2) pagos duplicados el mismo día rompen intervalos — deduplica cargos con misma firma+monto+fecha; (3) meses de 28-31 días: la tolerancia ±4 del mensual ya lo cubre, no uses igualdad exacta de día.

Fuentes: [Rocket Money Help Center](https://help.rocketmoney.com/en/articles/2185531-managing-your-bills-and-subscriptions), [Rocket Money — missing subscriptions](https://help.rocketmoney.com/en/articles/934383-missing-subscriptions), [Copilot — Creating Recurrings](https://help.copilot.money/en/articles/3760068-creating-recurrings), [Copilot — Optimizing Recurrings](https://help.copilot.money/en/articles/3783499-optimizing-recurrings), [Monarch — Tracking Recurring Expenses](https://help.monarch.com/hc/en-us/articles/4890751141908-Tracking-Recurring-Expenses-and-Bills), [Plaid Transactions API](https://plaid.com/docs/api/products/transactions/), [Plaid — Recurring Transactions blog](https://plaid.com/blog/recurring-transactions/), [Finexer — Recurring Transaction Detection](https://blog.finexer.com/recurring-transaction-detection-bank-data-apis/).

---

## estado-resultados

### Hallazgos
## 1. Estructura correcta del Estado de Resultados (México, NIF B-3)

La norma mexicana aplicable es la NIF B-3 "Estado de resultado integral" (CINIF). Para un negocio pequeño comercial (joyería, hotel, comercio) la presentación estándar "por función" — la que todo contador mexicano reconoce — es:

```
   Ventas netas (banco + efectivo, menos devoluciones/descuentos)
 − Costo de ventas (mercancía vendida)
 = UTILIDAD BRUTA                        → margen bruto %
 − Gastos de operación (venta + administración)
 = UTILIDAD DE OPERACIÓN                 → margen operativo %
 − Resultado integral de financiamiento (intereses, comisiones bancarias)
 = Utilidad antes de impuestos
 − Impuestos a la utilidad (ISR)
 = UTILIDAD NETA                         → margen neto %
```

Puntos clave de NIF B-3: (a) permite clasificar costos/gastos por función, por naturaleza o mixto — para comercio se usa "por función" con costo de ventas separado; (b) la línea "utilidad de operación" no es obligatoria pero es práctica común y aceptada; (c) el IVA NUNCA es ingreso ni gasto (es impuesto trasladado); solo el ISR va como "impuestos a la utilidad". Fuentes: Banxico NIF B-3 (banxico.org.mx/marco-normativo), blog CONTPAQi "Estado de resultados: qué es y cómo hacerlo".

**Matiz de validez crítico para Horizen:** un estado construido desde movimientos bancarios/efectivo es "base efectivo" (flujo), no devengado. En comercio, "compras de mercancía" ≠ "costo de ventas" contable (falta inventario). Es 100% válido como reporte GERENCIAL si se etiqueta honesto: "Estado de resultados (base efectivo) — reporte gerencial" y la línea se llama "Costo de mercancía (compras del mes)". Los contadores lo aceptan así; lo que no perdonan es que se presente como contabilidad fiscal.

## 2. Cómo lo muestran QuickBooks / CONTPAQi / Bind

- **QuickBooks Online (Profit & Loss):** Income → Cost of Goods Sold → Gross Profit → Expenses (lista por categoría) → Net Operating Income → Other Income/Other Expenses → Net Income. Su reporte "Profit and Loss Comparison" agrega columnas: período anterior, cambio en $ y cambio en %, y opción "% of Income" junto a cada línea. Colapsable por categoría.
- **Bind ERP (mexicano):** 4 secciones — Ingresos, Costos, Gastos, Resultado Integral de Financiamiento. Comparativos: mensual, trimestral, anual, mensual vs año anterior, hasta 12 meses en columnas. Exporta PDF, Excel y CSV detallado (ayuda.bind.com.mx, artículo 115006100748).
- **CONTPAQi:** estado de resultados clásico NIF B-3 desde la balanza contable: ventas − costo = utilidad bruta − gastos generales = utilidad de operación − RIF = antes de impuestos = neta, con comparativo entre períodos.

**Cómo simplificar sin perder validez:** conservar el ESQUELETO de subtotales (bruta → operación → neta) porque es lo que le da validez ante el contador, y simplificar solo el interior: (1) etiquetas en lenguaje llano con subtítulo explicativo ("Utilidad bruta — lo que te queda después de pagar la mercancía"); (2) mostrar % sobre ventas junto a cada línea (regla práctica pyme: margen neto 5% bajo, 10% promedio, 20% bueno — blog.alegra.com); (3) mostrar solo categorías con movimiento y agrupar menores en "Otros"; (4) fusionar "antes de impuestos" con neta si el usuario no registra ISR (línea opcional).

## 3. Mapeo de categorías existentes de Horizen

Categorías reales verificadas en /Users/eduardozayas/financialos-app/dashboard.html (líneas 3239–3250, `_PREDEFINED_CATS` y `_CAT_GROUPS`):

| Línea del estado | Categorías Horizen |
|---|---|
| **Ventas** | Ventas (transacciones banco) + ingresos manuales de negocio (income_sources tipo "negocio") + ventas en efectivo |
| **(−) Costo de mercancía** | Mercancía, Proveedores |
| **(−) Gastos de operación** | Nómina, Renta, Publicidad, Software, Papelería, Contabilidad, Servicios, Honorarios, Envíos, Viajes + gastos fijos manuales marcados como de negocio |
| **(−) Financieros (RIF)** | Comisiones (bancarias) + intereses de `debts` |
| **(−) Impuestos** | SAT/Impuestos (con advertencia: si el pago incluye IVA, no es gasto real) |
| **EXCLUIR siempre** | Transferencia, Pago TDC, Inversiones (movimientos entre cuentas propias/capital — incluirlos duplica o distorsiona) |
| **Fuera del estado (personal)** | Comida, Café, Supermercado, Farmacia, Salud, Entretenimiento, Ropa, Transporte, Educación → mostrar aparte como "Retiros personales" informativo |

Riesgos detectados: (a) doble conteo si el usuario sube estado de cuenta bancario (con "Pago TDC") Y estado de la tarjeta (con los gastos individuales) — excluir "Pago TDC" resuelve; (b) "Envíos" es ambiguo (flete de compra = costo; envío a cliente = gasto) — dejarlo en gastos por default con opción de mover; (c) el grupo `_CAT_GROUPS['Negocios']` ya existe y es la base natural del filtro negocio vs personal; (d) las categorías personalizadas (`_customCats`) necesitan asignarse a una línea del estado (heredar de su grupo: Negocios→gasto operativo por default).

## 4. Efectivo y comparativo

Gran parte del ingreso de estos usuarios es efectivo no bancarizado: el estado DEBE mostrar "Ventas banco" y "Ventas efectivo" como sublíneas de Ventas, si no, la utilidad bruta sale negativa y el reporte pierde credibilidad ante el dueño. Hoy Horizen solo tiene ingresos manuales recurrentes (income_sources) — falta captura rápida de venta en efectivo del día/mes. Para el comparativo, el patrón de la industria (QuickBooks Comparison, Bind mensual vs anterior) es: columnas [Mes actual | % de ventas | Mes anterior | Δ $ | Δ %], con semáforo de color invertido para gastos (gasto que sube = rojo). El dashboard ya usa jsPDF + autoTable (dashboard.html línea ~4295) para reportes PDF, reutilizable para el export.

### Recomendaciones
## Recomendaciones accionables para Horizen

**1. Estructura de la vista "Estado de resultados" (5 bloques, lenguaje llano + término formal):**
- "💰 Lo que vendiste (Ventas)" — sublíneas: Banco / Efectivo
- "📦 Lo que te costó la mercancía (Costo de ventas)" → **Utilidad bruta** con margen %
- "🏢 Lo que cuesta operar (Gastos de operación)" — desglose por categoría, colapsable → **Utilidad de operación** con margen %
- "🏦 Bancos e impuestos (Comisiones, intereses, SAT)" → **Utilidad neta** con margen % y frase resumen: "De cada $100 que vendiste, te quedaron $X"
- Bloque informativo aparte, fuera del cálculo: "Retiros personales" (categorías de los grupos Comida/Hogar/Personal)

**2. Motor de mapeo:** crear un mapa fijo categoría→línea en JS (ventas / costo / gasto_operativo / financiero / impuestos / excluir / personal) siguiendo la tabla de hallazgos, con tabla opcional en Supabase (`category_pnl_map`: user_id, category, pnl_line) para que el usuario mueva categorías (caso "Envíos"). Categorías personalizadas heredan por grupo: Negocios→gasto_operativo. Excluir SIEMPRE Transferencia, Pago TDC e Inversiones para evitar doble conteo.

**3. Captura de efectivo:** agregar botón "Registrar venta en efectivo" (monto + fecha, un solo tap) que inserte en `transactions` con category='Ventas' y una marca de origen efectivo (p.ej. columna `source='efectivo'`). Sin esto el estado saldrá en pérdida para joyerías/comercios que cobran cash y el feature fracasa.

**4. Comparativo mensual:** selector de mes + columnas [Mes actual | % de ventas | Mes anterior | Δ%] con flechas de color y lógica invertida en gastos. Fase 2 opcional: 3–6 meses en columnas estilo Bind.

**5. Export PDF para el contador:** reutilizar el jsPDF+autoTable existente. El PDF usa los términos formales (Ventas netas, Costo de ventas, Utilidad bruta, Gastos de operación, Utilidad de operación, Utilidad neta), incluye período, desglose por categoría, comparativo y pie obligatorio: "Reporte gerencial elaborado sobre base de flujo de efectivo. No sustituye la contabilidad fiscal." Ese pie es lo que hace el reporte defendible ante cualquier contador.

**6. Advertencias en producto (anticipar problemas):** (a) tooltip en SAT/Impuestos: "los pagos de IVA no son gasto de tu negocio, son impuesto que cobras por cuenta del SAT"; (b) si detectas categoría 'Pago TDC' junto con estado de cuenta de TDC subido, avisar que ya está excluido para no duplicar; (c) si Ventas=0 en el mes con gastos>0, sugerir registrar ventas en efectivo en lugar de mostrar pérdida alarmante.

**7. Orden de construcción (metodología de fases del proyecto):** primero el motor de mapeo con datos ya existentes y la vista cruda (Fase 2 del feature: validar que los números cuadran con un usuario real de joyería), después comparativo, después PDF, y el pulido visual al final.

Fuentes: [NIF B-3 — Banxico](https://www.banxico.org.mx/marco-normativo/d/%7B6A49A1F6-374C-0A4F-8628-40BE37E872B6%7D.pdf), [CONTPAQi — Estado de resultados](https://www.contpaqi.com/publicaciones/contabilidad/estado-de-resultados-que-es-como-hacerlo), [Bind ERP — Estado de resultados (ayuda)](https://ayuda.bind.com.mx/hc/es/articles/115006100748-estado-de-resultados), [QuickBooks — Profit and Loss Comparison](https://quickbooks.intuit.com/learn-support/en-us/help-article/report-management/run-profit-loss-comparison-report/L6GthoBhe_US_en_US), [Alegra — Margen de utilidad y benchmarks](https://blog.alegra.com/mexico/margen-de-utilidad/). Código analizado: /Users/eduardozayas/financialos-app/dashboard.html (categorías líneas 3239–3250, labels 2426 y 2757, PDF ~4295) y /Users/eduardozayas/financialos-app/CLAUDE.md (tablas Supabase).

---

## auditoria-horizen

### Hallazgos
## MAPA TÉCNICO DE HORIZEN (auditoría de solo lectura)

Archivos clave: `/Users/eduardozayas/financialos-app/dashboard.html` (4,474 líneas, TODO el JS está inline a partir de ~L1560), `/Users/eduardozayas/financialos-app/assets/app.js` (175 líneas: cliente Supabase, auth, fmt, toast, subscribeToTable), `/Users/eduardozayas/financialos-app/supabase-schema.sql` + `/Users/eduardozayas/financialos-app/supabase/migrations/*.sql`.

### 1) TABLAS SUPABASE EXISTENTES (columnas reales)

**transactions** (supabase-schema.sql L102–171 + migraciones): `id, user_id, account_id, description, amount DECIMAL(14,2)` (CONVENCIÓN CRÍTICA: positivo=ingreso, negativo=egreso), `type CHECK ('ingreso','egreso','transferencia')`, `date, category, subcategory, is_fiscal BOOLEAN, source, sat_uuid, rfc_emisor, rfc_receptor, iva_amount, iva_rate, isr_retained, isr_rate, belvo_tx_id, counterpart, reference, notes, tags[], is_recurring, is_verified, raw_data JSONB, statement_id UUID` (agregada en migración 2026-06-29_statements.sql, FK a statements ON DELETE CASCADE).
- ⚠️ HALLAZGO IMPORTANTE sobre `source`: el schema original (L131–138) tiene `CHECK (source IN ('manual','belvo','sat_cfdi','pdf_ocr','whatsapp'))` — NO incluye 'efectivo'. Pero la migración `2026-06-30_transactions_columns.sql` hace `ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual'` SIN check. Es decir: si la BD de producción nació del schema completo, el CHECK existe y un insert con source='efectivo' FALLARÁ; si la columna se creó con la migración, no hay check. Hay que verificarlo en Supabase antes de programar.
- ⚠️ `category_rules.tx_type` se usa en el código (dashboard.html L3386 `select('keyword,category,tx_type')` y L3397) pero NO existe en la migración del repo (solo keyword/category) → el schema del repo NO refleja 100% producción; verificar siempre contra la BD real.

**accounts** (L49–96): `name, type CHECK ('CHECKING','SAVINGS','CREDIT_CARD','LOAN','INVESTMENT','CASH')` — **ya existe el tipo CASH/efectivo**, `institution_name, last4, balance_current, balance_available, credit_limit, currency, is_active, belvo_account_id, color, sort_order`.

**income_sources / fixed_expenses** (migrations/crear_tablas_finanzas.sql): idénticas: `name, amount numeric(12,2), due_day int, category text, frequency ('mensual','quincenal','anual','semanal'), notes, is_active boolean`. RLS `own_income`/`own_expenses` FOR ALL USING+WITH CHECK auth.uid()=user_id. Borrado = soft-delete (`is_active=false`, ver deleteIngreso L2603).

**statements** (2026-06-29_statements.sql): `id, user_id, name, file_name, bank_name, period_start, period_end, tx_count, created_at`. RLS "statements_all" FOR ALL USING auth.uid()=user_id.

**debts** (L183–235): name, type (credit_card/bank_loan/personal_loan/supplier_credit/tax_debt/other), institution, total_amount, outstanding_balance, minimum_payment, cutting_date, next_payment_date, interest_rate, due_day, account_id.

También existen: `profiles, payments, tax_reserves, alerts, sync_logs, custom_categories, category_rules`. **NO existen**: clients, appointments, availability, products, inventory_movements, cash_entries (el ROADMAP.md ya prevé Clientes=Fase 3, Citas=Fase 4, Inventario=Fase 1).

Patrón RLS uniforme del proyecto: `CREATE POLICY "x_all" ON tabla FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);` + índice por user_id.

### 2) PÁGINAS Y FUNCIONES (dashboard.html, líneas exactas)

**Navegación**: sidebar `<nav class="sidebar">` L519; grupos `nav-lbl`: "Principal" L525, "Finanzas" L531, "Inteligencia" L542, "Cuenta" L545. `showPage(id)` L1636–1677: activa `#page-{id}`, define título en objeto `titles` (L1644–1659) y despacha el loader por página (L1664–1676: `if (id==='gastos') loadGastos();` etc). Páginas = `<div class="page" id="page-X">`: overview L579, reportes L666, referidos L728, transactions L766, accounts L795, **ingresos L840**, finplan L894, **gastos L935**, **calendario L1014**, **estados L1078**, debts L1212, taxes L1232, alerts L1249, settings L1260.

**Modales**: patrón `<div class="overlay" id="xModal"><div class="modal"><div class="modal-ttl">…` + `openModal(id)/closeModal(id)` L2405–2406 (agregan clase `.open` y bloquean scroll). Existentes: txModal L1276, accModal L1335, debtModal L1365, ingresoModal L1405, gastoModal L1444, catModal L1481. Inputs con clases `finp/fsel/flbl/fg/frow`, footer `mod-footer` con `btn-cancel`/`btn-save`.

**Transacciones**: `saveTx()` L2105 (payload con `source:'manual'`, monto negativo si egreso), `loadTx()` L1874 (filtros: mes, statement_id, tipo, is_fiscal), `txRowFull` L1917, `srcLabel()` L1933 (`{manual:'Manual', belvo:'Belvo', sat_cfdi:'SAT', pdf_ocr:'OCR', whatsapp:'WhatsApp'}` — aquí se agregaría 'efectivo'), `filterTx` L1937, `deleteTx` L2178.

**page-ingresos**: `toMensual(amount,freq)` L2436 (normalizador usado en toda la app), `loadIngresos()` L2443, `renderIngresosKPIs` L2461, `renderIngresos` L2482, `renderIngresosCatBreakdown` L2517, `renderIngresosUpcoming` L2541, `saveIngreso` L2560, `editIngreso` L2589, `deleteIngreso` L2603, `clearIngresoForm` L2611. Sincroniza el total mensual a localStorage vía `setIncome()` (L2456–2458).

**page-gastos**: `loadGastos()` L2767, `getIncome/setIncome` L2784–2789 (localStorage `horizen_income_${user.id}`), `renderGastosResumen` L2802, `renderGastosUpcoming` L2828, `renderGastos` L2868, `renderGastosCatBreakdown` L2902, `saveGasto` L2940, `editGasto` L2980, `deleteGasto` L2995.

**page-calendario**: `initCal` L3021, `loadCalendario()` L3027 — hace `Promise.all` de 3 queries (L3040–3044): transactions del mes + income_sources activos + fixed_expenses activos; arma `_calDayData[día] = {ingresos[], egresos[], totalIn, totalOut}` (L3049–3082). `renderCalMes(year,month,lastDay)` L3088 (grid lunes-primero, celdas onclick showCalDay), `showCalDay(day)` L3132 (panel de detalle del día con botón editar solo para source 'tx'), `navCalMes` L3189, `renderCalChart` L3197 (Chart.js barras). **Este es el punto de extensión natural para citas: agregar una 4ª query al Promise.all y una 3ª colección en _calDayData.**

**page-reportes**: `loadReportes()` L4105 (trae TODAS las transactions del usuario + statements para mapear banco), `_repFilter` L4170 (transacciones sin statement_id caen al banco "Sin banco" — el efectivo aparecería ahí), `_repCompute` L4186, `repRender` L4198, `repDownloadExcel` L4260 (XLSX vía CDN), `repDownloadPDF` L4279.

**Patrón Storage (estados de cuenta)**: bucket **`statements`**, path `${_user.id}/${Date.now()}_${nombre}` — `procesarEstado()` L3330: sube con `db.storage.from('statements').upload(storagePath, file)` L3342, llama Edge Function `EDGE_PROCESS` (const L3235 = `/functions/v1/process-statement`) con `{storagePath, fileType}` + Bearer token del usuario. La Edge Function (supabase/functions/process-statement/index.ts) descarga con service role (L164) y **BORRA el archivo al terminar** (L223 y L230) → el bucket es staging temporal, NO archivo permanente. Las políticas RLS del bucket NO están en el repo (se configuraron en el panel de Supabase); el patrón es carpeta = user_id. `confirmarEstado()` L3870 inserta statement + transactions con `source:'pdf_ocr'` y `statement_id`, con rollback manual si fallan las transactions (L3923–3927).

**Arranque** (IIFE L1577–1633): requireAuth, guard de admin, enforcement de trial, prefills, luego `Promise.all([loadAccounts, loadDebts, loadCustomCats])` → loadMetrics → loadRecentTx → renderInicio, y suscripciones realtime (`subscribeToTable`) a transactions/accounts/debts/alerts. Las métricas vienen del RPC `get_liquidity_metrics` (L1682).

### Recomendaciones
## RECOMENDACIONES PARA LAS 5 FEATURES

### A) Ingresos en EFECTIVO → reusar `transactions`, NO crear cash_entries
- Insertar en `transactions` con `source='efectivo'` (o `'manual'` + nueva columna `payment_method`; preferible el source dedicado para el sello visual). Beneficio automático: entra GRATIS a métricas (RPC get_liquidity_metrics), Resumen, loadTx, calendario (loadCalendario L3040 ya lee transactions del mes) y reportes (loadReportes L4110) sin tocar esas funciones.
- SQL requerido: verificar/ampliar el CHECK de `source` (si existe en producción: `ALTER TABLE transactions DROP CONSTRAINT transactions_source_check;` y recrearlo incluyendo 'efectivo') + `NOTIFY pgrst, 'reload schema';` como hace la migración 2026-06-30.
- Frontend mínimo: (1) nueva entrada en `srcLabel()` L1933 (`efectivo:'Efectivo'`) + clase CSS `.src-efectivo`; (2) modal nuevo `cashModal` (clonar patrón de txModal L1276 simplificado: monto, concepto, fecha, categoría) o un botón "Registrar venta en efectivo" grande y visible; (3) opcional: cuenta `accounts.type='CASH'` para llevar saldo de caja (el tipo ya existe en el CHECK). NO se necesita tabla nueva.
- Colocación en menú: botón prominente en page-overview y en el topbar (los usuarios registran efectivo a diario; no debe estar escondido). No requiere página nueva.

### B) Tabla `clients` (CRM interno, Fase 3 del ROADMAP)
Nueva tabla: `id uuid PK, user_id uuid FK auth.users, name text NOT NULL, phone text, email text, notes text, tags text[], created_at timestamptz` + RLS patrón exacto del proyecto (`FOR ALL USING (auth.uid()=user_id) WITH CHECK (...)`) + índice user_id. Página nueva `page-clientes` + `loadClientes()/renderClientes()/saveCliente()` siguiendo el patrón de page-ingresos (loadIngresos L2443 es la plantilla más limpia) + modal `clienteModal` clonando ingresoModal L1405.

### C) Citas: tabla `appointments` (Fase 4 del ROADMAP)
`id, user_id, client_id uuid REFERENCES clients ON DELETE SET NULL (nullable), title text, date date, start_time time, end_time time, status text CHECK ('agendada','hecha','cancelada') DEFAULT 'agendada', notes, created_at` + RLS igual. Página propia `page-citas` con su lista, y ADEMÁS pintar puntos/badges en el calendario existente: agregar la query de appointments al `Promise.all` de `loadCalendario()` (L3040–3044) y una colección `citas[]` en `_calDayData` (L3049–3082), mostrándola en `showCalDay()` (L3132). NO convertir page-calendario en agenda: es un calendario de FLUJO DE DINERO y su lógica (renderCalMes L3088, renderCalChart L3197) suma montos; las citas son una capa visual aparte.

### D) `availability` — solo si habrá reservas externas
Para agenda interna del negocio NO hace falta; basta appointments. Si en el futuro los clientes reservan solos (portal Fase 5), entonces: `availability(id, user_id, weekday int 0-6, start_time, end_time, is_active)` + RLS. Recomendación: posponerla, es la pieza con menos certeza.

### E) Menú y orden de construcción
- Crear grupo nuevo `<div class="nav-lbl">Operación</div>` entre "Finanzas" (L531–540) e "Inteligencia" (L542) con los botones `showPage('clientes')` y `showPage('citas')` — el ROADMAP ya reserva ese grupo para Inventario/Clientes/Agenda.
- Cada página nueva requiere exactamente 3 toques a lo existente: (1) botón en sidebar, (2) entrada en objeto `titles` de showPage L1644, (3) branch `if (id==='clientes') loadClientes();` en L1664–1676. Todo lo demás es código nuevo aislado (tablas propias + funciones propias), como pide la estrategia de subagentes del ROADMAP.

### QUÉ NO TOCAR
1. **Convención de `amount`** (positivo=ingreso/negativo=egreso) y el CHECK de `type` — el RPC get_liquidity_metrics, reportes (_repCompute L4186) y calendario dependen de ella.
2. **Flujo completo de estados de cuenta** (procesarEstado L3330, confirmarEstado L3870, openSavedStatement L3959, category_rules): recién estabilizado tras varios bugs documentados en las migraciones; cualquier feature nueva NO debe modificar estas funciones.
3. **Belvo**: oculto por decisión de producto (CLAUDE.md del proyecto) — no reintroducir en UI ni en tablas nuevas.
4. **assets/app.js** (PKCE auth, fmtDate/dateLocal con el fix de zona horaria México) y el enforcement de trial en el IIFE L1577.
5. **localStorage `horizen_income_${user.id}`** (getIncome/setIncome L2784) — page-gastos y page-ingresos lo comparten.
6. El patrón `statement_id → banco` en reportes: si registran efectivo, esas transacciones caerán al banco "Sin banco" en _repFilter L4181; conviene mapear source='efectivo' a la etiqueta "Efectivo" en reportes, pero como cambio aditivo, sin alterar la lógica de bancos.

### ADVERTENCIAS PREVIAS AL CÓDIGO
- Verificar en Supabase (SQL Editor: `SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='public.transactions'::regclass;`) si el CHECK de `source` existe en producción antes de insertar 'efectivo'.
- El schema del repo NO es espejo fiel de producción (ej.: `category_rules.tx_type` existe en producción pero no en las migraciones del repo) — toda migración nueva debe usar `IF NOT EXISTS` y terminar con `NOTIFY pgrst, 'reload schema';`.
- dashboard.html es un solo archivo de 278KB: coordinar para que solo un agente lo edite a la vez, y hacer deploy a Hostinger tras cada cambio de frontend.