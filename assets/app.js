// ============================================================
// FinancialOS — Core App JS
// Supabase auth + utilities compartidos en todas las páginas
// ============================================================

const SUPABASE_URL = 'https://upcbznfkpswtxiffgsgj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_2rL4lnWnN_6c3h2KMRt8TA_yz2Bb8yZ';
const PAYPAL_CLIENT_ID = 'Ab9gde9vp6tmdo_5bc2w-jWtvA4xd_dwWuRoTBxSTJeyd77Gu2EQeOEsFhdd4RmanITAXlDDJKpv8wNI';

// PayPal Plan IDs (crear en PayPal Dashboard → Subscriptions → Plans)
const PAYPAL_PLANS = {
  basico:  'P-79321420JS938303KNIOSOJA',   // $990 MXN/mes
  pro:     'P-30241692SC5349045NIOSOJI',   // $1,990 MXN/mes
  empresa: 'P-2KG00541GJ147021VNIOSOJI'   // $3,990 MXN/mes
};

// Init Supabase
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
  const session = await requireAuth();
  if (!session) return null;
  const profile = await getProfile(session.user.id);
  if (!profile?.is_admin) { window.location.href = '/dashboard.html'; return null; }
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
  return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
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
    active:   { label: 'Activo',     color: '#10b981' },
    trial:    { label: 'Trial',      color: '#f59e0b' },
    cancelled:{ label: 'Cancelado',  color: '#f43f5e' },
    past_due: { label: 'Vencido',    color: '#f43f5e' }
  };
  const s = map[status] || { label: status, color: '#6b7280' };
  return `<span style="background:${s.color}22;color:${s.color};border:1px solid ${s.color}44;padding:.2rem .6rem;border-radius:50px;font-size:.7rem;font-weight:700;">${s.label}</span>`;
}

// ── Toast notifications ───────────────────────────────────
function toast(msg, type = 'success') {
  const el = document.createElement('div');
  const colors = { success: '#10b981', error: '#f43f5e', info: '#6366f1' };
  el.style.cssText = `position:fixed;bottom:24px;right:24px;background:#0d1526;border:1px solid ${colors[type]}44;
    color:#f0f4f8;padding:1rem 1.5rem;border-radius:12px;font-size:.88rem;font-weight:500;
    box-shadow:0 20px 40px rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;gap:.75rem;
    animation:slideIn .3s ease;max-width:360px;border-left:3px solid ${colors[type]}`;
  el.innerHTML = `<span style="font-size:1.1rem">${type==='success'?'✓':type==='error'?'✗':'ℹ'}</span><span>${msg}</span>`;
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
`;
document.head.appendChild(styleTag);
