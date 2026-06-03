<?php
/**
 * FinancialOS — Belvo Sync Engine
 * ─────────────────────────────────────────────────────────────
 * Recibe el link_id del widget de Belvo y sincroniza:
 *   ✓ Cuentas          → tabla accounts  (upsert por belvo_account_id)
 *   ✓ Deudas TDC/Loan  → tabla debts     (upsert + cutting_date, minimum_payment)
 *   ✓ Transacciones    → tabla transactions (upsert por belvo_tx_id, últimos 90d)
 *   ✓ Log de sync      → tabla sync_logs
 *
 * Endpoint: POST /belvo-sync.php
 * Body:     { "link_id": "...", "institution_name": "...", "user_id": "...", "token": "..." }
 * Responde: { "success": true, "accounts": N, "transactions": N }
 */

header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');

// ════════════════════════════════════════════════════════════
//  🔑  CREDENCIALES  ← mismas que en belvo-connect.php
// ════════════════════════════════════════════════════════════
define('BELVO_SECRET_ID',       'd3357bc7-ecb2-4621-9031-1b5cf0f38568');
define('BELVO_SECRET_PASSWORD', 'P8Crbc7kprSDyKcbV1nhUClY9SaWGtIsNprENJWtUof7vgwXfTQ8Q08*L30qrYs1');
define('BELVO_ENV',             'sandbox');

define('SUPABASE_URL',          'https://upcbznfkpswtxiffgsgj.supabase.co');
define('SUPABASE_SERVICE_KEY',  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwY2J6bmZrcHN3dHhpZmZnc2dqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDE2NjE1OCwiZXhwIjoyMDk1NzQyMTU4fQ.U3LbBJUeFKBvyar0zJp1Q9cDOjKNTXdt3J5xHB1NZdY');
// ════════════════════════════════════════════════════════════

$belvoBase = BELVO_ENV === 'production'
  ? 'https://api.belvo.com'
  : 'https://sandbox.belvo.com';

// ── Logging ───────────────────────────────────────────────────
function belvo_sync_log(string $msg): void {
  file_put_contents(__DIR__ . '/belvo-sync.log',
    date('Y-m-d H:i:s') . ' | ' . $msg . PHP_EOL, FILE_APPEND);
}

// ── Leer body ─────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['error' => 'Method not allowed']);
  exit;
}

$body = json_decode(file_get_contents('php://input'), true);
$link_id          = trim($body['link_id']          ?? '');
$institution_name = trim($body['institution_name'] ?? 'Banco');
$user_id          = trim($body['user_id']          ?? '');
$access_token     = trim($body['token']            ?? '');

if (!$link_id || !$user_id) {
  http_response_code(400);
  echo json_encode(['error' => 'Faltan parámetros: link_id y user_id son requeridos']);
  exit;
}

belvo_sync_log("Inicio sync | user=$user_id | link=$link_id | inst=$institution_name");

// ════════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════════

/** Llama a la API de Belvo con Basic Auth */
function belvo_get(string $path): ?array {
  global $belvoBase;
  $url = $belvoBase . $path;
  $ch  = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_USERPWD        => BELVO_SECRET_ID . ':' . BELVO_SECRET_PASSWORD,
    CURLOPT_HTTPHEADER     => ['Accept: application/json'],
    CURLOPT_TIMEOUT        => 30,
  ]);
  $res  = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  if ($code >= 400 || !$res) { belvo_sync_log("Belvo GET $path → $code: $res"); return null; }
  return json_decode($res, true);
}

