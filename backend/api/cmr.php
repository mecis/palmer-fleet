<?php
// CMR (medzinarodne nakladne listy) - upload a evidencia
// Nahravat moze len vodic a admin. Maze len admin. Vsetci ostatni len citaju.

if (!defined('CMR_UPLOAD_DIR')) {
    define('CMR_UPLOAD_DIR', realpath(__DIR__ . '/../uploads/cmr_documents') . '/');
}

// vodic vidi iba svoje CMR, ostatni vsetky
function getCmrList(): void {
    $user = Auth::requireAuth();
    $pdo = Database::connect();

    $where = '';
    $params = [];
    if ($user['rola'] === 'vodic') {
        $where = 'WHERE c.wd_driver_id = ?';
        $params[] = (int)($user['wd_driver_id'] ?? 0);
    }

    // filter podla ECV (z querystringu) - pre tab v modali vozidla
    $ecv = trim($_GET['ecv'] ?? '');
    if ($ecv !== '') {
        $where = ($where ? $where . ' AND ' : 'WHERE ') . 'c.ecv = ?';
        $params[] = $ecv;
    }

    $stmt = $pdo->prepare("
        SELECT c.id, c.ecv, c.wd_driver_id, c.cislo_cmr, c.datum_prepravy,
               c.poznamka, c.nazov, c.velkost, c.mime_type, c.created_at,
               u.meno AS nahral_meno, u.priezvisko AS nahral_priezvisko
        FROM cmr_records c
        LEFT JOIN users u ON u.id = c.nahral_id
        $where
        ORDER BY c.datum_prepravy DESC, c.id DESC
    ");
    $stmt->execute($params);
    sendJSON($stmt->fetchAll());
}

function uploadCmr(): void {
    // upload moze len vodic alebo admin
    $user = Auth::requireRole(['vodic', 'admin']);
    $pdo = Database::connect();

    if (empty($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        sendError(400, 'Subor nebol nahrany');
    }

    $file = $_FILES['file'];
    $mime = mime_content_type($file['tmp_name']);
    $allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!in_array($mime, $allowed)) sendError(400, 'Povolene: PDF, JPG, PNG');
    if ($file['size'] > 10 * 1024 * 1024) sendError(400, 'Max. velkost 10 MB');

    $ecv = trim($_POST['ecv'] ?? '');
    if ($ecv === '') sendError(400, 'EČV je povinne');

    $cisloCmr = trim($_POST['cislo_cmr'] ?? '') ?: null;
    $datum = $_POST['datum_prepravy'] ?? null;
    if (!$datum) $datum = null;
    $poznamka = trim($_POST['poznamka'] ?? '') ?: null;

    // wd_driver_id beriem z auth - vodic nahrava sam za seba; admin moze poslat explicitne
    $wdDriverId = $user['rola'] === 'admin'
        ? (isset($_POST['wd_driver_id']) ? (int)$_POST['wd_driver_id'] : null)
        : (int)($user['wd_driver_id'] ?? 0);
    if (!$wdDriverId) $wdDriverId = null;

    $nazov = trim($_POST['nazov'] ?? '') ?: pathinfo($file['name'], PATHINFO_FILENAME);
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $filename = 'cmr_' . preg_replace('/[^a-z0-9]/i', '', $ecv) . '_' . uniqid() . '.' . $ext;
    $dest = CMR_UPLOAD_DIR . $filename;

    if (!move_uploaded_file($file['tmp_name'], $dest)) {
        sendError(500, 'Nepodarilo sa ulozit subor');
    }

    $pdo->prepare(
        'INSERT INTO cmr_records (ecv, wd_driver_id, nahral_id, cislo_cmr, datum_prepravy, poznamka,
                                  nazov, cesta_suboru, velkost, mime_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([$ecv, $wdDriverId, $user['id'], $cisloCmr, $datum, $poznamka,
                $nazov, $filename, $file['size'], $mime]);

    sendJSON(['message' => 'CMR bol nahrany', 'id' => $pdo->lastInsertId()], 201);
}

function downloadCmr(int $id): void {
    $user = Auth::requireAuth();
    $pdo = Database::connect();

    $stmt = $pdo->prepare('SELECT * FROM cmr_records WHERE id = ?');
    $stmt->execute([$id]);
    $r = $stmt->fetch();
    if (!$r) sendError(404, 'CMR nenajdeny');

    // vodic moze stiahnut len svoj
    if ($user['rola'] === 'vodic' && (int)$r['wd_driver_id'] !== (int)($user['wd_driver_id'] ?? 0)) {
        sendError(403, 'Nedostatocne opravnenie');
    }

    $path = CMR_UPLOAD_DIR . $r['cesta_suboru'];
    if (!file_exists($path)) sendError(404, 'Subor nenajdeny na disku');

    header('Content-Type: ' . $r['mime_type']);
    header('Content-Disposition: attachment; filename="' . $r['nazov'] . '"');
    header('Content-Length: ' . filesize($path));
    readfile($path);
    exit;
}

function deleteCmr(int $id): void {
    Auth::requireRole(['admin']);
    $pdo = Database::connect();

    $stmt = $pdo->prepare('SELECT cesta_suboru FROM cmr_records WHERE id = ?');
    $stmt->execute([$id]);
    $r = $stmt->fetch();
    if (!$r) sendError(404, 'CMR nenajdeny');

    @unlink(CMR_UPLOAD_DIR . $r['cesta_suboru']);
    $pdo->prepare('DELETE FROM cmr_records WHERE id = ?')->execute([$id]);
    sendJSON(['message' => 'CMR bol zmazany']);
}
