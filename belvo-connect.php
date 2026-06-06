<?php
header('Content-Type: application/json');

// ── 1. Credenciales con trim() ────────────────────────────────
$secret_id  = trim('b1c99559-5abb-4537-9293-bb6db898227c');
$secret_pwd = trim('qmn7GAxM0_bEZJ2TiHIsPWQZWZ7_@xW7uvkRdQr93k1CkzZ29oCJHTKA1x1K1n');
$endpoint   = 'https://sandbox.belvo.com/api/token/';

// ── 2. Basic Auth manual en base64 (neutraliza @ y chars especiales) ──
$basic = base64_encode($secret_id . ':' . $secret_pwd);

// ── 3. Body con scopes mínimos seguros ───────────────────────
$body = json_encode(['scopes' => 'read_institutions,write_links,read_links']);

// ── 5. Log: payload exacto que se va a mandar ─────────────────
$log = fopen(__DIR__ . '/belvo-connect.log', 'a');
fwrite($log, "\n" . str_repeat('-', 60) . "\n");
fwrite($log, date('Y-m-d H:i:s') . " | REQUEST\n");
fwrite($log, "endpoint : $endpoint\n");
fwrite($log, "body     : $body\n");
fwrite($log, "auth_len : " . strlen($basic) . " chars (base64)\n");

// ── 4. cURL con User-Agent de navegador ───────────────────────
$ch = curl_init($endpoint);
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_POSTFIELDS     => $body,
    CURLOPT_USERAGENT      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
    CURLOPT_HTTPHEADER     => [
        'Authorization: Basic ' . $basic,
        'Content-Type: application/json',
        'Content-Length: ' . strlen($body),
        'Accept: application/json',
    ],
]);

$response  = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_err  = curl_error($ch);
curl_close($ch);

// ── 5. Log: respuesta completa de Belvo ───────────────────────
$parsed   = json_decode($response, true) ?? [];
$req_id   = $parsed['request_id'] ?? '—';

fwrite($log, date('Y-m-d H:i:s') . " | RESPONSE\n");
fwrite($log, "http_code  : $http_code\n");
fwrite($log, "curl_error : " . ($curl_err ?: 'none') . "\n");
fwrite($log, "request_id : $req_id\n");
fwrite($log, "response   : " . json_encode(array_diff_key($parsed, ['access' => 1, 'refresh' => 1])) . "\n");
fclose($log);

// ── Errores ───────────────────────────────────────────────────
if ($curl_err) {
    http_response_code(500);
    echo json_encode(['error' => 'CURL falló', 'detail' => $curl_err]);
    exit;
}

if ($http_code === 401) {
    http_response_code(502);
    echo json_encode([
        'error'      => 'Belvo 401 — credenciales rechazadas',
        'request_id' => $req_id,
        'next'       => 'Lleva este request_id a app.belvo.com → Support',
    ]);
    exit;
}

if ($http_code >= 400) {
    http_response_code(502);
    echo json_encode([
        'error'      => "Belvo HTTP $http_code",
        'request_id' => $req_id,
        'detail'     => $parsed,
    ]);
    exit;
}

if (empty($parsed['access'])) {
    http_response_code(502);
    echo json_encode(['error' => 'Sin access token en respuesta', 'response' => $parsed]);
    exit;
}

// ── Éxito ─────────────────────────────────────────────────────
echo json_encode(['access_token' => $parsed['access']]);
