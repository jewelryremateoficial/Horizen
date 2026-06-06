<?php
/**
 * FinancialOS — Belvo Token Generator
 * Genera el access_token para abrir el Belvo Connect Widget.
 * Endpoint: GET /belvo-connect.php
 */

header('Content-Type: application/json');

// ── Credenciales hardcodeadas (Sandbox) ──────────────────────
$belvo_id       = 'b1c99559-5abb-4537-9293-bb6db898227c';
$belvo_password = 'qmn7GAxM0_bEZJ2TiHIsPWQZWZ7_@xW7uvkRdQr93k1CkzZ29oCJHTKA1x1K1n';
$belvo_url      = 'https://sandbox.belvo.com/api/token/';

// ── Llamada a Belvo API (sin scopes — no necesarios para Sandbox) ──
$ch = curl_init($belvo_url);
curl_setopt_array($ch, [
  CURLOPT_POST           => true,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_USERPWD        => $belvo_id . ':' . $belvo_password,
  CURLOPT_POSTFIELDS     => '{}',
  CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
  CURLOPT_TIMEOUT        => 15,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr  = curl_error($ch);
curl_close($ch);

// ── Log para diagnóstico ──────────────────────────────────────
file_put_contents(__DIR__ . '/belvo-connect.log',
  date('Y-m-d H:i:s') . " | HTTP $httpCode | $response\n", FILE_APPEND);

if ($curlErr) {
  http_response_code(500);
  echo json_encode(['error' => 'CURL: ' . $curlErr]);
  exit;
}

if ($httpCode >= 400) {
  http_response_code(502);
  echo json_encode(['error' => "Belvo HTTP $httpCode", 'detail' => $response]);
  exit;
}

$data = json_decode($response, true);
echo json_encode(['access_token' => $data['access'] ?? null]);
