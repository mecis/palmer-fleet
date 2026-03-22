<?php
// Palmer Fleet - Vehicles API (CRUD)

function getVehicles(): void {
    Auth::requireAuth();
    
    $db = Database::connect();
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
