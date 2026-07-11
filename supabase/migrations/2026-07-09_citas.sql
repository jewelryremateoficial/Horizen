-- ============================================================
-- Horizen — FASE E: CITAS TIPO CALENDLY
-- 3 tablas + 4 RPCs SECURITY DEFINER. El público (anon) SOLO
-- ejecuta RPCs; jamás toca tablas. Anti-doble-reserva a nivel
-- BD con EXCLUSION constraint. Zona horaria fija MX.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS public.booking_pages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  slug             text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{2,39}$'),
  business_name    text NOT NULL,
  slot_minutes     int  NOT NULL DEFAULT 30 CHECK (slot_minutes IN (15,30,45,60)),
  min_notice_hours int  NOT NULL DEFAULT 4  CHECK (min_notice_hours BETWEEN 0 AND 72),
  max_days_ahead   int  NOT NULL DEFAULT 30 CHECK (max_days_ahead BETWEEN 1 AND 90),
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.availability_rules (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week int  NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time  time NOT NULL,
  end_time    time NOT NULL,
  CHECK (end_time > start_time)
);

CREATE TABLE IF NOT EXISTS public.appointments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id      uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  customer_name  text NOT NULL,
  customer_phone text NOT NULL,
  starts_at      timestamptz NOT NULL,
  ends_at        timestamptz NOT NULL,
  status         text NOT NULL DEFAULT 'confirmada' CHECK (status IN ('confirmada','hecha','cancelada')),
  cancel_token   uuid NOT NULL DEFAULT gen_random_uuid(),
  origin         text NOT NULL DEFAULT 'publica' CHECK (origin IN ('publica','manual')),
  notes          text,
  created_at     timestamptz DEFAULT now(),
  CHECK (ends_at > starts_at),
  CONSTRAINT no_double_booking EXCLUDE USING gist
    (user_id WITH =, tstzrange(starts_at, ends_at) WITH &&) WHERE (status = 'confirmada')
);

ALTER TABLE public.booking_pages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments       ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "booking_pages_all" ON public.booking_pages;
CREATE POLICY "booking_pages_all" ON public.booking_pages
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "availability_all" ON public.availability_rules;
CREATE POLICY "availability_all" ON public.availability_rules
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "appointments_all" ON public.appointments;
CREATE POLICY "appointments_all" ON public.appointments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_appt_user_start ON public.appointments(user_id, starts_at);

CREATE OR REPLACE FUNCTION public.get_public_page(p_slug text)
RETURNS json LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object('business_name', bp.business_name, 'slot_minutes', bp.slot_minutes,
                           'max_days_ahead', bp.max_days_ahead,
                           'days', (SELECT coalesce(json_agg(DISTINCT r.day_of_week), '[]'::json)
                                    FROM availability_rules r WHERE r.user_id = bp.user_id))
  FROM booking_pages bp WHERE bp.slug = lower(p_slug) AND bp.is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.get_available_slots(p_slug text, p_date date)
RETURNS TABLE (slot_start timestamptz) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_page booking_pages%ROWTYPE;
BEGIN
  SELECT * INTO v_page FROM booking_pages WHERE slug = lower(p_slug) AND is_active = true;
  IF NOT FOUND THEN RETURN; END IF;
  IF p_date < current_date OR p_date > current_date + v_page.max_days_ahead THEN RETURN; END IF;

  RETURN QUERY
  WITH reglas AS (
    SELECT r.start_time, r.end_time FROM availability_rules r
    WHERE r.user_id = v_page.user_id
      AND r.day_of_week = EXTRACT(dow FROM p_date)::int
  ),
  slots AS (
    SELECT generate_series(
      (p_date::text || ' ' || rg.start_time::text)::timestamp AT TIME ZONE 'America/Mexico_City',
      (p_date::text || ' ' || rg.end_time::text)::timestamp AT TIME ZONE 'America/Mexico_City'
        - (v_page.slot_minutes || ' minutes')::interval,
      (v_page.slot_minutes || ' minutes')::interval
    ) AS s FROM reglas rg
  )
  SELECT s FROM slots
  WHERE s >= now() + (v_page.min_notice_hours || ' hours')::interval
    AND NOT EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.user_id = v_page.user_id AND a.status = 'confirmada'
        AND tstzrange(a.starts_at, a.ends_at) &&
            tstzrange(s, s + (v_page.slot_minutes || ' minutes')::interval)
    )
  ORDER BY s;
END; $$;

CREATE OR REPLACE FUNCTION public.create_appointment(
  p_slug text, p_starts_at timestamptz, p_name text, p_phone text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_page booking_pages%ROWTYPE; v_appt appointments%ROWTYPE;
BEGIN
  SELECT * INTO v_page FROM booking_pages WHERE slug = lower(p_slug) AND is_active = true;
  IF NOT FOUND THEN RETURN json_build_object('ok', false, 'error', 'pagina_no_existe'); END IF;
  IF length(trim(p_name)) < 2 OR p_phone !~ '^\d{10}$' THEN
    RETURN json_build_object('ok', false, 'error', 'datos_invalidos');
  END IF;
  IF (SELECT count(*) FROM appointments WHERE user_id = v_page.user_id
      AND customer_phone = p_phone AND status = 'confirmada' AND starts_at > now()) >= 3 THEN
    RETURN json_build_object('ok', false, 'error', 'limite_telefono');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM get_available_slots(p_slug, (p_starts_at AT TIME ZONE 'America/Mexico_City')::date) g
                 WHERE g.slot_start = p_starts_at) THEN
    RETURN json_build_object('ok', false, 'error', 'slot_no_disponible');
  END IF;
  BEGIN
    INSERT INTO appointments (user_id, customer_name, customer_phone, starts_at, ends_at)
    VALUES (v_page.user_id, trim(p_name), p_phone, p_starts_at,
            p_starts_at + (v_page.slot_minutes || ' minutes')::interval)
    RETURNING * INTO v_appt;
  EXCEPTION WHEN exclusion_violation THEN
    RETURN json_build_object('ok', false, 'error', 'slot_no_disponible');
  END;
  RETURN json_build_object('ok', true, 'cancel_token', v_appt.cancel_token,
                           'starts_at', v_appt.starts_at, 'business_name', v_page.business_name);
END; $$;

CREATE OR REPLACE FUNCTION public.cancel_appointment(p_token uuid)
RETURNS json LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE appointments SET status = 'cancelada'
  WHERE cancel_token = p_token AND status = 'confirmada' AND starts_at > now()
  RETURNING json_build_object('ok', true);
$$;

REVOKE ALL ON public.booking_pages, public.availability_rules, public.appointments FROM anon;
GRANT EXECUTE ON FUNCTION public.get_public_page(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_available_slots(text, date) TO anon;
GRANT EXECUTE ON FUNCTION public.create_appointment(text, timestamptz, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.cancel_appointment(uuid) TO anon;
NOTIFY pgrst, 'reload schema';
