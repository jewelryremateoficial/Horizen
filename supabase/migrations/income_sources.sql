-- ══════════════════════════════════════════════════════════════
-- Tabla: income_sources — Fuentes de ingreso por usuario
-- Ejecutar en: Supabase → SQL Editor
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS income_sources (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  amount      numeric(12,2) NOT NULL DEFAULT 0,
  due_day     int DEFAULT 1 CHECK (due_day BETWEEN 1 AND 31),
  category    text DEFAULT 'otros'
                   CHECK (category IN ('salario','freelance','negocio','renta','inversiones','pension','otros')),
  frequency   text DEFAULT 'mensual'
                   CHECK (frequency IN ('mensual','quincenal','anual','semanal')),
  notes       text,
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS income_sources_user_idx ON income_sources(user_id);

ALTER TABLE income_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven sus propios ingresos"
  ON income_sources FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
