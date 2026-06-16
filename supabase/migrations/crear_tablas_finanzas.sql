-- ══════════════════════════════════════════════════════════════
-- HORIZEN — Tablas de Ingresos y Gastos Fijos
-- Pega TODO esto en: Supabase → SQL Editor → Run
-- ══════════════════════════════════════════════════════════════

-- ── Tabla: income_sources (Ingresos) ─────────────────────────
CREATE TABLE IF NOT EXISTS income_sources (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  amount     numeric(12,2) NOT NULL DEFAULT 0,
  due_day    int DEFAULT 1,
  category   text DEFAULT 'otros',
  frequency  text DEFAULT 'mensual',
  notes      text,
  is_active  boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE income_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_income" ON income_sources;
CREATE POLICY "own_income" ON income_sources
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Tabla: fixed_expenses (Gastos Fijos) ─────────────────────
CREATE TABLE IF NOT EXISTS fixed_expenses (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  amount     numeric(12,2) NOT NULL DEFAULT 0,
  due_day    int DEFAULT 1,
  category   text DEFAULT 'otros',
  frequency  text DEFAULT 'mensual',
  notes      text,
  is_active  boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE fixed_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_expenses" ON fixed_expenses;
CREATE POLICY "own_expenses" ON fixed_expenses
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
