<?php
/**
 * FinancialOS — PayPal Webhook Handler
 * Sube este archivo a: public_html/paypal-webhook.php
 * Configura en PayPal Developer → Webhooks:
 *   URL: https://horizen.com.mx/paypal-webhook.php
 *   Eventos: BILLING.SUBSCRIPTION.ACTIVATED, BILLING.SUBSCRIPTION.CANCELLED,
 *            PAYMENT.SALE.COMPLETED, BILLING.SUBSCRIPTION.PAYMENT.FAILED
 */

// Credenciales
define('PAYPAL_CLIENT_ID',     'Ab9gde9vp6tmdo_5bc2w-jWtvA4xd_dwWuRoTBxSTJeyd77Gu2EQeOEsFhdd4RmanITAXlDDJKpv8wNI');
define('PAYPAL_CLIENT_SECRET', 'EL8hc2KDF2vSLTcswfMuO-YWWQOG-hQGVW9dWmx1ifBEuCeoYM1OOYG5SxvzCn8JSmYhfpUpstO-H8GX');
define('PAYPAL_WEBHOOK_ID',    '4KL64234YG1820715');

define('SUPABASE_URL',         'https://upcbznfkpswtxiffgsgj.supabase.co');
define('SUPABASE_SERVICE_KEY', 'SUPABASE_SERVICE_ROLE_KEY_PENDING');  // TODO: service_role key de Supabase Settings → API

define('PAYPAL_API',           'https://api-m.paypal.com');  // cambiar a sandbox para pruebas

// ── Logging ───────────────────────────────────────────────────
function log_event($msg) {
    $logfile = __DIR__ . '/paypal-webhook.log';
    $line = date('Y-m-d H:i:s') . ' | ' . $msg . PHP_EOL;
    file_put_contents($logfile, $line, FILE_APPEND);
}

// ── Supabase REST helper ──────────────────────────────────────
function supabase_request($method, $path, $data = null) {
    $url = SUPABASE_URL . '/rest/v1/' . $path;
    $headers = [
        'Content-Type: application/json',
        'apikey: ' . SUPABASE_SERVICE_KEY,
        'Authorization: Bearer ' . SUPABASE_SERVICE_KEY,
        'Prefer: return=minimal'
    ];
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    if ($data) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    $response = curl_exec($ch);
    $status   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['status' => $status, 'body' => json_decode($response, true)];
}

// ── PayPal access token ───────────────────────────────────────
function get_paypal_token() {
    $ch = curl_init(PAYPAL_API . '/v1/oauth2/token');
    curl_setopt($ch, CURLOPT_USERPWD, PAYPAL_CLIENT_ID . ':' . PAYPAL_CLIENT_SECRET);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, 'grant_type=client_credentials');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $result = json_decode(curl_exec($ch), true);
    curl_close($ch);
    return $result['access_token'] ?? null;
}

// ── Verify PayPal webhook signature ──────────────────────────
function verify_paypal_webhook($headers, $body) {
    $token = get_paypal_token();
    if (!$token) return false;

    $verifyData = [
        'auth_algo'         => $headers['PAYPAL-AUTH-ALGO'] ?? '',
        'cert_url'          => $headers['PAYPAL-CERT-URL'] ?? '',
        'transmission_id'   => $headers['PAYPAL-TRANSMISSION-ID'] ?? '',
        'transmission_sig'  => $headers['PAYPAL-TRANSMISSION-SIG'] ?? '',
        'transmission_time' => $headers['PAYPAL-TRANSMISSION-TIME'] ?? '',
        'webhook_id'        => PAYPAL_WEBHOOK_ID,
        'webhook_event'     => json_decode($body, true)
    ];

    $ch = curl_init(PAYPAL_API . '/v1/notifications/verify-webhook-signature');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($verifyData));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $token
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $result = json_decode(curl_exec($ch), true);
    curl_close($ch);

    return ($result['verification_status'] ?? '') === 'SUCCESS';
}

