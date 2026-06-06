-- ══════════════════════════════════════════════════════════════
-- Tabla: fixed_expenses — Gastos fijos mensuales por usuario
-- Ejecutar en: Supabase → SQL Editor
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS fixed_expenses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  amount      numeric(12,2) NOT NULL DEFAULT 0,
  due_day     int DEFAULT 1 CHECK (due_day BETWEEN 1 AND 31),
  category    text DEFAULT 'otros'
                   CHECK (category IN ('vivienda','servicios','suscripciones','seguros','creditos','otros')),
  frequency   text DEFAULT 'mensual'
                   CHECK (frequency IN ('mensual','quincenal','anual','semanal')),
  notes       text,
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- Índice para queries por usuario
CREATE INDEX IF NOT EXISTS fixed_expenses_user_idx ON fixed_expenses(user_id);

-- Row Level Security
ALTER TABLE fixed_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven sus propios gastos fijos"
  ON fixed_expenses FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
