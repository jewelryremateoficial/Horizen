-- ============================================================
-- FinancialOS — Supabase Schema v2.1 — Belvo Compatible
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================
--
-- INSTRUCCIONES:
--   A) INSTALACIÓN LIMPIA (primer deploy) → ejecuta todo el archivo
--   B) MIGRACIÓN (tablas ya existen)      → ejecuta solo la sección
--      marcada con [MIGRACIÓN] al final del archivo
--
-- ============================================================

-- ── TABLA: profiles ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                      UUID  REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name               TEXT,
  company_name            TEXT,
  rfc                     TEXT,
  plan                    TEXT  DEFAULT 'free'
                                CHECK (plan IN ('free','basico','pro','empresa')),
  subscription_status     TEXT  DEFAULT 'trial'
                                CHECK (subscription_status IN ('trial','active','cancelled','past_due')),
  paypal_subscription_id  TEXT,
  trial_ends_at           TIMESTAMPTZ DEFAULT NOW() + INTERVAL '14 days',
  subscription_started_at TIMESTAMPTZ,
  is_admin                BOOLEAN DEFAULT FALSE,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ── TABLA: payments ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payments (
  id                      UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                 UUID  REFERENCES auth.users(id) ON DELETE SET NULL,
  paypal_subscription_id  TEXT,
  paypal_payment_id       TEXT,
  amount                  DECIMAL(10,2),
  currency                TEXT  DEFAULT 'MXN',
  plan                    TEXT,
  status                  TEXT  DEFAULT 'completed',
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: accounts  ← BELVO COMPATIBLE
-- Campos Belvo: institution_name, type (CHECKING/SAVINGS/…),
--               balance_available, balance_current
-- ============================================================
CREATE TABLE IF NOT EXISTS public.accounts (
  id                  UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID    REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- ── Identidad ────────────────────────────────────────────────
  name                TEXT    NOT NULL,
    -- Alias amigable: "HSBC Nómina", "Efectivo Caja Chica"

  -- ── Tipo Belvo (+ tipos manuales CASH / INVESTMENT) ─────────
  type                TEXT    NOT NULL
                              CHECK (type IN (
                                'CHECKING',    -- Cuenta de cheques / débito  ← Belvo
                                'SAVINGS',     -- Cuenta de ahorro             ← Belvo
                                'CREDIT_CARD', -- Tarjeta de crédito           ← Belvo
                                'LOAN',        -- Préstamo / crédito           ← Belvo
                                'INVESTMENT',  -- CETES, fondos de inversión   (manual)
                                'CASH'         -- Efectivo físico              (manual)
                              )),

  -- ── Institución (viene directo de Belvo) ─────────────────────
  institution_name    TEXT,
    -- Ej: "BBVA", "Nu", "Santander", "HSBC"  — tal cual lo devuelve Belvo
  last4               TEXT,
    -- Últimos 4 dígitos de la cuenta

  -- ── Saldos DUALES (Belvo entrega ambos) ──────────────────────
  balance_current     DECIMAL(14,2) DEFAULT 0,
    -- Saldo contable / en libros (incluye cargos pendientes de liquidar)
  balance_available   DECIMAL(14,2) DEFAULT 0,
    -- Saldo DISPONIBLE real (lo que puedes usar HOY) ← usa la liquidez aquí

  -- ── Línea de crédito (solo CREDIT_CARD / LOAN) ───────────────
  credit_limit        DECIMAL(14,2),
    -- Límite de crédito total de la tarjeta

  -- ── Metadatos ────────────────────────────────────────────────
  currency            TEXT    DEFAULT 'MXN',
  is_active           BOOLEAN DEFAULT TRUE,
  belvo_account_id    TEXT    UNIQUE,
    -- account.id que devuelve Belvo — clave para el upsert en sync
  color               TEXT    DEFAULT '#6366f1',
  sort_order          INT     DEFAULT 0,
  last_synced_at      TIMESTAMPTZ,
    -- Última vez que Belvo actualizó esta cuenta
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: transactions  ← BELVO + SAT COMPATIBLE
-- Campos clave: is_fiscal, category (taxonomía Belvo),
--               sat_uuid, rfc_emisor, rfc_receptor
-- ============================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id              UUID     DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID     REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_id      UUID     REFERENCES public.accounts(id) ON DELETE SET NULL,

  -- ── Datos básicos ─────────────────────────────────────────────
  description     TEXT     NOT NULL,
  amount          DECIMAL(14,2) NOT NULL,
    -- POSITIVO = ingreso | NEGATIVO = egreso (convención uniforme)
  type            TEXT     NOT NULL
                           CHECK (type IN ('ingreso','egreso','transferencia')),
  date            DATE     DEFAULT CURRENT_DATE,

  -- ── Categoría Belvo ───────────────────────────────────────────
  category        TEXT,
    -- Taxonomía Belvo: "Shopping", "Food & Groceries", "Bills & Utilities",
    -- "Transportation", "Entertainment", "Income", "Transfer", "Tax",
    -- "Home & Life", "Personal Care", "Travel & Vacation", "Uncategorized"
    -- También acepta categorías del SAT o manuales del usuario
  subcategory     TEXT,
    -- Sub-categoría interna o de Belvo

  -- ── Bandera Fiscal Híbrida ────────────────────────────────────
  is_fiscal       BOOLEAN  DEFAULT FALSE,
    -- TRUE  = tiene CFDI válido (SAT) — entra al cálculo de IVA/ISR
    -- FALSE = transacción real sin comprobante fiscal (Belvo/banco)

  -- ── Fuente de datos ───────────────────────────────────────────
  source          TEXT     DEFAULT 'manual'
                           CHECK (source IN (
                             'manual',       -- Captura directa del usuario
                             'belvo',        -- Importado vía Belvo API
                             'sat_cfdi',     -- Descargado del SAT (XML CFDI)
                             'pdf_ocr',      -- OCR de estado de cuenta PDF
                             'whatsapp'      -- Bot NOVA vía WhatsApp
                           )),

  -- ── Metadatos SAT / CFDI ──────────────────────────────────────
  sat_uuid        UUID,
    -- UUID del CFDI (folio fiscal) — formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  rfc_emisor      TEXT,
    -- RFC de quien emitió la factura (proveedor que te factura)
  rfc_receptor    TEXT,
    -- RFC de quien recibe   (tu RFC o el de tu cliente)
  iva_amount      DECIMAL(14,2) DEFAULT 0,
    -- Monto de IVA (16%) incluido en la transacción fiscal
  iva_rate        DECIMAL(5,4)  DEFAULT 0.16,
  isr_retained    DECIMAL(14,2) DEFAULT 0,
    -- ISR retenido (aplica en honorarios, arrendamiento)
  isr_rate        DECIMAL(5,4)  DEFAULT 0,

  -- ── Metadatos Belvo ──────────────────────────────────────────
  belvo_tx_id     TEXT,
    -- transaction.id que devuelve Belvo — evita duplicados
  counterpart     TEXT,
    -- Nombre del tercero: "OXXO", "Amazon MX", "CFE"
  reference       TEXT,
    -- Número de referencia bancaria / folio

  -- ── Metadatos generales ───────────────────────────────────────
  notes           TEXT,
  tags            TEXT[],
  is_recurring    BOOLEAN  DEFAULT FALSE,
  is_verified     BOOLEAN  DEFAULT FALSE,
    -- TRUE = conciliado manualmente con el estado de cuenta
  raw_data        JSONB,
    -- Objeto JSON completo que devuelve Belvo/SAT (para auditoría)

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Índice único en belvo_tx_id para evitar importar duplicados
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_belvo_id
  ON public.transactions(belvo_tx_id)
  WHERE belvo_tx_id IS NOT NULL;

-- ============================================================
-- TABLA: debts  ← BELVO credit_data COMPATIBLE
-- Campos exactos del objeto credit_data de Belvo
-- ============================================================
CREATE TABLE IF NOT EXISTS public.debts (
  id                  UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID    REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- ── Identidad ────────────────────────────────────────────────
  name                TEXT    NOT NULL,
    -- "TDC BBVA Azul", "Crédito Santander 500K"
  type                TEXT    NOT NULL
                              CHECK (type IN (
                                'credit_card',    -- Tarjeta de crédito
                                'bank_loan',      -- Préstamo bancario
                                'personal_loan',  -- Préstamo personal / nómina
                                'supplier_credit',-- Crédito con proveedor
                                'tax_debt',       -- Deuda fiscal SAT / IMSS
                                'other'
                              )),
  institution         TEXT,
    -- Nombre del banco: "BBVA", "Nu", "Santander"

  -- ── Saldos ───────────────────────────────────────────────────
  total_amount        DECIMAL(14,2),
    -- Monto original del crédito / límite de la TDC
  outstanding_balance DECIMAL(14,2) DEFAULT 0,
    -- Saldo insoluto actual (lo que debes HOY)

  -- ── Campos exactos de Belvo credit_data ──────────────────────
  minimum_payment     DECIMAL(14,2) DEFAULT 0,
    -- Pago mínimo mensual requerido ← Belvo: credit_data.minimum_payment
  cutting_date        DATE,
    -- Fecha de CORTE de la tarjeta ← Belvo: credit_data.cutting_date
    -- CRÍTICO: activa alertas 5 días antes para maximizar período de gracia
  next_payment_date   DATE,
    -- Fecha límite de pago sin intereses ← Belvo: credit_data.next_payment_date
  last_payment_date   DATE,
    -- Fecha del último pago registrado ← Belvo: credit_data.last_payment_date
  interest_rate       DECIMAL(6,4)  DEFAULT 0,
    -- Tasa de interés ANUAL ← Belvo: credit_data.interest_rate (0.24 = 24%)

  -- ── Metadatos complementarios ────────────────────────────────
  due_day             INT,
    -- Día del mes en que vence (1–31) — para alertas recurrentes
  currency            TEXT    DEFAULT 'MXN',
  is_active           BOOLEAN DEFAULT TRUE,
  account_id          UUID    REFERENCES public.accounts(id) ON DELETE SET NULL,
    -- Cuenta bancaria asociada (para conciliar pagos)
  belvo_account_id    TEXT,
    -- Referencia cruzada con accounts.belvo_account_id
  notes               TEXT,
  raw_data            JSONB,
    -- Objeto credit_data completo de Belvo (para auditoría)
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: tax_reserves  (Reservas fiscales IVA + ISR)
-- Se recalcula automáticamente vía trigger en transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tax_reserves (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID    REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  period          TEXT    NOT NULL,
    -- Formato: "2025-01" (YYYY-MM)
  iva_collected   DECIMAL(14,2) DEFAULT 0,
  iva_paid        DECIMAL(14,2) DEFAULT 0,
  iva_net         DECIMAL(14,2) GENERATED ALWAYS AS (iva_collected - iva_paid) STORED,
    -- IVA a pagar al SAT (positivo = debes, negativo = saldo a favor)
  isr_estimated   DECIMAL(14,2) DEFAULT 0,
  isr_accrued     DECIMAL(14,2) DEFAULT 0,
  has_paid_iva    BOOLEAN DEFAULT FALSE,
  has_paid_isr    BOOLEAN DEFAULT FALSE,
  iva_payment_date DATE,
  isr_payment_date DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, period)
);

-- ============================================================
-- TABLA: sync_logs  (Historial de sincronizaciones Belvo/SAT)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id                UUID   DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID   REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source            TEXT   NOT NULL
                           CHECK (source IN (
                             'belvo','sat_cfdi','pdf_ocr','whatsapp','manual_import'
                           )),
  status            TEXT   DEFAULT 'pending'
                           CHECK (status IN (
                             'pending','processing','completed','failed','partial'
                           )),
  records_total     INT    DEFAULT 0,
  records_imported  INT    DEFAULT 0,
  records_failed    INT    DEFAULT 0,
  error_message     TEXT,
  metadata          JSONB,
    -- { institution: "BBVA", date_from: "2025-01-01", date_to: "2025-01-31" }
  started_at        TIMESTAMPTZ DEFAULT NOW(),
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: alerts  (Semáforo de alertas)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.alerts (
  id              UUID   DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID   REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type            TEXT   NOT NULL
                         CHECK (type IN (
                           'debt_due',       -- Pago deuda próximo (next_payment_date)
                           'cutting_date',   -- Fecha de corte TDC en 5 días ← NUEVO
                           'tax_due',        -- Vencimiento declaración SAT
                           'low_balance',    -- Saldo disponible bajo
                           'runway_critical',-- Runway < 30 días
                           'cash_negative',  -- Caja libre negativa
                           'isr_reserve',    -- Sin reserva ISR del mes
                           'cfdi_missing',   -- Transacciones sin CFDI
                           'custom'
                         )),
  severity        TEXT   DEFAULT 'warning'
                         CHECK (severity IN ('info','warning','critical')),
  title           TEXT   NOT NULL,
  message         TEXT,
  action_url      TEXT,
  is_read         BOOLEAN DEFAULT FALSE,
  is_dismissed    BOOLEAN DEFAULT FALSE,
  expires_at      TIMESTAMPTZ,
  metadata        JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY  (todas las tablas)
-- ============================================================
ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_reserves  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts        ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas previas (idempotente)
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Políticas: cada usuario ve y edita SOLO sus propios datos
CREATE POLICY "profiles_s"      ON public.profiles      FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_i"      ON public.profiles      FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_u"      ON public.profiles      FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "payments_s"      ON public.payments      FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "payments_i"      ON public.payments      FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "accounts_all"    ON public.accounts      FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "transactions_all"ON public.transactions  FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "debts_all"       ON public.debts         FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "tax_reserves_all"ON public.tax_reserves  FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "sync_logs_all"   ON public.sync_logs     FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "alerts_all"      ON public.alerts        FOR ALL    USING (auth.uid() = user_id);

-- ============================================================
-- ÍNDICES DE RENDIMIENTO
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_accounts_user_active
  ON public.accounts(user_id, is_active, type);

CREATE INDEX IF NOT EXISTS idx_accounts_belvo_id
  ON public.accounts(belvo_account_id) WHERE belvo_account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tx_user_date
  ON public.transactions(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_tx_fiscal
  ON public.transactions(user_id, is_fiscal, date DESC);

CREATE INDEX IF NOT EXISTS idx_tx_sat_uuid
  ON public.transactions(sat_uuid) WHERE sat_uuid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tx_rfc_emisor
  ON public.transactions(rfc_emisor) WHERE rfc_emisor IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_debts_cutting_date
  ON public.debts(user_id, cutting_date) WHERE is_active = TRUE;
  -- Crítico para alertas de fecha de corte

CREATE INDEX IF NOT EXISTS idx_debts_next_payment
  ON public.debts(user_id, next_payment_date) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_tax_period
  ON public.tax_reserves(user_id, period DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_user_unread
  ON public.alerts(user_id, is_read, created_at DESC);

-- ============================================================
-- FUNCIONES Y TRIGGERS
-- ============================================================

-- ── Trigger: auto-crear perfil en signup ─────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, company_name, plan, subscription_status, trial_ends_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'company_name',
    'free', 'trial',
    NOW() + INTERVAL '14 days'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Función: updated_at automático ───────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','accounts','transactions','debts','tax_reserves'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_updated_at ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER %I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t, t);
  END LOOP;
END $$;

-- ============================================================
-- FUNCIÓN CENTRAL: get_liquidity_metrics
-- Usa balance_available (Belvo) como fuente de verdad
-- Incorpora cutting_date de TDC y next_payment_date de deudas
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_liquidity_metrics(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_caja_total      DECIMAL := 0;  -- Suma de balance_available (cuentas líquidas)
  v_debts_30d       DECIMAL := 0;  -- Pagos mínimos con next_payment_date ≤ hoy+30
  v_cutting_reserve DECIMAL := 0;  -- Saldo consumido en TDC (outstanding en ciclo actual)
  v_tax_pending     DECIMAL := 0;  -- IVA neto + ISR no pagados (últimos 3 meses)
  v_caja_libre      DECIMAL := 0;  -- Liquidez Real = disponible - compromisos
  v_burn_rate       DECIMAL := 0;  -- Promedio mensual de egresos (90 días)
  v_income_30d      DECIMAL := 0;
  v_expense_30d     DECIMAL := 0;
  v_margen_neto     DECIMAL := 0;
  v_runway_days     INT     := 0;
  v_semaforo        TEXT    := 'green';
  v_cutting_alert   BOOLEAN := FALSE;
BEGIN

  -- ── 1. Caja total: balance_available de cuentas líquidas ─────
  --    (CHECKING + SAVINGS + CASH + INVESTMENT — excluye crédito y préstamos)
  SELECT COALESCE(SUM(
    COALESCE(balance_available, balance_current, 0)   -- prefiere disponible
  ), 0)
  INTO v_caja_total
  FROM public.accounts
  WHERE user_id = p_user_id
    AND is_active = TRUE
    AND type IN ('CHECKING', 'SAVINGS', 'CASH', 'INVESTMENT');

  -- ── 2. Compromisos de deuda próximos 30 días (next_payment_date) ─
  SELECT COALESCE(SUM(minimum_payment), 0)
  INTO v_debts_30d
  FROM public.debts
  WHERE user_id   = p_user_id
    AND is_active = TRUE
    AND next_payment_date IS NOT NULL
    AND next_payment_date <= CURRENT_DATE + INTERVAL '30 days';

  -- ── 3. Reserva de corte TDC (outstanding_balance en ciclo actual) ─
  --    Si la cutting_date es en los próximos 7 días, el saldo de la TDC
  --    ya es un compromiso inmediato de caja
  SELECT COALESCE(SUM(outstanding_balance), 0)
  INTO v_cutting_reserve
  FROM public.debts
  WHERE user_id     = p_user_id
    AND is_active   = TRUE
    AND type        = 'credit_card'
    AND cutting_date IS NOT NULL
    AND cutting_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days';

  -- Bandera: hay corte de TDC esta semana
  v_cutting_alert := (v_cutting_reserve > 0);

  -- ── 4. Reservas fiscales pendientes ──────────────────────────
  SELECT COALESCE(SUM(
    CASE WHEN NOT has_paid_iva THEN GREATEST(iva_net, 0) ELSE 0 END +
    CASE WHEN NOT has_paid_isr THEN isr_estimated         ELSE 0 END
  ), 0)
  INTO v_tax_pending
  FROM public.tax_reserves
  WHERE user_id = p_user_id
    AND period  >= TO_CHAR(CURRENT_DATE - INTERVAL '3 months', 'YYYY-MM');

  -- ── 5. CAJA LIBRE REAL ────────────────────────────────────────
  --    = Disponible - Pagos deuda próx 30d - Corte TDC esta semana - SAT
  v_caja_libre := v_caja_total
                - v_debts_30d
                - v_cutting_reserve
                - GREATEST(v_tax_pending, 0);

  -- ── 6. Flujo de los últimos 30 días ──────────────────────────
  SELECT
    COALESCE(SUM(CASE WHEN type = 'ingreso' THEN  amount           ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'egreso'  THEN ABS(amount)       ELSE 0 END), 0)
  INTO v_income_30d, v_expense_30d
  FROM public.transactions
  WHERE user_id = p_user_id
    AND date   >= CURRENT_DATE - INTERVAL '30 days';

  -- ── 7. Burn rate: promedio mensual egresos (90 días) ─────────
  SELECT COALESCE(SUM(ABS(amount)), 0) / 3.0
  INTO v_burn_rate
  FROM public.transactions
  WHERE user_id = p_user_id
    AND type    = 'egreso'
    AND date   >= CURRENT_DATE - INTERVAL '90 days';

  -- ── 8. Runway (días de vida con la caja libre actual) ────────
  IF v_burn_rate > 0 THEN
    v_runway_days := GREATEST(0, FLOOR((v_caja_libre / v_burn_rate) * 30))::INT;
  ELSE
    v_runway_days := 999;  -- sin egresos registrados todavía
  END IF;

  -- ── 9. Margen Neto Real ───────────────────────────────────────
  --    (Ingresos - Egresos - Impuestos_mes) / Ingresos × 100
  IF v_income_30d > 0 THEN
    v_margen_neto := ROUND(
      ((v_income_30d - v_expense_30d - COALESCE(v_tax_pending / 3.0, 0))
       / v_income_30d) * 100,
    2);
  END IF;

  -- ── 10. Semáforo ─────────────────────────────────────────────
  IF v_caja_libre < 0 OR v_runway_days < 15 THEN
    v_semaforo := 'red';
  ELSIF v_runway_days < 45 OR v_margen_neto < 10 OR v_cutting_alert THEN
    v_semaforo := 'yellow';
  ELSE
    v_semaforo := 'green';
  END IF;

  RETURN jsonb_build_object(
    -- Saldos
    'caja_total',       v_caja_total,
    'debts_30d',        v_debts_30d,
    'cutting_reserve',  v_cutting_reserve,
    'tax_pending',      v_tax_pending,
    'caja_libre',       v_caja_libre,
    -- Flujo
    'burn_rate',        ROUND(v_burn_rate, 2),
    'income_30d',       v_income_30d,
    'expense_30d',      v_expense_30d,
    -- KPIs
    'margen_neto',      v_margen_neto,
    'runway_days',      v_runway_days,
    -- Semáforo
    'semaforo',         v_semaforo,
    'cutting_alert',    v_cutting_alert
  );
END;
$$;

-- ============================================================
-- FUNCIÓN: recalculate_tax_reserve  (disparada por trigger)
-- ============================================================
CREATE OR REPLACE FUNCTION public.recalculate_tax_reserve(p_user_id UUID, p_period TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_iva_collected DECIMAL := 0;
  v_iva_paid      DECIMAL := 0;
  v_isr_est       DECIMAL := 0;
  v_period_start  DATE;
  v_period_end    DATE;
BEGIN
  v_period_start := TO_DATE(p_period || '-01', 'YYYY-MM-DD');
  v_period_end   := (v_period_start + INTERVAL '1 month - 1 day')::DATE;

  SELECT COALESCE(SUM(iva_amount), 0) INTO v_iva_collected
  FROM public.transactions
  WHERE user_id = p_user_id AND is_fiscal = TRUE AND type = 'ingreso'
    AND date BETWEEN v_period_start AND v_period_end;

  SELECT COALESCE(SUM(iva_amount), 0) INTO v_iva_paid
  FROM public.transactions
  WHERE user_id = p_user_id AND is_fiscal = TRUE AND type = 'egreso'
    AND date BETWEEN v_period_start AND v_period_end;

  SELECT COALESCE(
    GREATEST(0,
      SUM(CASE WHEN type='ingreso' THEN (amount - iva_amount) ELSE 0 END) -
      SUM(CASE WHEN type='egreso'  THEN ABS(amount - iva_amount) ELSE 0 END)
    ) * 0.30, 0
  ) INTO v_isr_est
  FROM public.transactions
  WHERE user_id = p_user_id AND is_fiscal = TRUE
    AND date BETWEEN v_period_start AND v_period_end;

  INSERT INTO public.tax_reserves (user_id, period, iva_collected, iva_paid, isr_estimated)
  VALUES (p_user_id, p_period, v_iva_collected, v_iva_paid, v_isr_est)
  ON CONFLICT (user_id, period) DO UPDATE SET
    iva_collected = EXCLUDED.iva_collected,
    iva_paid      = EXCLUDED.iva_paid,
    isr_estimated = EXCLUDED.isr_estimated,
    updated_at    = NOW();
END;
$$;

-- ── Trigger: recalcular reserva fiscal al tocar transacciones ─
CREATE OR REPLACE FUNCTION public.on_transaction_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF COALESCE(NEW.is_fiscal, OLD.is_fiscal) = TRUE THEN
    PERFORM public.recalculate_tax_reserve(
      COALESCE(NEW.user_id, OLD.user_id),
      TO_CHAR(COALESCE(NEW.date, OLD.date), 'YYYY-MM')
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS transaction_tax_recalc ON public.transactions;
CREATE TRIGGER transaction_tax_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.on_transaction_change();

-- ============================================================
-- FUNCIÓN: generate_cutting_date_alerts
-- Llámala una vez al día (cron o edge function)
-- Crea alertas tipo 'cutting_date' 5 días antes del corte
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_cutting_date_alerts()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  r        RECORD;
  inserted INT := 0;
BEGIN
  FOR r IN
    SELECT d.user_id, d.id AS debt_id, d.name, d.cutting_date,
           d.outstanding_balance, d.minimum_payment
    FROM   public.debts d
    WHERE  d.is_active = TRUE
      AND  d.type      = 'credit_card'
      AND  d.cutting_date IS NOT NULL
      AND  d.cutting_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '5 days'
      AND  NOT EXISTS (
             SELECT 1 FROM public.alerts a
             WHERE  a.user_id  = d.user_id
               AND  a.type     = 'cutting_date'
               AND  (a.metadata->>'debt_id')::TEXT = d.id::TEXT
               AND  a.created_at >= CURRENT_DATE
           )
  LOOP
    INSERT INTO public.alerts (user_id, type, severity, title, message, expires_at, metadata)
    VALUES (
      r.user_id,
      'cutting_date',
      CASE WHEN r.cutting_date <= CURRENT_DATE + INTERVAL '2 days' THEN 'critical' ELSE 'warning' END,
      '📅 Fecha de corte: ' || r.name,
      'Corte el ' || TO_CHAR(r.cutting_date, 'DD/MM') ||
        '. Saldo actual: $' || TO_CHAR(r.outstanding_balance, 'FM999,999,990.00') ||
        ' · Pago mínimo: $' || TO_CHAR(r.minimum_payment, 'FM999,999,990.00'),
      r.cutting_date + INTERVAL '1 day',
      jsonb_build_object('debt_id', r.debt_id, 'cutting_date', r.cutting_date)
    );
    inserted := inserted + 1;
  END LOOP;
  RETURN inserted;
END;
$$;

-- ============================================================
-- [MIGRACIÓN] — Ejecuta esto si las tablas YA EXISTEN
-- Agrega solo las columnas nuevas sin tocar los datos
-- ============================================================

-- accounts: campos Belvo
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS institution_name TEXT,
  ADD COLUMN IF NOT EXISTS balance_current  DECIMAL(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_available DECIMAL(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_synced_at   TIMESTAMPTZ;

-- Migrar tipos viejos a Belvo (si la tabla ya tenía datos)
UPDATE public.accounts SET type = 'CHECKING'    WHERE type = 'bank';
UPDATE public.accounts SET type = 'CREDIT_CARD' WHERE type = 'credit_card';
UPDATE public.accounts SET type = 'CASH'        WHERE type = 'cash';
UPDATE public.accounts SET type = 'LOAN'        WHERE type = 'loan';
UPDATE public.accounts SET type = 'INVESTMENT'  WHERE type = 'investment';

-- Copiar bank_name → institution_name (si existía la columna vieja)
UPDATE public.accounts
  SET institution_name = bank_name
  WHERE institution_name IS NULL AND bank_name IS NOT NULL;

-- Inicializar balance_current y balance_available con el valor de balance
UPDATE public.accounts
  SET balance_current  = COALESCE(balance, 0),
      balance_available = COALESCE(balance, 0)
  WHERE balance_available = 0;

-- debts: campos Belvo credit_data
ALTER TABLE public.debts
  ADD COLUMN IF NOT EXISTS cutting_date      DATE,
  ADD COLUMN IF NOT EXISTS last_payment_date DATE,
  ADD COLUMN IF NOT EXISTS belvo_account_id  TEXT,
  ADD COLUMN IF NOT EXISTS raw_data          JSONB;

-- transactions: campos SAT y Belvo
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS sat_uuid      UUID,
  ADD COLUMN IF NOT EXISTS rfc_emisor    TEXT,
  ADD COLUMN IF NOT EXISTS rfc_receptor  TEXT,
  ADD COLUMN IF NOT EXISTS belvo_tx_id   TEXT;

-- Migrar cfdi_uuid → sat_uuid (si venías con el nombre anterior)
UPDATE public.transactions
  SET sat_uuid = cfdi_uuid
  WHERE sat_uuid IS NULL AND cfdi_uuid IS NOT NULL;

-- Migrar fuente 'bank_api' → 'belvo'
UPDATE public.transactions SET source = 'belvo' WHERE source = 'bank_api';

-- ============================================================
-- VERIFICACIÓN FINAL
-- ============================================================
SELECT
  t.tablename,
  COUNT(c.column_name) AS columnas,
  t.rowsecurity        AS rls_activo
FROM pg_tables t
LEFT JOIN information_schema.columns c
  ON c.table_schema = 'public' AND c.table_name = t.tablename
WHERE t.schemaname = 'public'
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;