/** Upsert en Supabase vía REST API */
function supabase_upsert(string $table, array $rows, string $on_conflict = 'id'): array {
  if (empty($rows)) return ['ok' => 0, 'err' => 0];

  $url = SUPABASE_URL . '/rest/v1/' . $table . '?on_conflict=' . $on_conflict;
  $ch  = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_CUSTOMREQUEST  => 'POST',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POSTFIELDS     => json_encode($rows),
    CURLOPT_HTTPHEADER     => [
      'Content-Type: application/json',
      'apikey: '          . SUPABASE_SERVICE_KEY,
      'Authorization: Bearer ' . SUPABASE_SERVICE_KEY,
      'Prefer: resolution=merge-duplicates,return=minimal',
    ],
    CURLOPT_TIMEOUT => 30,
  ]);
  $res  = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);

  if ($code >= 400) {
    belvo_sync_log("Supabase upsert $table → $code: $res");
    return ['ok' => 0, 'err' => count($rows)];
  }
  return ['ok' => count($rows), 'err' => 0];
}

// Mapa de tipos Belvo → nuestro schema
function map_account_type(string $belvo_type): string {
  return match (strtoupper($belvo_type)) {
    'CHECKING_ACCOUNT', 'CURRENT_ACCOUNT'   => 'CHECKING',
    'SAVINGS_ACCOUNT'                        => 'SAVINGS',
    'CREDIT_CARD'                            => 'CREDIT_CARD',
    'LOAN_ACCOUNT', 'MORTGAGE_ACCOUNT'       => 'LOAN',
    'INVESTMENT_ACCOUNT', 'PENSION_ACCOUNT'  => 'INVESTMENT',
    default                                  => 'CHECKING',
  };
}

function map_tx_type(string $belvo_type): string {
  return match (strtoupper($belvo_type)) {
    'INFLOW'  => 'ingreso',
    'OUTFLOW' => 'egreso',
    default   => 'transferencia',
  };
}

// ════════════════════════════════════════════════════════════
//  PASO 1 — Crear log de sync
// ════════════════════════════════════════════════════════════
$logRow = [
  'user_id'    => $user_id,
  'source'     => 'belvo',
  'status'     => 'processing',
  'metadata'   => json_encode([
    'link_id'          => $link_id,
    'institution_name' => $institution_name,
  ]),
  'started_at' => date('c'),
];
supabase_upsert('sync_logs', [$logRow]);

// Buscar el ID del log recién creado para actualizar al final
$logId = null;
{
  $url = SUPABASE_URL . '/rest/v1/sync_logs?user_id=eq.' . urlencode($user_id)
       . '&source=eq.belvo&status=eq.processing&order=created_at.desc&limit=1';
  $ch  = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => [
      'apikey: '           . SUPABASE_SERVICE_KEY,
      'Authorization: Bearer ' . SUPABASE_SERVICE_KEY,
    ],
  ]);
  $res = json_decode(curl_exec($ch), true);
  curl_close($ch);
  $logId = $res[0]['id'] ?? null;
}

$stats = ['accounts_ok' => 0, 'debts_ok' => 0, 'tx_ok' => 0, 'errors' => []];

// ════════════════════════════════════════════════════════════
//  PASO 2 — Obtener cuentas de Belvo
// ════════════════════════════════════════════════════════════
$belvoAccounts = belvo_get('/api/accounts/?link=' . urlencode($link_id) . '&limit=100');
$belvoAccountsList = $belvoAccounts['results'] ?? $belvoAccounts ?? [];

belvo_sync_log("Cuentas Belvo recibidas: " . count($belvoAccountsList));

$accRows   = [];
$debtRows  = [];
$accIdMap  = []; // belvo_account_id → nuestra PK (para cruzar con transacciones)

