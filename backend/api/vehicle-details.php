<?php
// Palmer Fleet – Vehicle details (ECV-based, rovnaký princíp ako driver_details)

// ─── Detail + upsert ──────────────────────────────────────────────────────────

function getVehicleDetail(string $ecv): void {
    Auth::requireAuth();
    $db   = Database::connect();
    $stmt = $db->prepare('SELECT * FROM vehicle_details WHERE ecv = ?');
    $stmt->execute([$ecv]);
    sendJSON(['details' => $stmt->fetch() ?: (object)[]]);
}

function upsertVehicleDetail(string $ecv, array $input): void {
    Auth::requireRole(['admin', 'dispecer', 'manazer']);
    $db = Database::connect();

    $db->prepare('
        INSERT INTO vehicle_details (ecv, znacka, model, rok_vyroby, typ_vozidla, vin, poznamka, naves_ecv)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            znacka      = VALUES(znacka),
            model       = VALUES(model),
            rok_vyroby  = VALUES(rok_vyroby),
            typ_vozidla = VALUES(typ_vozidla),
            vin         = VALUES(vin),
            poznamka    = VALUES(poznamka),
            naves_ecv   = VALUES(naves_ecv)
    ')->execute([
        $ecv,
        trim($input['znacka']   ?? '') ?: null,
        trim($input['model']    ?? '') ?: null,
        ($input['rok_vyroby']   ?? null) ?: null,
        $input['typ_vozidla']   ?? 'tahac',
        trim($input['vin']      ?? '') ?: null,
        trim($input['poznamka'] ?? '') ?: null,
        trim($input['naves_ecv'] ?? '') ?: null,
    ]);

    $stmt = $db->prepare('SELECT * FROM vehicle_details WHERE ecv = ?');
    $stmt->execute([$ecv]);
    sendJSON(['details' => $stmt->fetch() ?: (object)[]]);
}

// ─── Termíny ──────────────────────────────────────────────────────────────────

/** Vypočíta automatický stav podľa počtu zostávajúcich dní */
function computeAutoStav(int $days): string {
    if ($days < 0)  return 'expirovany';
    if ($days < 30) return 'upozornujuci';
    return 'dobry';
}

/** Vráti efektívny stav (manuálny override alebo auto) + príznak či je manuálny */
function resolveStav(?string $stavDb, int $days): array {
    if ($stavDb !== null && $stavDb !== '') {
        return ['stav' => $stavDb, 'stav_manual' => true];
    }
    return ['stav' => computeAutoStav($days), 'stav_manual' => false];
}

function getVehicleDeadlinesDetail(string $ecv): void {
    Auth::requireAuth();
    $db   = Database::connect();
    $stmt = $db->prepare('SELECT * FROM vehicle_deadlines WHERE ecv = ? ORDER BY datum_expiracie ASC');
    $stmt->execute([$ecv]);

    $labels = ['stk' => 'STK', 'ek' => 'Emisná kontrola', 'poistenie' => 'Poistenie', 'tachograf' => 'Tachograf', 'dalsie' => 'Iné'];

    sendJSON(array_map(function ($r) use ($labels) {
        $days    = (int)ceil((strtotime($r['datum_expiracie']) - time()) / 86400);
        $stavInfo = resolveStav($r['stav'] ?? null, $days);
        return [
            'id'              => $r['id'],
            'typ'             => $r['typ'],
            'typ_label'       => $labels[$r['typ']] ?? $r['typ'],
            'datum_expiracie' => $r['datum_expiracie'],
            'dni'             => $days,
            'poznamka'        => $r['poznamka'],
            'stav'            => $stavInfo['stav'],
            'stav_manual'     => $stavInfo['stav_manual'],
        ];
    }, $stmt->fetchAll()));
}

function createVehicleDeadlineDetail(string $ecv, array $input): void {
    Auth::requireRole(['admin', 'dispecer', 'manazer']);
    $db    = Database::connect();
    $datum = $input['datum_expiracie'] ?? null;
    if (!$datum) sendError(400, 'Dátum expirácie je povinný');

    $db->prepare(
        'INSERT INTO vehicle_deadlines (ecv, typ, datum_expiracie, poznamka, stav) VALUES (?,?,?,?,NULL)'
    )->execute([$ecv, $input['typ'] ?? 'dalsie', $datum, $input['poznamka'] ?? null]);

    sendJSON(['message' => 'Termín bol pridaný', 'id' => $db->lastInsertId()], 201);
}

