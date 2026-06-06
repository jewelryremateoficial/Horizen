// ============================================================
// FinancialOS — Auth Module v1.1
// Centraliza: Google OAuth · Routing inteligente · Persistencia
// Cargar DESPUÉS de app.js (depende de: db, getProfile, PLANS)
// ============================================================

// ── Destinos OAuth ────────────────────────────────────────────
// URLs registradas en Supabase → Authentication → URL Configuration
const AUTH_REDIRECT_LOGIN  = 'https://horizen.com.mx/dashboard.html';
const AUTH_REDIRECT_SIGNUP = 'https://horizen.com.mx/pricing.html';

// ── Helper ────────────────────────────────────────────────────
function isAdminUser(user) {
  return user?.app_metadata?.is_admin === true ||
         user?.user_metadata?.is_admin === true;
}

// ── Google OAuth — Login ──────────────────────────────────────
// redirectTo debe estar en la lista de Supabase → URL Configuration
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
async function redirectAfterAuth(user) {
  if (!user) return;

  // Fast-path: app_metadata.is_admin (no pasa por RLS, siempre fiable)
  if (isAdminUser(user)) {
    window.location.replace('/admin/dashboard.html');
    return;
  }

  // Slow-path: leer plan del perfil
  try {
    const profile = await getProfile(user.id);
    if (profile?.is_admin) {
      window.location.replace('/admin/dashboard.html');
    } else if (!profile?.plan || profile.plan === 'free') {
      window.location.replace('/pricing.html');
    } else {
      window.location.replace('/dashboard.html');
    }
  } catch (_) {
    window.location.replace('/dashboard.html');
  }
}

// ── Auth State Listener ───────────────────────────────────────
// Se ejecuta automáticamente al cargar cualquier página que incluya auth.js.
// Maneja: callback OAuth (PKCE ?code=), restaurar sesión, sign-out.
(function setupAuthListener() {
  const path        = window.location.pathname;
  const isLogin     = /\/(login(\.html)?)?$/.test(path);   // / o /login o /login.html
  const isSignup    = path.includes('/signup');
  const isDash      = path.includes('/dashboard') && !path.includes('/admin');
  const isAdminDash = path.includes('/admin');
  const isProtected = isDash || isAdminDash || path.includes('/pricing');

  db.auth.onAuthStateChange(async (event, session) => {
    console.log('[Auth]', event, '|', path, '|', session?.user?.email || '—');

    // ── Sesión detectada (OAuth callback o restore de localStorage) ─
    if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
      const user = session.user;

      if (isLogin || isSignup) {
        // En página de auth → enrutar al destino correcto
        await redirectAfterAuth(user);
        return;
      }

      if (isDash && isAdminUser(user)) {
        // Admin aterrizó en dashboard normal → al admin dashboard
        window.location.replace('/admin/dashboard.html');
        return;
      }

      if (isAdminDash && !isAdminUser(user)) {
        // Usuario normal intentó entrar al admin → al dashboard normal
        window.location.replace('/dashboard.html');
        return;
      }
    }

    // ── Sesión cerrada → kick al login ────────────────────────────
    if (event === 'SIGNED_OUT' && isProtected) {
      window.location.replace('/login.html');
    }
  });
})();
