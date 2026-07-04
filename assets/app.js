// ============================================================
// FinancialOS — Core App JS
// Supabase auth + utilities compartidos en todas las páginas
// ============================================================

const SUPABASE_URL = 'https://upcbznfkpswtxiffgsgj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_2rL4lnWnN_6c3h2KMRt8TA_yz2Bb8yZ';
const PAYPAL_CLIENT_ID = 'Ab9gde9vp6tmdo_5bc2w-jWtvA4xd_dwWuRoTBxSTJeyd77Gu2EQeOEsFhdd4RmanITAXlDDJKpv8wNI';

// PayPal Plan IDs
const PAYPAL_PLANS = {
  basico:  'P-79321420JS938303KNIOSOJA',   // $990 MXN/mes
  pro:     'P-30241692SC5349045NIOSOJI',   // $1,990 MXN/mes
  empresa: 'P-2KG00541GJ147021VNIOSOJI'   // $3,990 MXN/mes
};

// ── Init Supabase ─────────────────────────────────────────
// flowType: 'pkce' → tokens vienen como ?code= (query param),
// NO como #access_token (hash). Los query params SÍ se preservan
// en redirects del servidor; el hash se pierde. Crítico para OAuth.
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    flowType:           'pkce',  // OAuth seguro; tokens en URL param, no en hash
    detectSessionInUrl:  true,   // detecta ?code= al cargar la página
    persistSession:      true,   // guarda sesión en localStorage
    autoRefreshToken:    true    // renueva el token antes de que expire
  }
});

// ── Auth helpers ──────────────────────────────────────────
async function getSession() {
  const { data } = await db.auth.getSession();
  return data.session;
}

async function getUser() {
  const { data } = await db.auth.getUser();
  return data.user;
}

async function getProfile(userId) {
  const { data } = await db.from('profiles').select('*').eq('id', userId).single();
  return data;
}

async function requireAuth(redirectTo = '/login.html') {
  const session = await getSession();
  if (!session) { window.location.href = redirectTo; return null; }
  return session;
}

async function requireAdmin() {
  const session = await requireAuth('/login.html');
  if (!session) return null;
  const user = session.user;
  // Check JWT app_metadata first (no RLS, always reliable)
  const isAdminMeta = user?.app_metadata?.is_admin === true ||
                      user?.user_metadata?.is_admin === true;
  let profile = {};
  try { profile = (await getProfile(user.id)) || {}; } catch(e) {}
  // Fallback: check profiles.is_admin column from DB
  if (!isAdminMeta && !profile.is_admin) {
    window.location.href = '/dashboard.html'; return null;
  }
  return { session, profile };
}

async function signOut() {
  await db.auth.signOut();
  window.location.href = '/login.html';
}

// ── Format helpers ────────────────────────────────────────
function fmt(n, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(n);
}

function fmtDate(d) {
  // Fechas sin hora ("YYYY-MM-DD") se anclan a mediodía LOCAL.
  // Sin esto, JS las toma como medianoche UTC y en México se muestran
  // con un día menos (y un AÑO menos si la fecha es 1 de enero).
  const s = String(d || '');
  const safe = /^\d{4}-\d{2}-\d{2}$/.test(s) ? s + 'T12:00:00' : d;
  return new Date(safe).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Convierte una fecha a objeto Date anclado a mediodía local si viene sin hora
// (evita el corrimiento de día/año por zona horaria en México)
function dateLocal(d) {
  const s = String(d || '');
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? s + 'T12:00:00' : d);
}

function fmtRelative(d) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora mismo';
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  return fmtDate(d);
}

// ── Plan helpers ──────────────────────────────────────────
const PLANS = {
  basico:  { name: 'Básico',  price: 990,  color: '#6366f1' },
  pro:     { name: 'Pro',     price: 1990, color: '#00d4aa' },
  empresa: { name: 'Empresa', price: 3990, color: '#f59e0b' },
  free:    { name: 'Trial',   price: 0,    color: '#6b7280' }
};

