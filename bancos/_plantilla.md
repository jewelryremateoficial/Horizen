# [BANCO] — [producto: tarjeta de crédito | débito | nómina]

**Base:** [si es TDC → "sigue el Estado de Cuenta Universal, ver tdc-estandar-condusef.md"]
**Verificado con:** [PDF real, periodo] · o · `SIN VERIFICAR — falta un estado real`

## Identificación

Cómo saber que es este banco: [logo, texto fijo, formato del número de cuenta]

## ¿El PDF tiene texto o es imagen?

- [ ] Tiene capa de texto (se puede seleccionar con el mouse)
- [ ] Es puras imágenes → la lectura es visual, la verificación es obligatoria

Comprobar con: `python3 -c "import pypdf;print([len(p.extract_text() or '') for p in pypdf.PdfReader('X.pdf').pages])"`

## Tabla de movimientos

- Título de la tabla:
- Columnas, en orden:
- **Cuál columna es el monto:**
- **Cuál fecha usar:**
- Cómo se marca cargo vs abono:
- Formato de fecha:

## Totales impresos (el ancla de verificación)

- Etiqueta de total de cargos/retiros:
- Etiqueta de total de abonos/depósitos:
- Dónde aparecen:

## De dónde sale el año

## Trampas conocidas

## Descripciones frecuentes

| Descripción | Tipo | Categoría |
|---|---|---|
