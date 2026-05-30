-- ============================================================
-- FinancialOS — Supabase Schema
-- Ejecuta este SQL en: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── TABLA: profiles ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                    UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name             TEXT,
  company_name          TEXT,
  rfc                   TEXT,
  plan                  TEXT DEFAULT 'free' CHECK (plan IN ('free','basico','pro','empresa')),
  subscription_status   TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial','active','cancelled','past_due')),
  paypal_subscription_id TEXT,
  trial_ends_at         TIMESTAMPTZ DEFAULT NOW() + INTERVAL '14 days',
  subscription_started_at TIMESTAMPTZ,
  is_admin              BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ── TABLA: payments ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payments (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  paypal_subscription_id TEXT,
  paypal_payment_id     TEXT,
  amount                DECIMAL(10,2),
  currency              TEXT DEFAULT 'MXN',
  plan                  TEXT,
  status                TEXT DEFAULT 'completed',
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ── TABLA: transactions ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transactions (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  description  TEXT NOT NULL,
  amount       DECIMAL(12,2) NOT NULL,  -- positivo=ingreso, negativo=egreso
  category     TEXT,
  type         TEXT CHECK (type IN ('ingreso','egreso','transferencia')),
  date         DATE DEFAULT CURRENT_DATE,
  reference    TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── TABLA: bank_accounts ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_name    TEXT NOT NULL,
  account_name TEXT,
  last4        TEXT,
  balance      DECIMAL(12,2) DEFAULT 0,
  currency     TEXT DEFAULT 'MXN',
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────
ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own; admins can read all
CREATE POLICY "profiles_own" ON public.profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "profiles_admin_read" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- Payments: users see their own; admins see all
CREATE POLICY "payments_own" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "payments_admin" ON public.payments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY "payments_insert" ON public.payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Transactions: users see their own
CREATE POLICY "tx_own" ON public.transactions
  FOR ALL USING (auth.uid() = user_id);

-- Bank accounts: users see their own
CREATE POLICY "bank_own" ON public.bank_accounts
  FOR ALL USING (auth.uid() = user_id);

-- ── TRIGGER: auto-create profile on signup ───────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, company_name, plan, subscription_status, trial_ends_at)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'company_name',
    'free',
    'trial',
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

-- ── TRIGGER: updated_at auto-update ──────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── SET ADMIN (ejecuta después de registrarte) ─────────────────
-- Reemplaza 'tu@email.com' con tu correo real
-- UPDATE public.profiles
-- SET is_admin = TRUE
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'tu@email.com');

-- ── REALTIME (para admin dashboard) ───────────────────────────
-- Habilita Realtime en Supabase Dashboard → Database → Replication
-- para las tablas: profiles, payments, transactions
