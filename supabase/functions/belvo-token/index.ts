/**
 * Horizen — Belvo Token Edge Function
 * Supabase Edge Function (Deno) que genera el access_token
 * para abrir el Belvo Connect Widget desde el frontend.
 *
 * Deploy:
 *   supabase functions deploy belvo-token --project-ref upcbznfkpswtxiffgsgj
 *
 * URL de producción:
 *   https://upcbznfkpswtxiffgsgj.supabase.co/functions/v1/belvo-token
 */

const BELVO_ID  = 'b1c99559-5abb-4537-9293-bb6db898227c';
const BELVO_PWD = 'qmn7GAxM0_bEZJ2TiHIsPWQZWZ7_@xW7uvkRdQr93k1CkzZ29oCJHTKA1x1K1n';
const BELVO_URL = 'https://sandbox.belvo.com/api/token/';

// CORS: permite peticiones desde horizen.com.mx y localhost (dev)
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin':  'https://horizen.com.mx',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

Deno.serve(async (req: Request): Promise<Response> => {

  // Preflight OPTIONS — el navegador lo manda antes de la petición real
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    // ── Basic Auth en base64 (Deno nativo, sin dependencias) ────
    const credentials = `${BELVO_ID}:${BELVO_PWD}`;
    const encoded     = btoa(credentials);            // btoa = base64 nativo en Deno

    // ── POST a Belvo Sandbox ─────────────────────────────────────
    const belvoRes = await fetch(BELVO_URL, {
      method:  'POST',
      headers: {
        'Authorization': `Basic ${encoded}`,
        'Content-Type':  'application/json',
        'Accept':        'application/json',
      },
      body: JSON.stringify({
        scopes: 'read_institutions,write_links,read_links',
      }),
    });

    const data = await belvoRes.json();

    // ── Error de Belvo → lo reenviamos con request_id ────────────
    if (!belvoRes.ok) {
      console.error('Belvo error:', belvoRes.status, data);
      return new Response(
        JSON.stringify({
          error:      `Belvo HTTP ${belvoRes.status}`,
          request_id: data?.request_id ?? null,
          detail:     data,
        }),
        {
          status:  502,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        }
      );
    }

    // ── Éxito: devolver solo el access token ─────────────────────
    return new Response(
      JSON.stringify({ access_token: data.access }),
      {
        status:  200,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      }
    );

  } catch (err) {
    console.error('Edge Function error:', err);
    return new Response(
      JSON.stringify({ error: 'Error interno', detail: String(err) }),
      {
        status:  500,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      }
    );
  }
});