foreach ($belvoAccountsList as $acc) {
  $belvoAccId = $acc['id']   ?? null;
  if (!$belvoAccId) continue;

  $type = map_account_type($acc['type'] ?? 'CHECKING_ACCOUNT');
  $last4 = null;
  if (!empty($acc['number'])) {
    $num   = preg_replace('/\D/', '', $acc['number']);
    $last4 = strlen($num) >= 4 ? substr($num, -4) : $acc['number'];
  }

  $row = [
    'user_id'          => $user_id,
    'name'             => $acc['name']                     ?? ($institution_name . ' ' . $type),
    'type'             => $type,
    'institution_name' => $acc['institution']['name']      ?? $institution_name,
    'currency'         => $acc['currency']                 ?? 'MXN',
    'balance_current'  => (float)($acc['balance']['current']  ?? 0),
    'balance_available'=> (float)($acc['balance']['available'] ?? $acc['balance']['current'] ?? 0),
    'credit_limit'     => isset($acc['credit_data']['credit_limit'])
                            ? (float)$acc['credit_data']['credit_limit'] : null,
    'last4'            => $last4,
    'belvo_account_id' => $belvoAccId,
    'last_synced_at'   => date('c'),
    'is_active'        => true,
  ];
  $accRows[] = $row;

  // ── Deuda: si es TDC o préstamo, sincronizar credit_data ─────
  $cd = $acc['credit_data'] ?? null;
  if ($cd && in_array($type, ['CREDIT_CARD', 'LOAN'], true)) {
    $debtRows[] = [
      'user_id'             => $user_id,
      'name'                => $acc['name'] ?? ($institution_name . ' TDC'),
      'type'                => $type === 'CREDIT_CARD' ? 'credit_card' : 'bank_loan',
      'institution'         => $acc['institution']['name'] ?? $institution_name,
      'outstanding_balance' => abs((float)($acc['balance']['current']   ?? 0)),
      'total_amount'        => (float)($cd['credit_limit']              ?? 0),
      'minimum_payment'     => (float)($cd['minimum_payment']           ?? 0),
      'cutting_date'        => !empty($cd['cutting_date'])
                                ? date('Y-m-d', strtotime($cd['cutting_date'])) : null,
      'next_payment_date'   => !empty($cd['next_payment_date'])
                                ? date('Y-m-d', strtotime($cd['next_payment_date'])) : null,
      'last_payment_date'   => !empty($cd['last_payment_date'])
                                ? date('Y-m-d', strtotime($cd['last_payment_date'])) : null,
      'interest_rate'       => isset($cd['interest_rate'])
                                ? ((float)$cd['interest_rate'] > 1
                                    ? (float)$cd['interest_rate'] / 100  // ya viene en %
                                    : (float)$cd['interest_rate'])       // ya está en decimal
                                : 0,
      'belvo_account_id'    => $belvoAccId,
      'is_active'           => true,
      'raw_data'            => json_encode($cd),
    ];
  }
}

// Upsert cuentas
if ($accRows) {
  $r = supabase_upsert('accounts', $accRows, 'belvo_account_id');
  $stats['accounts_ok'] = $r['ok'];
  belvo_sync_log("Cuentas upserted: {$r['ok']} OK, {$r['err']} ERR");

  // Construir mapa belvo_id → Supabase UUID para cruzar transacciones
  $url = SUPABASE_URL . '/rest/v1/accounts?user_id=eq.' . urlencode($user_id)
       . '&belvo_account_id=not.is.null&select=id,belvo_account_id';
  $ch  = curl_init($url);
  curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true, CURLOPT_HTTPHEADER=>[
    'apikey: ' . SUPABASE_SERVICE_KEY,
    'Authorization: Bearer ' . SUPABASE_SERVICE_KEY,
  ]]);
  $rows = json_decode(curl_exec($ch), true) ?? [];
  curl_close($ch);
  foreach ($rows as $r) { $accIdMap[$r['belvo_account_id']] = $r['id']; }
}

// Upsert deudas
if ($debtRows) {
  $r = supabase_upsert('debts', $debtRows, 'belvo_account_id');
  $stats['debts_ok'] = $r['ok'];
  belvo_sync_log("Deudas upserted: {$r['ok']} OK, {$r['err']} ERR");
}

// ════════════════════════════════════════════════════════════
//  PASO 3 — Obtener transacciones (últimos 90 días)
// ════════════════════════════════════════════════════════════
$dateFrom = date('Y-m-d', strtotime('-90 days'));
$dateTo   = date('Y-m-d');

