-- ============================================================
-- Horizen — SAT/Fiscal con motor propio
-- (1) profiles.isr_rate: tasa de ISR configurable (RESICO 1-2.5%,
--     general ~30%). (2) tax_reserves: NO existía en producción
--     (solo en docs); se crea para guardar las palomitas de
--     "IVA/ISR pagado" y el histórico de reservas por mes.
-- El cálculo de IVA/ISR se hace EN VIVO en el navegador desde
-- transactions.is_fiscal = true. 100% aditivo.
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS isr_rate numeric DEFAULT 30;

CREATE TABLE IF NOT EXISTS public.tax_reserves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period text NOT NULL CHECK (period ~ '^\d{4}-\d{2}$'),
  iva_collected numeric(14,2) DEFAULT 0,
  iva_paid numeric(14,2) DEFAULT 0,
  iva_net numeric(14,2) DEFAULT 0,
  isr_estimated numeric(14,2) DEFAULT 0,
  has_paid_iva boolean NOT NULL DEFAULT false,
  has_paid_isr boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, period)
);
ALTER TABLE public.tax_reserves ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tax_reserves_all" ON public.tax_reserves;
CREATE POLICY "tax_reserves_all" ON public.tax_reserves
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_tax_reserves_user ON public.tax_reserves(user_id, period);
NOTIFY pgrst, 'reload schema';
