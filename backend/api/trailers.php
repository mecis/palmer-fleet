<?php
// Palmer Fleet – Návesy (manuálne spravované, vehicles WHERE typ_vozidla='naves')

function getTrailers(): void {
    Auth::requireAuth();
    $db   = Database::connect();
    $rows = $db->query(
        "SELECT * FROM vehicles WHERE typ_vozidla = 'naves' AND aktivne = 1 ORDER BY ecv ASC"
    )->fetchAll();
    sendJSON($rows);
}

function createTrailer(array $input): void {
    Auth::requireRole(['admin']);
    $db = Database::connect();

    $ecv    = trim($input['ecv']    ?? '');
    $znacka = trim($input['znacka'] ?? '');
    $model  = trim($input['model']  ?? '');

    if (!$ecv || !$znacka || !$model) {
        sendError(400, 'Povinné polia: ecv, znacka, model');
    }

    // Kontrola duplicity ECV
    $check = $db->prepare('SELECT id FROM vehicles WHERE ecv = ?');
    $check->execute([$ecv]);
    if ($check->fetch()) {
        sendError(409, 'Vozidlo s touto EČV už existuje');
    }

    $db->prepare('
        INSERT INTO vehicles (ecv, vin, znacka, model, rok_vyroby, typ_vozidla, poznamka, aktivne)
        VALUES (?, ?, ?, ?, ?, \'naves\', ?, 1)
    ')->execute([
        $ecv,
        trim($input['vin']      ?? '') ?: null,
        $znacka,
        $model,
        ($input['rok_vyroby'] ?? null) ?: null,
        trim($input['poznamka'] ?? '') ?: null,
    ]);

    $stmt = $db->prepare("SELECT * FROM vehicles WHERE ecv = ?");
    $stmt->execute([$ecv]);
    sendJSON($stmt->fetch(), 201);
}

function updateTrailer(string $ecv, array $input): void {
    Auth::requireRole(['admin']);
    $db = Database::connect();

    $check = $db->prepare("SELECT id FROM vehicles WHERE ecv = ? AND typ_vozidla = 'naves'");
    $check->execute([$ecv]);
    if (!$check->fetch()) {
        sendError(404, 'Náves nenájdený');
    }

    $db->prepare("
        UPDATE vehicles
        SET znacka     = ?,
            model      = ?,
            rok_vyroby = ?,
            vin        = ?,
            poznamka   = ?
        WHERE ecv = ? AND typ_vozidla = 'naves'
    ")->execute([
        trim($input['znacka']    ?? '') ?: null,
        trim($input['model']     ?? '') ?: null,
        ($input['rok_vyroby']    ?? null) ?: null,
        trim($input['vin']       ?? '') ?: null,
        trim($input['poznamka']  ?? '') ?: null,
        $ecv,
    ]);

    $stmt = $db->prepare("SELECT * FROM vehicles WHERE ecv = ?");
    $stmt->execute([$ecv]);
    sendJSON($stmt->fetch());
}

function deleteTrailer(string $ecv): void {
    Auth::requireRole(['admin']);
    $db   = Database::connect();
    $stmt = $db->prepare("UPDATE vehicles SET aktivne = 0 WHERE ecv = ? AND typ_vozidla = 'naves'");
    $stmt->execute([$ecv]);
    if ($stmt->rowCount() === 0) {
        sendError(404, 'Náves nenájdený');
    }
    sendJSON(['message' => 'Náves bol deaktivovaný']);
}
