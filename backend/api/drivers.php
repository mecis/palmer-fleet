<?php
// Palmer Fleet – Driver details & documents API

if (!defined('DRV_UPLOAD_DIR')) {
    define('DRV_UPLOAD_DIR', realpath(__DIR__ . '/../uploads/driver_documents') . '/');
}
if (!defined('DRV_AES_KEY')) {
    define('DRV_AES_KEY', DB_NAME . '_drv_aes_2025');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function encryptRC(string $val): string {
    $iv  = random_bytes(16);
    $enc = openssl_encrypt($val, 'AES-256-CBC', DRV_AES_KEY, 0, $iv);
    return base64_encode($iv . $enc);
}

function decryptRC(string $val): string {
    $raw = base64_decode($val);
    $iv  = substr($raw, 0, 16);
    $enc = substr($raw, 16);
    return openssl_decrypt($enc, 'AES-256-CBC', DRV_AES_KEY, 0, $iv) ?: '';
}

function canSeeSalary(array $user): bool {
    return in_array($user['rola'], ['admin', 'manazer']);
}

function drvLog(array $user, string $akcia, string $popis): void {
    try {
        Database::connect()->prepare(
            'INSERT INTO system_log (akcia, popis, user_id, user_meno, ip_adresa) VALUES (?,?,?,?,?)'
        )->execute([$akcia, $popis, $user['id'], ($user['meno'] ?? '') . ' ' . ($user['priezvisko'] ?? ''), $_SERVER['REMOTE_ADDR'] ?? '']);
    } catch (Exception $e) {}
}

// ─── GET /drivers/{wdId} ─────────────────────────────────────────────────────

function getDriverDetail(int $wdId): void {
    $user = Auth::requireRole(['admin', 'dispecer', 'manazer']);
    $pdo  = Database::connect();

    $det = $pdo->prepare('SELECT * FROM driver_details WHERE wd_driver_id = ?');
    $det->execute([$wdId]);
    $d = $det->fetch() ?: [];

    if (!empty($d['rodne_cislo'])) {
        $d['rodne_cislo'] = $user['rola'] === 'admin' ? decryptRC($d['rodne_cislo']) : '••••••/••••';
    }
    if (!canSeeSalary($user)) unset($d['mzda']);

    $docs = $pdo->prepare(
        'SELECT id, nazov, typ_dokumentu, velkost, mime_type, datum_expiracie, datum_nahratia
         FROM driver_documents WHERE wd_driver_id = ? ORDER BY datum_nahratia DESC'
    );
    $docs->execute([$wdId]);

    sendJSON(['details' => $d, 'documents' => $docs->fetchAll()]);
}

// ─── PUT /drivers/{wdId} ─────────────────────────────────────────────────────

function saveDriverDetail(int $wdId, array $input): void {
    $user = Auth::requireRole(['admin', 'dispecer', 'manazer']);
    $pdo  = Database::connect();

    $allowed = ['bydlisko','telefon_firemny','telefon_sukromny','typ_zmluvy',
                'datum_nastup','psychotesty_platnost','certifikat_a1_platnost',
                'poistenie_vodica_platnost','poznamka'];
    if ($user['rola'] === 'admin')   { $allowed[] = 'rodne_cislo'; $allowed[] = 'mzda'; }
    elseif ($user['rola'] === 'manazer') { $allowed[] = 'mzda'; }

    $set = []; $vals = [];
    foreach ($allowed as $field) {
        if (!array_key_exists($field, $input)) continue;
        $val = ($input[$field] === '' || $input[$field] === null) ? null : $input[$field];
        if ($field === 'rodne_cislo' && $val !== null) $val = encryptRC($val);
        $set[]  = "`$field` = ?";
        $vals[] = $val;
    }
    if (empty($set)) { sendError(400, 'Žiadne platné polia'); }

    $set[]  = '`zmenil_id` = ?';
    $vals[] = $user['id'];

    $exists = $pdo->prepare('SELECT wd_driver_id FROM driver_details WHERE wd_driver_id = ?');
    $exists->execute([$wdId]);

    if ($exists->fetch()) {
        $vals[] = $wdId;
        $pdo->prepare('UPDATE driver_details SET ' . implode(', ', $set) . ' WHERE wd_driver_id = ?')->execute($vals);
    } else {
        $vals[] = $wdId;
        $pdo->prepare('INSERT INTO driver_details SET ' . implode(', ', $set) . ', wd_driver_id = ?')->execute($vals);
    }

    drvLog($user, 'driver_detail_update', "Detaily vodiča WD#$wdId aktualizované");
    sendJSON(['message' => 'Detaily vodiča uložené']);
}

// ─── POST /drivers/{wdId}/documents ─────────────────────────────────────────

function uploadDriverDocument(int $wdId): void {
    $user = Auth::requireRole(['admin', 'dispecer', 'manazer']);
    $pdo  = Database::connect();

    if (empty($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        sendError(400, 'Súbor nebol nahraný (chyba: ' . ($_FILES['file']['error'] ?? 'none') . ')');
    }

    $file    = $_FILES['file'];
    $mime    = mime_content_type($file['tmp_name']);
    $allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!in_array($mime, $allowed))        { sendError(400, 'Povolené: PDF, JPG, PNG'); }
    if ($file['size'] > 10 * 1024 * 1024) { sendError(400, 'Max. veľkosť 10 MB'); }

    $typ   = $_POST['typ_dokumentu']    ?? 'ine';
    $nazov = trim($_POST['nazov'] ?? '') ?: pathinfo($file['name'], PATHINFO_FILENAME);
    $expir = $_POST['datum_expiracie']  ?? null;
    $ext   = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

    $filename = $wdId . '_' . uniqid() . '.' . $ext;
    $dest     = DRV_UPLOAD_DIR . $filename;

    if (!move_uploaded_file($file['tmp_name'], $dest)) {
        sendError(500, 'Nepodarilo sa uložiť súbor do: ' . DRV_UPLOAD_DIR);
    }

    $pdo->prepare(
        'INSERT INTO driver_documents (wd_driver_id, nahral_id, nazov, typ_dokumentu, cesta_suboru, velkost, mime_type, datum_expiracie)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([$wdId, $user['id'], $nazov, $typ, $filename, $file['size'], $mime, $expir ?: null]);

    drvLog($user, 'driver_doc_upload', "Dokument '$nazov' nahraný pre WD#$wdId");
    sendJSON(['message' => 'Dokument bol nahraný', 'id' => $pdo->lastInsertId()]);
}

// ─── GET /drivers/{wdId}/documents/{docId} ──────────────────────────────────

function downloadDriverDocument(int $wdId, int $docId): void {
    Auth::requireRole(['admin', 'dispecer', 'manazer']);
    $pdo = Database::connect();

    $doc = $pdo->prepare('SELECT * FROM driver_documents WHERE id = ? AND wd_driver_id = ?');
    $doc->execute([$docId, $wdId]);
    $d = $doc->fetch();
    if (!$d) { sendError(404, 'Dokument nenájdený'); }

    $path = DRV_UPLOAD_DIR . $d['cesta_suboru'];
    if (!file_exists($path)) { sendError(404, 'Súbor nenájdený na disku'); }

    header('Content-Type: ' . $d['mime_type']);
    header('Content-Disposition: attachment; filename="' . $d['nazov'] . '"');
    header('Content-Length: ' . filesize($path));
    readfile($path);
    exit;
}

// ─── DELETE /drivers/{wdId}/documents/{docId} ───────────────────────────────

function deleteDriverDocument(int $wdId, int $docId): void {
    $user = Auth::requireRole(['admin']);
    $pdo  = Database::connect();

    $doc = $pdo->prepare('SELECT * FROM driver_documents WHERE id = ? AND wd_driver_id = ?');
    $doc->execute([$docId, $wdId]);
    $d = $doc->fetch();
    if (!$d) { sendError(404, 'Dokument nenájdený'); }

    @unlink(DRV_UPLOAD_DIR . $d['cesta_suboru']);
    $pdo->prepare('DELETE FROM driver_documents WHERE id = ?')->execute([$docId]);
    drvLog($user, 'driver_doc_delete', "Dokument ID $docId zmazaný pre WD#$wdId");
    sendJSON(['message' => 'Dokument bol zmazaný']);
}
