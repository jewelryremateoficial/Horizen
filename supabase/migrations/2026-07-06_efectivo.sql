-- ============================================================
-- Horizen — FASE A: EFECTIVO
-- Reusa la tabla transactions (source='efectivo'), agrega la
-- columna receipt_path (foto de la nota) y crea el bucket
-- privado 'comprobantes' con políticas por carpeta de usuario.
-- Pegar COMPLETO en Supabase → SQL Editor y ejecutar.
-- ============================================================

-- ==== A1. Verificar el CHECK de source ANTES de todo ====
-- (Informativo: muestra el constraint actual. El paso A2 lo
--  recrea incluyendo 'efectivo'.)
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.transactions'::regclass AND conname ILIKE '%source%';

-- ==== A2. Ampliar el CHECK para permitir 'efectivo' ====
-- Si la consulta anterior devolvió un constraint, esto lo recrea incluyéndolo.
-- Si no devolvió nada, el DROP no falla (IF EXISTS) y el ADD deja el check correcto.
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_source_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_source_check
  CHECK (source IN ('manual','belvo','sat_cfdi','pdf_ocr','whatsapp','efectivo'));

-- ==== A3. Columna para la foto de la nota ====
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS receipt_path text;

NOTIFY pgrst, 'reload schema';

-- ==== A4. Bucket privado para fotos de notas ====
-- A diferencia de 'statements' (staging temporal), 'comprobantes'
-- es archivo permanente. Path: {user_id}/{fecha}-{timestamp}.jpg
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprobantes', 'comprobantes', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage: carpeta = user_id (mismo patrón que el bucket statements)
DROP POLICY IF EXISTS "comprobantes_insert" ON storage.objects;
DROP POLICY IF EXISTS "comprobantes_select" ON storage.objects;
DROP POLICY IF EXISTS "comprobantes_delete" ON storage.objects;

CREATE POLICY "comprobantes_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'comprobantes' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "comprobantes_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'comprobantes' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "comprobantes_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'comprobantes' AND (storage.foldername(name))[1] = auth.uid()::text);

NOTIFY pgrst, 'reload schema';