$txPath = '/api/transactions/?link=' . urlencode($link_id)
        . '&date_from=' . $dateFrom
        . '&date_to='   . $dateTo
        . '&limit=500';

$belvoTx = belvo_get($txPath);
$txList  = $belvoTx['results'] ?? $belvoTx ?? [];
belvo_sync_log("Transacciones Belvo recibidas: " . count($txList));

$txRows = [];
foreach ($txList as $tx) {
  $belvoTxId = $tx['id'] ?? null;
  if (!$belvoTxId) continue;

  $belvoAccId = $tx['account']['id'] ?? $tx['account'] ?? null;
  $accId      = $belvoAccId ? ($accIdMap[$belvoAccId] ?? null) : null;

  $rawType = strtoupper($tx['type'] ?? 'OUTFLOW');
  $amount  = (float)($tx['amount'] ?? 0);
  $type    = map_tx_type($rawType);

  // Belvo: INFLOW = positivo, OUTFLOW = negativo en nuestro schema
  if ($type === 'egreso') $amount = -abs($amount);
  else                    $amount =  abs($amount);

  $txRows[] = [
    'user_id'     => $user_id,
    'account_id'  => $accId,
    'description' => $tx['description'] ?? $tx['merchant']['name'] ?? 'Transacción Belvo',
    'amount'      => $amount,
    'type'        => $type,
    'date'        => !empty($tx['value_date'])
                      ? date('Y-m-d', strtotime($tx['value_date'])) : $dateTo,
    'category'    => $tx['category']           ?? null,
    'subcategory' => $tx['subcategory']        ?? null,
    'source'      => 'belvo',
    'is_fiscal'   => false,
    'counterpart' => $tx['merchant']['name']   ?? null,
    'reference'   => $tx['reference']          ?? null,
    'belvo_tx_id' => $belvoTxId,
    'raw_data'    => json_encode([
      'belvo_id'     => $belvoTxId,
      'status'       => $tx['status']          ?? null,
      'currency'     => $tx['currency']        ?? 'MXN',
      'account_type' => $tx['account_type']    ?? null,
    ]),
  ];
}

if ($txRows) {
  $r = supabase_upsert('transactions', $txRows, 'belvo_tx_id');
  $stats['tx_ok'] = $r['ok'];
  belvo_sync_log("Transacciones upserted: {$r['ok']} OK, {$r['err']} ERR");
}

// ════════════════════════════════════════════════════════════
//  PASO 4 — Actualizar log de sync
// ════════════════════════════════════════════════════════════
$totalImported = $stats['accounts_ok'] + $stats['debts_ok'] + $stats['tx_ok'];
$logUpdate = [
  'status'           => 'completed',
  'records_total'    => count($accRows) + count($debtRows) + count($txRows),
  'records_imported' => $totalImported,
  'completed_at'     => date('c'),
];

if ($logId) {
  $url = SUPABASE_URL . '/rest/v1/sync_logs?id=eq.' . urlencode($logId);
  $ch  = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_CUSTOMREQUEST  => 'PATCH',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POSTFIELDS     => json_encode($logUpdate),
    CURLOPT_HTTPHEADER     => [
      'Content-Type: application/json',
      'apikey: '           . SUPABASE_SERVICE_KEY,
      'Authorization: Bearer ' . SUPABASE_SERVICE_KEY,
      'Prefer: return=minimal',
    ],
  ]);
  curl_exec($ch);
  curl_close($ch);
}

belvo_sync_log("Sync completado | cuentas={$stats['accounts_ok']} deudas={$stats['debts_ok']} tx={$stats['tx_ok']}");

echo json_encode([
  'success'      => true,
  'accounts'     => $stats['accounts_ok'],
  'debts'        => $stats['debts_ok'],
  'transactions' => $stats['tx_ok'],
  'link_id'      => $link_id,
  'institution'  => $institution_name,
]);