function planBadge(plan) {
  const p = PLANS[plan] || PLANS.free;
  return `<span style="background:${p.color}22;color:${p.color};border:1px solid ${p.color}44;padding:.2rem .6rem;border-radius:50px;font-size:.7rem;font-weight:700;letter-spacing:.4px;">${p.name}</span>`;
}

function statusBadge(status) {
  const map = {
    active:   { label: 'Activo',     color: '#0a7a55' },
    trial:    { label: 'Trial',      color: '#f59e0b' },
    cancelled:{ label: 'Cancelado',  color: '#b3093c' },
    past_due: { label: 'Vencido',    color: '#b3093c' }
  };
  const s = map[status] || { label: status, color: '#6b7280' };
  return `<span style="background:${s.color}22;color:${s.color};border:1px solid ${s.color}44;padding:.2rem .6rem;border-radius:50px;font-size:.7rem;font-weight:700;">${s.label}</span>`;
}

// ── Toast notifications (Calma Premium: tema claro) ──────────
// Tipos: 'success' (alias 'ok'), 'error', 'info'. Estado del
// sistema — aquí SÍ vive la semántica éxito/error.
function toast(msg, type = 'success') {
  const el = document.createElement('div');
  const colors = {
    success: 'var(--state-ok, #0a7a55)',
    ok:      'var(--state-ok, #0a7a55)',   // alias: antes caía a undefined
    error:   'var(--state-err, #b3093c)',
    info:    '#635bff'
  };
  const accent = colors[type] || colors.info;
  const isOk  = type === 'success' || type === 'ok';
  const isErr = type === 'error';
  el.style.cssText = `position:fixed;bottom:24px;right:24px;background:#ffffff;border:1px solid rgba(10,37,64,.08);
    color:var(--ink, #0a2540);padding:1rem 1.5rem;border-radius:12px;font-size:.88rem;font-weight:500;
    box-shadow:var(--shadow-2, 0 4px 16px -4px rgba(10,37,64,.12));z-index:9999;display:flex;align-items:center;gap:.75rem;
    animation:slideIn .3s ease;max-width:360px;border-left:3px solid ${accent}`;
  el.innerHTML = `<span style="font-size:1.1rem;color:${accent}">${isOk ? '✓' : isErr ? '✗' : 'ℹ'}</span><span>${msg}</span>`;
  document.body.appendChild(el);
  setTimeout(() => { el.style.animation = 'slideOut .3s ease forwards'; setTimeout(() => el.remove(), 300); }, 3500);
}

// ── Supabase realtime ─────────────────────────────────────
function subscribeToTable(table, callback) {
  return db.channel(`${table}-changes`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
    .subscribe();
}

// ── Global CSS animations ─────────────────────────────────
const styleTag = document.createElement('style');
styleTag.textContent = `
  @keyframes slideIn { from { transform: translateX(120%); opacity:0 } to { transform: translateX(0); opacity:1 } }
  @keyframes slideOut { from { transform: translateX(0); opacity:1 } to { transform: translateX(120%); opacity:0 } }
  @keyframes fadeIn { from { opacity:0; transform: translateY(8px) } to { opacity:1; transform: translateY(0) } }
  @keyframes pulse2 { 0%,100% { opacity:1 } 50% { opacity:.4 } }
  .fade-in { animation: fadeIn .4s ease forwards }
  .skeleton { background: linear-gradient(90deg, rgba(255,255,255,.04) 25%, rgba(255,255,255,.08) 50%, rgba(255,255,255,.04) 75%);
    background-size: 400% 100%; animation: shimmer 1.5s infinite; border-radius: 6px; }
  @keyframes shimmer { 0% { background-position:100% 0 } 100% { background-position:-100% 0 } }
  @media (prefers-reduced-motion: reduce) {
    .fade-in, .skeleton { animation: none !important; }
    [style*="animation:slideIn"], [style*="animation: slideIn"] { animation: none !important; }
  }
`;
document.head.appendChild(styleTag);
