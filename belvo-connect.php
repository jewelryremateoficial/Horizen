<?php
/**
 * FinancialOS — Belvo Token Generator
 * Genera el access_token para abrir el Belvo Connect Widget.
 * Endpoint: GET /belvo-connect.php
 */

header('Content-Type: application/json');

$belvo_url = 'https://sandbox.belvo.com/api/token/';

$data = array(
    'id'       => 'b1c99559-5abb-4537-9293-bb6db898227c',
    'password' => 'qmn7GAxM0_bEZJ2TiHIsPWQZWZ7_@xW7uvkRdQr93k1CkzZ29oCJHTKA1x1K1n',
    'scopes'   => 'read_institutions,write_links,read_consents,write_consents,write_consent_callback,delete_consents'
);

$payload = json_encode($data);

$ch = curl_init($belvo_url);
curl_setopt($ch, CURLOPT_POST,           true);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT,        60);
curl_setopt($ch, CURLOPT_POSTFIELDS,     $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER,     array('Content-Type: application/json'));

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr  = curl_error($ch);
curl_close($ch);

// Log para diagnóstico
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

$result = json_decode($response, true);
echo json_encode(['access_token' => $result['access'] ?? null]);
