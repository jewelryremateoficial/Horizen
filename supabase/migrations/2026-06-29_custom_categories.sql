-- ============================================================
-- Horizen — Categorías personalizadas + índice único para reglas
-- Corrige: custom_categories no existía (rompía categorías) y
-- category_rules necesitaba UNIQUE(user_id,keyword) para el upsert.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.custom_categories (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name       TEXT NOT NULL,
  group_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, name)
);

ALTER TABLE public.custom_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "custom_categories_all" ON public.custom_categories;
CREATE POLICY "custom_categories_all" ON public.custom_categories FOR ALL USING (auth.uid() = user_id);

-- Requerido por el upsert onConflict('user_id,keyword') de saveCategRule()
CREATE UNIQUE INDEX IF NOT EXISTS idx_category_rules_user_kw ON public.category_rules(user_id, keyword);
