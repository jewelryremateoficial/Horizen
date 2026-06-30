-- ============================================================
-- Horizen — Guardado de estados de cuenta
-- Crea la tabla statements (con nombre), vincula transacciones,
-- y agrega category_rules (usada por NOVA). Con RLS por usuario.
-- ============================================================

-- Tabla de estados de cuenta subidos
CREATE TABLE IF NOT EXISTS public.statements (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name         TEXT NOT NULL DEFAULT 'Estado de cuenta',
  file_name    TEXT,
  bank_name    TEXT,
  period_start DATE,
  period_end   DATE,
  tx_count     INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Vincular cada transacción a su estado de cuenta
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS statement_id UUID
  REFERENCES public.statements(id) ON DELETE CASCADE;

-- Reglas de categorías (NOVA aprende de tus correcciones)
CREATE TABLE IF NOT EXISTS public.category_rules (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  keyword    TEXT NOT NULL,
  category   TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seguridad por usuario (RLS) — mismo patrón que el resto del esquema
ALTER TABLE public.statements     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "statements_all"     ON public.statements;
DROP POLICY IF EXISTS "category_rules_all" ON public.category_rules;
CREATE POLICY "statements_all"     ON public.statements     FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "category_rules_all" ON public.category_rules FOR ALL USING (auth.uid() = user_id);

-- Índices
CREATE INDEX IF NOT EXISTS idx_statements_user ON public.statements(user_id);
CREATE INDEX IF NOT EXISTS idx_tx_statement    ON public.transactions(statement_id);
