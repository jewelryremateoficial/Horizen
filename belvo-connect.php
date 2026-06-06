<?php
/**
 * FinancialOS / Horizen — Belvo Token Generator
 * ─────────────────────────────────────────────────────────────
 * Genera el access_token para el Belvo Connect Widget.
 * Usa HTTP Basic Auth con base64 manual (evita bugs de CURLOPT_USERPWD
 * con caracteres especiales en el password: @, _, *, etc.)
 *
 * Endpoint: GET /belvo-connect.php
 * Responde: { "access_token": "eyJ..." }  ← alimenta al Widget JS
 */

header('Content-Type: application/json');

// ── Credenciales Sandbox ──────────────────────────────────────
$secret_id  = 'b1c99559-5abb-4537-9293-bb6db898227c';
$secret_pwd = 'qmn7GAxM0_bEZJ2TiHIsPWQZWZ7_@xW7uvkRdQr93k1CkzZ29oCJHTKA1x1K1n';
$endpoint   = 'https://sandbox.belvo.com/api/token/';

// ── Build Basic Auth manualmente (100 % seguro con chars especiales) ──
// base64("secret_id:secret_password") — estándar RFC 7617
$basic_token = base64_encode($secret_id . ':' . $secret_pwd);

// ── Body: scopes requeridos por el Widget ─────────────────────
$body = json_encode([
    'scopes' => 'read_institutions,write_links,read_consents,write_consents,write_consent_callback,delete_consents'
]);

// ── cURL request ──────────────────────────────────────────────
$ch = curl_init($endpoint);
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_POSTFIELDS     => $body,
    CURLOPT_HTTPHEADER     => [
        'Authorization: Basic ' . $basic_token,
        'Content-Type: application/json',
        'Content-Length: ' . strlen($body),
    ],
]);

$response  = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_err  = curl_error($ch);
curl_close($ch);

// ── Log detallado (sin exponer llaves) ────────────────────────
$parsed   = json_decode($response, true) ?? [];
$req_id   = $parsed['request_id'] ?? '—';
$log_line = sprintf(
    "%s | HTTP %d | request_id: %s | curl_err: %s | body: %s\n",
    date('Y-m-d H:i:s'),
    $http_code,
    $req_id,
    $curl_err ?: 'none',
    // log solo campos seguros, nunca el token completo
    json_encode(array_diff_key($parsed, array_flip(['access', 'refresh'])))
);
file_put_contents(__DIR__ . '/belvo-connect.log', $log_line, FILE_APPEND);

// ── Manejo de errores ─────────────────────────────────────────
if ($curl_err) {
    http_response_code(500);
    echo json_encode(['error' => 'Conexión fallida', 'detail' => $curl_err]);
    exit;
}

if ($http_code === 401) {
    http_response_code(502);
    echo json_encode([
        'error'      => 'Credenciales inválidas (Belvo 401)',
        'request_id' => $req_id,
        'hint'       => 'Verifica que las API Keys estén activas en app.belvo.com → Sandbox',
    ]);
    exit;
}

if ($http_code >= 400) {
    http_response_code(502);
    echo json_encode([
        'error'      => "Belvo error HTTP $http_code",
        'request_id' => $req_id,
        'detail'     => $parsed,
    ]);
    exit;
}

if (empty($parsed['access'])) {
    http_response_code(502);
    echo json_encode(['error' => 'Belvo no devolvió access token', 'response' => $parsed]);
    exit;
}

// ── Éxito ─────────────────────────────────────────────────────
echo json_encode(['access_token' => $parsed['access']]);