// ── Plan mapping ──────────────────────────────────────────────
function plan_from_subscription($subscription_id) {
    $result = supabase_request('GET',
        'profiles?paypal_subscription_id=eq.' . urlencode($subscription_id) . '&select=plan'
    );
    return $result['body'][0]['plan'] ?? 'basico';
}

// ── Main ──────────────────────────────────────────────────────
$raw_body = file_get_contents('php://input');
$headers  = [];
foreach ($_SERVER as $k => $v) {
    if (str_starts_with($k, 'HTTP_PAYPAL_')) {
        $key = str_replace(['HTTP_', '_'], ['', '-'], $k);
        $headers[$key] = $v;
    }
}

log_event('Webhook recibido: ' . substr($raw_body, 0, 200));

// Verifica firma (comenta en desarrollo/sandbox si tienes problemas)
// if (!verify_paypal_webhook($headers, $raw_body)) {
//     log_event('ERROR: Firma inválida');
//     http_response_code(401);
//     exit('Unauthorized');
// }

$event    = json_decode($raw_body, true);
$type     = $event['event_type'] ?? '';
$resource = $event['resource'] ?? [];

log_event("Evento: $type");

switch ($type) {

    // ── Suscripción activada ───────────────────────────────
    case 'BILLING.SUBSCRIPTION.ACTIVATED':
        $sub_id = $resource['id'] ?? '';
        // Busca usuario por subscription_id o custom_id
        $custom_id = $resource['custom_id'] ?? ''; // user_id que pasaste al crear
        if ($custom_id) {
            $plan = plan_from_subscription($sub_id) ?: 'basico';
            supabase_request('PATCH', 'profiles?id=eq.' . urlencode($custom_id), [
                'plan'                    => $plan,
                'subscription_status'     => 'active',
                'paypal_subscription_id'  => $sub_id,
                'subscription_started_at' => date('c')
            ]);
            log_event("Suscripción activada para user $custom_id plan=$plan");
        }
        break;

    // ── Pago completado ───────────────────────────────────
    case 'PAYMENT.SALE.COMPLETED':
        $sub_id    = $resource['billing_agreement_id'] ?? '';
        $amount    = $resource['amount']['total'] ?? 0;
        $currency  = $resource['amount']['currency'] ?? 'MXN';
        $payment_id = $resource['id'] ?? '';

        // Obtener user_id del perfil
        $profileResult = supabase_request('GET',
            'profiles?paypal_subscription_id=eq.' . urlencode($sub_id) . '&select=id,plan'
        );
        $profile = $profileResult['body'][0] ?? null;

        if ($profile) {
            supabase_request('POST', 'payments', [
                'user_id'               => $profile['id'],
                'paypal_subscription_id'=> $sub_id,
                'paypal_payment_id'     => $payment_id,
                'amount'                => floatval($amount),
                'currency'              => $currency,
                'plan'                  => $profile['plan'],
                'status'                => 'completed'
            ]);
            // Asegurar que plan esté activo
            supabase_request('PATCH', 'profiles?id=eq.' . urlencode($profile['id']), [
                'subscription_status' => 'active'
            ]);
            log_event("Pago registrado: $payment_id user={$profile['id']} amount=$amount $currency");
        }
        break;

    // ── Suscripción cancelada ─────────────────────────────
    case 'BILLING.SUBSCRIPTION.CANCELLED':
        $sub_id = $resource['id'] ?? '';
        supabase_request('PATCH',
            'profiles?paypal_subscription_id=eq.' . urlencode($sub_id),
            ['subscription_status' => 'cancelled', 'plan' => 'free']
        );
        log_event("Suscripción cancelada: $sub_id");
        break;

    // ── Pago fallido ──────────────────────────────────────
    case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
        $sub_id = $resource['id'] ?? '';
        supabase_request('PATCH',
            'profiles?paypal_subscription_id=eq.' . urlencode($sub_id),
            ['subscription_status' => 'past_due']
        );
        log_event("Pago fallido para suscripción: $sub_id");
        break;
}

http_response_code(200);
echo 'OK';