function updateVehicleDeadlineDetail(string $ecv, int $dlId, array $input): void {
    Auth::requireRole(['admin', 'dispecer', 'manazer']);
    $db    = Database::connect();
    $datum = $input['datum_expiracie'] ?? null;
    if (!$datum) sendError(400, 'Dátum expirácie je povinný');

    // stav: '' alebo 'auto' → NULL (reset na auto); inak uloží manuálnu hodnotu
    $stavInput = $input['stav'] ?? 'keep';
    if ($stavInput === 'keep') {
        // stav sa nemení — nebol poslaný v requeste
        $stmt = $db->prepare(
            'UPDATE vehicle_deadlines SET typ = ?, datum_expiracie = ?, poznamka = ? WHERE id = ? AND ecv = ?'
        );
        $stmt->execute([$input['typ'] ?? 'dalsie', $datum, $input['poznamka'] ?? null, $dlId, $ecv]);
    } else {
        $stavValue = ($stavInput === '' || $stavInput === 'auto') ? null : $stavInput;
        $stmt = $db->prepare(
            'UPDATE vehicle_deadlines SET typ = ?, datum_expiracie = ?, poznamka = ?, stav = ? WHERE id = ? AND ecv = ?'
        );
        $stmt->execute([$input['typ'] ?? 'dalsie', $datum, $input['poznamka'] ?? null, $stavValue, $dlId, $ecv]);
    }
    if ($stmt->rowCount() === 0) sendError(404, 'Termín nenájdený');
    sendJSON(['message' => 'Termín bol aktualizovaný']);
}

function updateDeadlineStav(string $ecv, int $dlId, array $input): void {
    Auth::requireRole(['admin', 'dispecer', 'manazer']);
    $db    = Database::connect();
    $stavInput = $input['stav'] ?? '';
    $stavValue = ($stavInput === '' || $stavInput === 'auto') ? null : $stavInput;

    $stmt = $db->prepare('UPDATE vehicle_deadlines SET stav = ? WHERE id = ? AND ecv = ?');
    $stmt->execute([$stavValue, $dlId, $ecv]);
    if ($stmt->rowCount() === 0) sendError(404, 'Termín nenájdený');

    // Vráť aktualizovaný záznam
    $row = $db->prepare('SELECT * FROM vehicle_deadlines WHERE id = ?');
    $row->execute([$dlId]);
    $r    = $row->fetch();
    $days = (int)ceil((strtotime($r['datum_expiracie']) - time()) / 86400);
    $stavInfo = resolveStav($r['stav'] ?? null, $days);
    sendJSON(['stav' => $stavInfo['stav'], 'stav_manual' => $stavInfo['stav_manual']]);
}

function deleteVehicleDeadlineDetail(string $ecv, int $dlId): void {
    Auth::requireRole(['admin', 'dispecer']);
    $db   = Database::connect();
    $stmt = $db->prepare('DELETE FROM vehicle_deadlines WHERE id = ? AND ecv = ?');
    $stmt->execute([$dlId, $ecv]);
    if ($stmt->rowCount() === 0) sendError(404, 'Termín nenájdený');
    sendJSON(['message' => 'Termín bol zmazaný']);
}

// ─── Dokumenty ────────────────────────────────────────────────────────────────

if (!defined('VEH_UPLOAD_DIR')) {
    define('VEH_UPLOAD_DIR', realpath(__DIR__ . '/../uploads/vehicle_documents') . '/');
}

function getVehicleDocumentsDetail(string $ecv): void {
    Auth::requireAuth();
    $db   = Database::connect();
    $stmt = $db->prepare(
        'SELECT id, nazov, typ_dokumentu, velkost, mime_type, created_at
         FROM vehicle_documents WHERE ecv = ? ORDER BY created_at DESC'
    );
    $stmt->execute([$ecv]);
    sendJSON($stmt->fetchAll());
}

function uploadVehicleDocumentDetail(string $ecv): void {
    $user = Auth::requireRole(['admin', 'dispecer', 'manazer']);
    $db   = Database::connect();

    if (empty($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        sendError(400, 'Súbor nebol nahraný (chyba: ' . ($_FILES['file']['error'] ?? 'none') . ')');
    }

    $file    = $_FILES['file'];
    $mime    = mime_content_type($file['tmp_name']);
    $allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!in_array($mime, $allowed))        sendError(400, 'Povolené: PDF, JPG, PNG');
    if ($file['size'] > 10 * 1024 * 1024) sendError(400, 'Max. veľkosť 10 MB');

    $nazov    = trim($_POST['nazov'] ?? '') ?: pathinfo($file['name'], PATHINFO_FILENAME);
    $typ      = $_POST['typ_dokumentu'] ?? 'ine';
    $ext      = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $safe_ecv = preg_replace('/[^a-zA-Z0-9]/', '_', $ecv);
    $filename = $safe_ecv . '_' . uniqid() . '.' . $ext;
    $dest     = VEH_UPLOAD_DIR . $filename;

    if (!move_uploaded_file($file['tmp_name'], $dest)) {
        sendError(500, 'Nepodarilo sa uložiť súbor');
    }

    $db->prepare(
        'INSERT INTO vehicle_documents (ecv, nahral_id, nazov, typ_dokumentu, cesta_suboru, velkost, mime_type)
         VALUES (?,?,?,?,?,?,?)'
    )->execute([$ecv, $user['id'], $nazov, $typ, $filename, $file['size'], $mime]);

    sendJSON(['message' => 'Dokument bol nahraný', 'id' => $db->lastInsertId()]);
}

