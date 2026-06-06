// ============================================================
// FinancialOS — Auth Module v1.0
// Centraliza: Google OAuth · Routing inteligente · Persistencia
// Cargar DESPUÉS de app.js (depende de: db, getProfile, PLANS)
// ============================================================

// ── Destinos OAuth ────────────────────────────────────────────
// Siempre redirigimos al dashboard regular; él decide si el
// usuario es admin y reenvía a /admin/dashboard.
const AUTH_REDIRECT_LOGIN  = 'https://horizen.com.mx/dashboard';
const AUTH_REDIRECT_SIGNUP = 'https://horizen.com.mx/pricing';

// ── Helper ────────────────────────────────────────────────────
function isAdminUser(user) {
  return user?.app_metadata?.is_admin === true ||
         user?.user_metadata?.is_admin === true;
}

// ── Google OAuth — Login ──────────────────────────────────────
async function loginWithGoogle() {
  const { error } = await db.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo:  AUTH_REDIRECT_LOGIN,
      queryParams: { access_type: 'offline', prompt: 'select_account' }
    }
  });
  if (error) {
    console.error('[Auth] Google login error:', error);
    if (typeof toast === 'function') toast(error.message, 'error');
  }
}

// ── Google OAuth — Signup ─────────────────────────────────────
async function signupWithGoogle() {
  const { error } = await db.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo:  AUTH_REDIRECT_SIGNUP,
      queryParams: { access_type: 'offline', prompt: 'consent' }
    }
  });
  if (error) {
    console.error('[Auth] Google signup error:', error);
    if (typeof toast === 'function') toast(error.message, 'error');
  }
}

// ── Routing inteligente post-autenticación ────────────────────
// Llamar después de password-login Y como admin-guard en dashboard.
// Orden de prioridad:
//   1. app_metadata.is_admin (set en Supabase, nunca lo pone el usuario)
//   2. profile.is_admin      (tabla profiles)
//   3. plan === free / null  → /pricing   (aún no paga)
//   4. cualquier otro plan   → /dashboard
async function redirectAfterAuth(user) {
  if (!user) return;

  // Fast-path: metadata de auth (no pasa por RLS, siempre fiable)
  if (isAdminUser(user)) {
    window.location.replace('/admin/dashboard');
    return;
  }

  // Slow-path: perfil en base de datos
  try {
    const profile = await getProfile(user.id);
    if (profile?.is_admin) {
      window.location.replace('/admin/dashboard');
    } else if (!profile?.plan || profile.plan === 'free') {
      window.location.replace('/pricing');
    } else {
      window.location.replace('/dashboard');
    }
  } catch (_) {
    window.location.replace('/dashboard');
  }
}

// ── Auth State Listener ───────────────────────────────────────
// Detecta automáticamente:
//   • Callback OAuth (SIGNED_IN después del redirect de Google)
//   • Sesión existente al refrescar (INITIAL_SESSION)
//   • Cierre de sesión (SIGNED_OUT)
//
// Reglas por página:
//   /login  /signup  → si hay sesión, redirigir al destino correcto
//   /dashboard       → si es admin, mover a /admin/dashboard
//   /admin/dashboard → si NO es admin, mover a /dashboard
//   cualquier página protegida → si SIGNED_OUT, ir a /login

(function setupAuthListener() {
  const path       = window.location.pathname;
  const isLogin    = path.includes('/login')  || path.includes('/login.html');
  const isSignup   = path.includes('/signup') || path.includes('/signup.html');
  const isDash     = path.includes('/dashboard') && !path.includes('/admin');
  const isAdminDash= path.includes('/admin');
  const isProtected= isDash || isAdminDash || path.includes('/pricing');

  db.auth.onAuthStateChange(async (event, session) => {
    console.log('[Auth]', event, session?.user?.email || '—');

    // Sesión iniciada (OAuth callback o restauración de localStorage)
    if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
      const user = session.user;

      if (isLogin || isSignup) {
        // Páginas de auth → redirigir al destino correcto
        await redirectAfterAuth(user);
        return;
      }

      if (isDash && isAdminUser(user)) {
        // Admin aterrizó en dashboard normal → mover al admin dashboard
        window.location.replace('/admin/dashboard');
        return;
      }

      if (isAdminDash && !isAdminUser(user)) {
        // Usuario normal intentó entrar al admin → mover a dashboard
        window.location.replace('/dashboard');
        return;
      }
    }

    // Sesión cerrada → kick a login
    if (event === 'SIGNED_OUT' && isProtected) {
      window.location.replace('/login');
    }
  });
})();

// ── Verificar sesión al cargar (para OAuth hash en URL) ───────
// Supabase v2 auto-detecta el #access_token en la URL al cargar;
// onAuthStateChange dispara automáticamente. Esta función es solo
// para diagnóstico / uso manual.
async function checkSession() {
  const { data: { session } } = await db.auth.getSession();
  return session;
}
