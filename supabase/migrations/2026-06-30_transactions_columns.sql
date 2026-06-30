-- ============================================================
-- Horizen — Columnas faltantes en transactions
-- CAUSA RAÍZ del fallo al guardar estados de cuenta:
-- la tabla transactions NO tenía la columna `source` (ni
-- `is_fiscal` ni `account_id`), así que el insert de movimientos
-- fallaba con: "Could not find the 'source' column ... in the
-- schema cache". El insert de `statements` sí pasaba; el error
-- ocurría en el segundo paso (transactions) y quedaba oculto.
--
-- Verificado: tras agregar estas columnas, el guardado completo
-- (statement + transactions, incl. tipo 'transferencia') pasó 7/7.
-- ============================================================

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS is_fiscal BOOLEAN DEFAULT false;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS account_id UUID
  REFERENCES public.accounts(id) ON DELETE SET NULL;

-- Refrescar el cache de PostgREST para que la API exponga las columnas
NOTIFY pgrst, 'reload schema';
