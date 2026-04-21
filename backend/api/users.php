<?php
// Palmer Fleet - Users API

function getUsers(): void {
    Auth::requireRole(['admin', 'dispecer', 'manazer']);
    
    $db = Database::connect();
    $stmt = $db->query('SELECT id, meno, priezvisko, email, rola, wd_driver_id, telefon, aktivny, datum_vytvorenia FROM users ORDER BY priezvisko ASC');
    sendJSON($stmt->fetchAll());
}

function getUser(int $id): void {
    Auth::requireAuth();

    $db = Database::connect();
    $stmt = $db->prepare('SELECT id, meno, priezvisko, email, rola, wd_driver_id, telefon, aktivny, datum_vytvorenia FROM users WHERE id = ?');
    $stmt->execute([$id]);
    $user = $stmt->fetch();

    if (!$user) {
        sendError(404, 'Používateľ nenájdený');
    }

    sendJSON($user);
}

function createUser(array $input): void {
    Auth::requireRole(['admin']);

    $meno = trim($input['meno'] ?? '');
    $priezvisko = trim($input['priezvisko'] ?? '');
    $email = trim($input['email'] ?? '');
    $heslo = $input['heslo'] ?? '';
    $rola = $input['rola'] ?? 'vodic';

    if (!$meno || !$priezvisko || !$email || !$heslo) {
        sendError(400, 'Meno, priezvisko, email a heslo sú povinné');
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendError(400, 'Neplatný formát emailu');
    }

    if (strlen($heslo) < 6) {
        sendError(400, 'Heslo musí mať minimálne 6 znakov');
    }

    $allowedRoles = ['admin', 'dispecer', 'manazer', 'vodic'];
    if (!in_array($rola, $allowedRoles)) {
        sendError(400, 'Neplatná rola');
    }

    $db = Database::connect();

    // Kontrola duplicity emailu
    $check = $db->prepare('SELECT id FROM users WHERE email = ?');
    $check->execute([$email]);
    if ($check->fetch()) {
        sendError(409, 'Používateľ s týmto emailom už existuje');
    }

    $wdDriverId = ($rola === 'vodic' && !empty($input['wd_driver_id'])) ? (int)$input['wd_driver_id'] : null;

    $stmt = $db->prepare('
        INSERT INTO users (meno, priezvisko, email, heslo, rola, wd_driver_id, telefon)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ');

    $stmt->execute([
        $meno,
        $priezvisko,
        $email,
        password_hash($heslo, PASSWORD_BCRYPT),
        $rola,
        $wdDriverId,
        trim($input['telefon'] ?? '') ?: null,
    ]);

    $newId = (int)$db->lastInsertId();
    $creator = Auth::verifyToken();
    require_once __DIR__ . '/logs.php';
    writeLog($db, 'user_created', "Vytvorený používateľ: $meno $priezvisko ($email), rola: $rola", $creator['id'] ?? null, isset($creator) ? ($creator['meno'] ?? '') . ' ' . ($creator['priezvisko'] ?? '') : null);

    sendJSON(['id' => $newId, 'message' => 'Používateľ bol vytvorený'], 201);
}

function updateUser(int $id, array $input): void {
    $currentUser = Auth::requireRole(['admin']);

    $db = Database::connect();

    $check = $db->prepare('SELECT id FROM users WHERE id = ?');
    $check->execute([$id]);
    if (!$check->fetch()) {
        sendError(404, 'Používateľ nenájdený');
    }

    // Admin nemôže zmeniť svoju vlastnú rolu ani deaktivovať sám seba
    $isSelf = ((int)$currentUser['id'] === $id);
    if ($isSelf) {
        unset($input['rola'], $input['aktivny']);
    }

    // Aktualizácia základných údajov
    $stmt = $db->prepare('
        UPDATE users SET
            meno = COALESCE(?, meno),
            priezvisko = COALESCE(?, priezvisko),
            email = COALESCE(?, email),
            rola = COALESCE(?, rola),
            telefon = COALESCE(?, telefon),
            aktivny = COALESCE(?, aktivny)
        WHERE id = ?
    ');

    $stmt->execute([
        trim($input['meno'] ?? '') ?: null,
        trim($input['priezvisko'] ?? '') ?: null,
        trim($input['email'] ?? '') ?: null,
        $input['rola'] ?? null,
        trim($input['telefon'] ?? '') ?: null,
        isset($input['aktivny']) ? (int)$input['aktivny'] : null,
        $id,
    ]);

    // wd_driver_id: ak je rola vodič, ulož; inak vynuluj
    if (array_key_exists('wd_driver_id', $input) || array_key_exists('rola', $input)) {
        $finalRola = $db->prepare('SELECT rola FROM users WHERE id = ?');
        $finalRola->execute([$id]);
        $role = $finalRola->fetchColumn();
        $wdId = ($role === 'vodic' && !empty($input['wd_driver_id'])) ? (int)$input['wd_driver_id'] : null;
        $db->prepare('UPDATE users SET wd_driver_id = ? WHERE id = ?')->execute([$wdId, $id]);
    }

    // Ak bolo zadané nové heslo, aktualizuj ho
    if (!empty($input['heslo']) && strlen($input['heslo']) >= 6) {
        $stmt = $db->prepare('UPDATE users SET heslo = ? WHERE id = ?');
        $stmt->execute([password_hash($input['heslo'], PASSWORD_BCRYPT), $id]);
    }

    require_once __DIR__ . '/logs.php';
    writeLog($db, 'user_updated', "Upravený používateľ ID: $id" . ($isSelf ? ' (vlastný profil)' : ''), $currentUser['id'], ($currentUser['meno'] ?? '') . ' ' . ($currentUser['priezvisko'] ?? ''));

    sendJSON(['message' => 'Používateľ bol aktualizovaný']);
}
