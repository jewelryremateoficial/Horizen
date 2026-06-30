# Horizen — Roadmap de producto

**Visión:** llevar Horizen de "dashboard financiero" a un **sistema de operación para PYMEs**:
finanzas + inventario + órdenes de compra + clientes + agenda. Todo en español, hecho para México.

**Regla de oro:** se lanza **por fases**, un módulo a la vez. Cada módulo se publica cuando
**funciona de verdad**, no todo al mismo tiempo. Así reducimos riesgo y vamos rápido sin romper lo que ya sirve.

---

## Cómo trabajamos con subagentes

No hay nada que "instalar": los subagentes los **lanzo y coordino yo** desde aquí. La clave es que
cada subagente trabaje en una **pieza independiente** (tablas propias + página propia), porque dos
agentes editando el mismo archivo a la vez chocan.

- **Orquestador (yo):** integro el trabajo, conecto el menú, despliego a GitHub/Hostinger, reviso.
- **Agente de Diseño:** mantiene el estilo (claro, índigo/violeta) consistente en cada módulo.
- **Agente de Producto:** construye la lógica de cada módulo (tablas, guardado, pantallas).

**Cada módulo se construye en 4 mini-pasos** (alineado a tu metodología en CLAUDE.md):
1. **Base de datos** — SQL listo, ejecutado en Supabase (RLS por usuario).
2. **Pantalla** — la vista con datos de prueba.
3. **Conectar** — guardar y leer de verdad.
4. **Pulir + verificar** — probar en vivo y dejarlo fino.

---

## Fases

### Fase 0 — Estabilizar Finanzas (ahora)
- [x] Arreglar guardado de estados de cuenta (tabla `statements` + nombre).
- [x] Reskin de dashboards (cliente y admin) a tema claro.
- [ ] **Probar en vivo:** subir estado → nombrar → Guardar → confirmar que persiste.
- [ ] **Lista de estados guardados** (ver / reabrir / borrar). *Hoy se guardan, pero falta la pantalla para reabrirlos.*
- [ ] Revisar visualmente los dashboards (requiere tu login) y afinar detalles de color.
- [ ] **Lanzar v1 "Finanzas".**

### Fase 1 — Inventario  ⭐ (primer módulo nuevo)
Control de productos y existencias. Es la base para Órdenes de compra.

### Fase 2 — Órdenes de compra
Proveedores + órdenes de compra. Al **recibir** una orden, suma stock al inventario.

### Fase 3 — Clientes (CRM interno)
Directorio de clientes y su ficha (contacto, historial). Uso interno tuyo.

### Fase 4 — Citas / Agenda
Calendario para agendar citas de la empresa (con estados: agendada, hecha, cancelada).

### Fase 5 — Portal de clientes (opcional, grande)
Que tus clientes entren con su propia cuenta. Mucho más trabajo (multiusuario y permisos).
**Se evalúa al final**, cuando lo demás esté sólido.

---

## Detalle de la Fase 1 — Inventario (lo que sigue)

**Tablas nuevas (Supabase):**
- `products` — `id, user_id, name, sku, category, unit, price (venta), cost (costo), stock, min_stock, created_at`
- `inventory_movements` — `id, user_id, product_id, type ('entrada'|'salida'|'ajuste'), qty, reason, created_at`
- RLS por usuario en ambas (igual que el resto del esquema).

**Pantallas:**
- Nueva entrada **"Inventario"** en el menú (grupo "Operación").
- **Lista de productos** con stock actual y semáforo de **stock bajo** (cuando `stock <= min_stock`).
- **Alta / edición** de producto (modal).
- Botones **+ Entrada** / **− Salida** / **Ajuste** que registran un movimiento y actualizan el stock.
- **Historial de movimientos** por producto.

**Cómo lo construyen los subagentes:**
- *Agente de Producto:* crea el SQL, la página `inventario` y la lógica de guardado.
- *Agente de Diseño:* deja la pantalla con el estilo claro consistente.
- *Yo:* integro la entrada al menú del dashboard y despliego.

---

## Decisiones abiertas (las vemos a su tiempo)
- **Multi-empresa / multiusuario:** hoy todo es "por usuario". Si una empresa va a tener varios
  usuarios compartiendo los mismos datos, hay que definir el modelo de "empresa". Lo decidimos antes
  de Clientes/Portal.
- **Portal de clientes (Fase 5):** confirmar si de verdad lo quieres, porque cambia bastante la arquitectura.

---

## Orden sugerido para lanzar
1. Cerrar y **lanzar Finanzas (v1)**.
2. **Inventario** → lanzar.
3. **Órdenes de compra** → lanzar.
4. **Clientes** → lanzar.
5. **Agenda** → lanzar.
6. (Opcional) **Portal de clientes**.