function downloadVehicleDocumentDetail(string $ecv, int $docId): void {
    Auth::requireAuth();
    $db  = Database::connect();
    $doc = $db->prepare('SELECT * FROM vehicle_documents WHERE id = ? AND ecv = ?');
    $doc->execute([$docId, $ecv]);
    $d   = $doc->fetch();
    if (!$d) sendError(404, 'Dokument nenájdený');

    $path = VEH_UPLOAD_DIR . $d['cesta_suboru'];
    if (!file_exists($path)) sendError(404, 'Súbor nenájdený na disku');

    header('Content-Type: '        . $d['mime_type']);
    header('Content-Disposition: attachment; filename="' . $d['nazov'] . '"');
    header('Content-Length: '      . filesize($path));
    readfile($path);
    exit;
}

function deleteVehicleDocumentDetail(string $ecv, int $docId): void {
    Auth::requireRole(['admin']);
    $db  = Database::connect();
    $doc = $db->prepare('SELECT * FROM vehicle_documents WHERE id = ? AND ecv = ?');
    $doc->execute([$docId, $ecv]);
    $d   = $doc->fetch();
    if (!$d) sendError(404, 'Dokument nenájdený');

    @unlink(VEH_UPLOAD_DIR . $d['cesta_suboru']);
    $db->prepare('DELETE FROM vehicle_documents WHERE id = ?')->execute([$docId]);
    sendJSON(['message' => 'Dokument bol zmazaný']);
}

// ─── Servisné záznamy ─────────────────────────────────────────────────────────

function getServiceRecordsDetail(string $ecv): void {
    Auth::requireAuth();
    $db   = Database::connect();
    $stmt = $db->prepare(
        'SELECT id, typ_ukonu, popis, cena, stav_odometra_pri_servise, datum_ukonu, poznamka, datum_vytvorenia
         FROM service_records WHERE ecv = ? ORDER BY datum_ukonu DESC, id DESC'
    );
    $stmt->execute([$ecv]);
    sendJSON($stmt->fetchAll());
}

function createServiceRecordDetail(string $ecv, array $input): void {
    $user = Auth::requireRole(['admin', 'dispecer', 'manazer']);
    $db   = Database::connect();

    $datum = $input['datum_ukonu'] ?? null;
    $popis = trim($input['popis'] ?? '');
    if (!$datum)  sendError(400, 'Dátum úkonu je povinný');
    if (!$popis)  sendError(400, 'Popis je povinný');

    $db->prepare(
        'INSERT INTO service_records (ecv, id_pouzivatela, typ_ukonu, popis, cena, stav_odometra_pri_servise, datum_ukonu, poznamka)
         VALUES (?,?,?,?,?,?,?,?)'
    )->execute([
        $ecv,
        $user['id'],
        $input['typ_ukonu']                      ?? 'ine',
        $popis,
        ($input['cena']                          ?? null) ?: null,
        ($input['stav_odometra_pri_servise']     ?? null) ?: null,
        $datum,
        trim($input['poznamka']                  ?? '') ?: null,
    ]);

    sendJSON(['message' => 'Servisný záznam bol pridaný', 'id' => $db->lastInsertId()], 201);
}

function updateServiceRecordDetail(string $ecv, int $recId, array $input): void {
    Auth::requireRole(['admin', 'dispecer', 'manazer']);
    $db = Database::connect();

    $datum = $input['datum_ukonu'] ?? null;
    $popis = trim($input['popis'] ?? '');
    if (!$datum) sendError(400, 'Dátum úkonu je povinný');
    if (!$popis) sendError(400, 'Popis je povinný');

    $stmt = $db->prepare(
        'UPDATE service_records
         SET typ_ukonu = ?, popis = ?, cena = ?, stav_odometra_pri_servise = ?, datum_ukonu = ?, poznamka = ?
         WHERE id = ? AND ecv = ?'
    );
    $stmt->execute([
        $input['typ_ukonu']                  ?? 'ine',
        $popis,
        ($input['cena']                      ?? null) ?: null,
        ($input['stav_odometra_pri_servise'] ?? null) ?: null,
        $datum,
        trim($input['poznamka']              ?? '') ?: null,
        $recId,
        $ecv,
    ]);
    if ($stmt->rowCount() === 0) {
        // môže byť 0 aj keď záznam existuje (žiadne zmeny) — over existenciu
        $check = $db->prepare('SELECT id FROM service_records WHERE id = ? AND ecv = ?');
        $check->execute([$recId, $ecv]);
        if (!$check->fetch()) sendError(404, 'Servisný záznam nenájdený');
    }
    sendJSON(['message' => 'Servisný záznam bol aktualizovaný']);
}

function deleteServiceRecordDetail(string $ecv, int $recId): void {
    Auth::requireRole(['admin', 'dispecer']);
    $db   = Database::connect();
    $stmt = $db->prepare('DELETE FROM service_records WHERE id = ? AND ecv = ?');
    $stmt->execute([$recId, $ecv]);
    if ($stmt->rowCount() === 0) sendError(404, 'Servisný záznam nenájdený');
    sendJSON(['message' => 'Servisný záznam bol zmazaný']);
}
