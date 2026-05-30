# FinancialOS — Setup Guide

## Archivos del proyecto

```
financialos-app/
├── assets/
│   └── app.js              ← Utilidades compartidas (Supabase, helpers)
├── admin/
│   └── dashboard.html      ← Panel de admin (solo Eduardo)
├── index.html              ← Landing page (ya deployada en Hostinger)
├── login.html              ← Inicio de sesión
├── signup.html             ← Registro de cuenta
├── pricing.html            ← Selección de plan + PayPal
├── dashboard.html          ← App financiera del usuario
├── paypal-webhook.php      ← Webhook de PayPal (subir a public_html/)
├── supabase-schema.sql     ← SQL para crear tablas en Supabase
└── SETUP.md                ← Este archivo
```

---

## PASO 1 — Supabase

1. Ve a https://supabase.com → New Project
2. Guarda: URL del proyecto + anon key + service role key
3. Ve a SQL Editor → pega y ejecuta `supabase-schema.sql`
4. Ve a Authentication → Providers → habilita Google OAuth:
   - Necesitas un Google Cloud project con OAuth credentials
   - Callback URL: `https://[tu-proyecto].supabase.co/auth/v1/callback`
5. En Authentication → URL Configuration:
   - Site URL: `https://horizen.com.mx`
   - Redirect URLs: `https://horizen.com.mx/dashboard.html`, `https://horizen.com.mx/pricing.html`

---

## PASO 2 — PayPal

1. Ve a https://developer.paypal.com → My Apps & Credentials
2. Crea una app Live → guarda Client ID y Client Secret
3. Ve a Subscriptions → Plans → crea 3 planes:
   - **Básico**: $990 MXN/mes, billing cycle: mensual
   - **Pro**: $1,990 MXN/mes, billing cycle: mensual
   - **Empresa**: $3,990 MXN/mes, billing cycle: mensual
4. Guarda los 3 Plan IDs (empiezan con `P-`)
5. Ve a Webhooks → Add Webhook:
   - URL: `https://horizen.com.mx/paypal-webhook.php`
   - Eventos: `BILLING.SUBSCRIPTION.ACTIVATED`, `BILLING.SUBSCRIPTION.CANCELLED`,
     `PAYMENT.SALE.COMPLETED`, `BILLING.SUBSCRIPTION.PAYMENT.FAILED`
   - Guarda el Webhook ID

---

## PASO 3 — Actualizar credenciales en los archivos

### assets/app.js
```javascript
const SUPABASE_URL = 'https://xxxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGci...';
const PAYPAL_CLIENT_ID = 'AYour-PayPal-Client-ID';
const PAYPAL_PLANS = {
  basico:  'P-XXXXXXXXXXXXXXXXXX',
  pro:     'P-XXXXXXXXXXXXXXXXXX',
  empresa: 'P-XXXXXXXXXXXXXXXXXX'
};
```

### paypal-webhook.php
```php
define('PAYPAL_CLIENT_ID',     'AYour-PayPal-Client-ID');
define('PAYPAL_CLIENT_SECRET', 'EYour-PayPal-Secret');
define('PAYPAL_WEBHOOK_ID',    'WH-XXXXXXXXXXXXXXXXXX');
define('SUPABASE_URL',         'https://xxxxx.supabase.co');
define('SUPABASE_SERVICE_KEY', 'eyJhbGci... (service_role key)');
```

---

## PASO 4 — Deploy a Hostinger

Archivos a subir a `public_html/`:

| Archivo local | Destino en Hostinger |
|---|---|
| `login.html` | `public_html/login.html` |
| `signup.html` | `public_html/signup.html` |
| `pricing.html` | `public_html/pricing.html` |
| `dashboard.html` | `public_html/dashboard.html` |
| `assets/app.js` | `public_html/assets/app.js` |
| `admin/dashboard.html` | `public_html/admin/dashboard.html` |
| `paypal-webhook.php` | `public_html/paypal-webhook.php` |

---

## PASO 5 — Configurar admin

Después de crear tu cuenta en el sitio, ejecuta en Supabase SQL Editor:

```sql
UPDATE public.profiles
SET is_admin = TRUE
WHERE id = (SELECT id FROM auth.users WHERE email = 'tu@email.com');
```

---

## Flujo completo de usuario

1. Usuario visita `horizen.com.mx` (landing page)
2. Clic en "Empezar gratis" → `signup.html`
3. Se registra → Supabase crea cuenta → redirige a `pricing.html`
4. Selecciona plan → paga con PayPal → redirige a `dashboard.html`
5. PayPal envía webhook → `paypal-webhook.php` actualiza Supabase
6. Usuario tiene acceso completo al dashboard financiero

## Flujo de admin

1. Eduardo visita `login.html`
2. Inicia sesión → sistema detecta `is_admin = true`
3. Redirige a `admin/dashboard.html`
4. Ve métricas de MRR, clientes, pagos en tiempo real
