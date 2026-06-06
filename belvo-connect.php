<?php
/**
 * FinancialOS — Belvo Token Generator
 * ─────────────────────────────────────────────────────────────
 * Genera un access_token de corta vida para el Belvo Widget.
 * Las credenciales NUNCA llegan al navegador.
 *
 * Endpoint: GET /belvo-connect.php
 * Responde: { "access_token": "eyJ..." }
 *
 * ▸ Obtén tus claves en: app.belvo.com → Settings → API Credentials
 * ▸ Sandbox usa bancos de prueba (sin datos reales) — ideal para desarrollo
 */

header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');

// ════════════════════════════════════════════════════════════
//  🔑  CREDENCIALES BELVO  ← pon las tuyas aquí
// ════════════════════════════════════════════════════════════
define('BELVO_SECRET_ID',       'b1c99559-5abb-4537-9293-bb6db898227c');
define('BELVO_SECRET_PASSWORD', 'qmn7GAxM0_bEZJ2TiHIsPWQZWZ7_@xW7uvkRdQr93k1CkzZ29oCJHTKA1x1K1n');
define('BELVO_ENV',             'sandbox');  // 'sandbox' | 'production'
// ════════════════════════════════════════════════════════════

$baseUrl = BELVO_ENV === 'production'
  ? 'https://api.belvo.com'
  : 'https://sandbox.belvo.com';

// ── Seguridad: solo aceptar peticiones del propio dominio ────
// Descomenta en producción y ajusta el dominio:
// $allowed = ['https://horizen.com.mx'];
// $origin  = $_SERVER['HTTP_ORIGIN'] ?? '';
// if (!in_array($origin, $allowed, true)) {
//   http_response_code(403);
//   echo json_encode(['error' => 'Forbidden']);
//   exit;
// }

// ── Logging ───────────────────────────────────────────────────
function belvo_log(string $msg): void {
  $logfile = __DIR__ . '/belvo-connect.log';
  file_put_contents($logfile, date('Y-m-d H:i:s') . ' | ' . $msg . PHP_EOL, FILE_APPEND);
}

// ── Scopes necesarios para cuentas + transacciones ───────────
$scopes = implode(',', [
  'read_institutions',
  'write_links',
  'read_links',
  'read_accounts',
  'read_transactions',
  'read_owners',
]);

// ── Llamada a Belvo API ───────────────────────────────────────
$ch = curl_init($baseUrl . '/api/token/');
curl_setopt_array($ch, [
  CURLOPT_POST           => true,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_USERPWD        => BELVO_SECRET_ID . ':' . BELVO_SECRET_PASSWORD,
  CURLOPT_POSTFIELDS     => json_encode(['scopes' => $scopes]),
  CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
  CURLOPT_TIMEOUT        => 15,
  CURLOPT_SSL_VERIFYPEER => true,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr  = curl_error($ch);
curl_close($ch);

if ($curlErr) {
  belvo_log("CURL error: $curlErr");
  http_response_code(500);
  echo json_encode(['error' => 'Error de conexión con Belvo']);
  exit;
}

if ($httpCode >= 400) {
  belvo_log("Belvo token error $httpCode: $response");
  http_response_code(502);
  echo json_encode([
    'error' => 'No se pudo obtener el token de Belvo',
    'code'  => $httpCode,
    'hint'  => 'Verifica tus credenciales en belvo-connect.php',
  ]);
  exit;
}

$data = json_decode($response, true);

if (empty($data['access'])) {
  belvo_log("Belvo token vacío. Respuesta: $response");
  http_response_code(500);
  echo json_encode(['error' => 'Token de Belvo inválido']);
  exit;
}

belvo_log("Token generado OK ($httpCode)");
echo json_encode(['access_token' => $data['access']]);
