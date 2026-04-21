<?php
// Palmer Fleet - Vehicles API (CRUD)

function getVehicles(): void {
    Auth::requireAuth();
    $db  = Database::connect();
    $ecv = trim($_GET['ecv'] ?? '');
    if ($ecv) {
        $stmt = $db->prepare('SELECT * FROM vehicles WHERE ecv = ? AND aktivne = 1');
        $stmt->execute([$ecv]);
        sendJSON($stmt->fetch() ?: null);
        return;
    }
    $stmt = $db->query('SELECT * FROM vehicles ORDER BY ecv ASC');
    sendJSON($stmt->fetchAll());
}

function getVehicle(int $id): void {
    Auth::requireAuth();
    
    $db = Database::connect();
    $stmt = $db->prepare('SELECT * FROM vehicles WHERE id = ?');
    $stmt->execute([$id]);
    $vehicle = $stmt->fetch();

    if (!$vehicle) {
        sendError(404, 'Vozidlo nenájdené');
    }

    sendJSON($vehicle);
}

function createVehicle(array $input): void {
    Auth::requireRole(['admin', 'dispecer']);

    // Validácia
    $ecv = trim($input['ecv'] ?? '');
    $znacka = trim($input['znacka'] ?? '');
    $model = trim($input['model'] ?? '');

    if (!$ecv || !$znacka || !$model) {
        sendError(400, 'EČV, značka a model sú povinné');
    }

    $db = Database::connect();

    // Kontrola duplicity EČV
    $check = $db->prepare('SELECT id FROM vehicles WHERE ecv = ?');
    $check->execute([$ecv]);
    if ($check->fetch()) {
        sendError(409, 'Vozidlo s týmto EČV už existuje');
    }

    $stmt = $db->prepare('
        INSERT INTO vehicles (ecv, vin, znacka, model, rok_vyroby, typ_vozidla, poznamka)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ');

    $stmt->execute([
        $ecv,
        trim($input['vin'] ?? '') ?: null,
        $znacka,
        $model,
        $input['rok_vyroby'] ?? null,
        $input['typ_vozidla'] ?? 'tahac',
        trim($input['poznamka'] ?? '') ?: null,
    ]);

    $id = (int)$db->lastInsertId();
    
    // Vráť vytvorené vozidlo
    $stmt = $db->prepare('SELECT * FROM vehicles WHERE id = ?');
    $stmt->execute([$id]);
    sendJSON($stmt->fetch(), 201);
}

function updateVehicle(int $id, array $input): void {
    Auth::requireRole(['admin', 'dispecer']);

    $db = Database::connect();

    // Over, že vozidlo existuje
    $check = $db->prepare('SELECT id FROM vehicles WHERE id = ?');
    $check->execute([$id]);
    if (!$check->fetch()) {
        sendError(404, 'Vozidlo nenájdené');
    }

    $stmt = $db->prepare('
        UPDATE vehicles SET
            ecv = COALESCE(?, ecv),
            vin = COALESCE(?, vin),
            znacka = COALESCE(?, znacka),
            model = COALESCE(?, model),
            rok_vyroby = COALESCE(?, rok_vyroby),
            stav_odometra = COALESCE(?, stav_odometra),
            typ_vozidla = COALESCE(?, typ_vozidla),
            aktivne = COALESCE(?, aktivne),
            poznamka = COALESCE(?, poznamka)
        WHERE id = ?
    ');

    $stmt->execute([
        trim($input['ecv'] ?? '') ?: null,
        trim($input['vin'] ?? '') ?: null,
        trim($input['znacka'] ?? '') ?: null,
        trim($input['model'] ?? '') ?: null,
        $input['rok_vyroby'] ?? null,
        $input['stav_odometra'] ?? null,
        $input['typ_vozidla'] ?? null,
        isset($input['aktivne']) ? (int)$input['aktivne'] : null,
        trim($input['poznamka'] ?? '') ?: null,
        $id,
    ]);

    // Vráť aktualizované vozidlo
    $stmt = $db->prepare('SELECT * FROM vehicles WHERE id = ?');
    $stmt->execute([$id]);
    sendJSON($stmt->fetch());
}

function deleteVehicle(int $id): void {
    Auth::requireRole(['admin']);

    $db = Database::connect();

    // Soft delete - len deaktivácia
    $stmt = $db->prepare('UPDATE vehicles SET aktivne = 0 WHERE id = ?');
    $stmt->execute([$id]);

    if ($stmt->rowCount() === 0) {
        sendError(404, 'Vozidlo nenájdené');
    }

    sendJSON(['message' => 'Vozidlo bolo deaktivované']);
}

// ─── Termíny (deadlines) ──────────────────────────────────────────────────────

function getVehicleDeadlines(int $id): void {
    Auth::requireAuth();
    $db = Database::connect();

    $chk = $db->prepare('SELECT id FROM vehicles WHERE id = ?');
    $chk->execute([$id]);
    if (!$chk->fetch()) { sendError(404, 'Vozidlo nenájdené'); }

    $stmt = $db->prepare('SELECT * FROM deadlines WHERE id_vozidla = ? ORDER BY datum_expiracie ASC');
    $stmt->execute([$id]);

    $typLabels = ['stk' => 'STK', 'ek' => 'Emisná kontrola', 'poistenie' => 'Poistenie', 'tachograf' => 'Tachograf', 'dalsie' => 'Iné'];

    sendJSON(array_map(function ($r) use ($typLabels) {
        $days = (int)ceil((strtotime($r['datum_expiracie']) - time()) / 86400);
        return [
            'id'              => $r['id'],
            'typ'             => $r['typ'],
            'typ_label'       => $typLabels[$r['typ']] ?? $r['typ'],
            'datum_expiracie' => $r['datum_expiracie'],
            'dni'             => $days,
            'poznamka'        => $r['poznamka'],
        ];
    }, $stmt->fetchAll()));
}

function createVehicleDeadline(int $id, array $input): void {
    Auth::requireRole(['admin', 'dispecer', 'manazer']);
    $db = Database::connect();

    $chk = $db->prepare('SELECT id FROM vehicles WHERE id = ?');
    $chk->execute([$id]);
    if (!$chk->fetch()) { sendError(404, 'Vozidlo nenájdené'); }

    $datum = $input['datum_expiracie'] ?? null;
    if (!$datum) { sendError(400, 'Dátum expirácie je povinný'); }

    $db->prepare(
        'INSERT INTO deadlines (id_vozidla, typ, datum_expiracie, poznamka) VALUES (?,?,?,?)'
    )->execute([$id, $input['typ'] ?? 'dalsie', $datum, $input['poznamka'] ?? null]);

    sendJSON(['message' => 'Termín bol pridaný', 'id' => $db->lastInsertId()], 201);
}

function deleteVehicleDeadline(int $id, int $deadlineId): void {
    Auth::requireRole(['admin', 'dispecer']);
    $db = Database::connect();

    $stmt = $db->prepare('DELETE FROM deadlines WHERE id = ? AND id_vozidla = ?');
    $stmt->execute([$deadlineId, $id]);

    if ($stmt->rowCount() === 0) { sendError(404, 'Termín nenájdený'); }

    sendJSON(['message' => 'Termín bol zmazaný']);
}

// ─── Dokumenty vozidiel ───────────────────────────────────────────────────────

if (!defined('VEH_UPLOAD_DIR')) {
    define('VEH_UPLOAD_DIR', realpath(__DIR__ . '/../uploads/vehicle_documents') . '/');
}

function getVehicleDocuments(int $id): void {
    Auth::requireAuth();
    $db = Database::connect();

    $stmt = $db->prepare(
        'SELECT id, nazov, typ_dokumentu, velkost, mime_type, created_at
         FROM vehicle_documents WHERE vehicle_id = ? ORDER BY created_at DESC'
    );
    $stmt->execute([$id]);
    sendJSON($stmt->fetchAll());
}

function uploadVehicleDocument(int $id): void {
    $user = Auth::requireRole(['admin', 'dispecer', 'manazer']);
    $db   = Database::connect();

    if (empty($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        sendError(400, 'Súbor nebol nahraný (chyba: ' . ($_FILES['file']['error'] ?? 'none') . ')');
    }

    $file    = $_FILES['file'];
    $mime    = mime_content_type($file['tmp_name']);
    $allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!in_array($mime, $allowed))        { sendError(400, 'Povolené: PDF, JPG, PNG'); }
    if ($file['size'] > 10 * 1024 * 1024) { sendError(400, 'Max. veľkosť 10 MB'); }

    $typ      = $_POST['typ_dokumentu'] ?? 'ine';
    $nazov    = trim($_POST['nazov'] ?? '') ?: pathinfo($file['name'], PATHINFO_FILENAME);
    $ext      = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $filename = $id . '_' . uniqid() . '.' . $ext;
    $dest     = VEH_UPLOAD_DIR . $filename;

    if (!move_uploaded_file($file['tmp_name'], $dest)) {
        sendError(500, 'Nepodarilo sa uložiť súbor do: ' . VEH_UPLOAD_DIR);
    }

    $db->prepare(
        'INSERT INTO vehicle_documents (vehicle_id, nahral_id, nazov, typ_dokumentu, cesta_suboru, velkost, mime_type)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    )->execute([$id, $user['id'], $nazov, $typ, $filename, $file['size'], $mime]);

    sendJSON(['message' => 'Dokument bol nahraný', 'id' => $db->lastInsertId()]);
}

function downloadVehicleDocument(int $id, int $docId): void {
    Auth::requireAuth();
    $db = Database::connect();

    $doc = $db->prepare('SELECT * FROM vehicle_documents WHERE id = ? AND vehicle_id = ?');
    $doc->execute([$docId, $id]);
    $d = $doc->fetch();
    if (!$d) { sendError(404, 'Dokument nenájdený'); }

    $path = VEH_UPLOAD_DIR . $d['cesta_suboru'];
    if (!file_exists($path)) { sendError(404, 'Súbor nenájdený na disku'); }

    header('Content-Type: ' . $d['mime_type']);
    header('Content-Disposition: attachment; filename="' . $d['nazov'] . '"');
    header('Content-Length: ' . filesize($path));
    readfile($path);
    exit;
}

function deleteVehicleDocument(int $id, int $docId): void {
    $user = Auth::requireRole(['admin']);
    $db   = Database::connect();

    $doc = $db->prepare('SELECT * FROM vehicle_documents WHERE id = ? AND vehicle_id = ?');
    $doc->execute([$docId, $id]);
    $d = $doc->fetch();
    if (!$d) { sendError(404, 'Dokument nenájdený'); }

    @unlink(VEH_UPLOAD_DIR . $d['cesta_suboru']);
    $db->prepare('DELETE FROM vehicle_documents WHERE id = ?')->execute([$docId]);
    sendJSON(['message' => 'Dokument bol zmazaný']);
}
