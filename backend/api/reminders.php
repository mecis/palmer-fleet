<?php
// upomienky pre vozidla aj vodicov

// pomocna - vrati 'stav' bud z DB (manualne nastaveny) alebo vypocitany z poctu dni
function resolveStavReminder(?string $stavDb, int $days): array {
    if ($stavDb !== null && $stavDb !== '') {
        return ['stav' => $stavDb, 'stav_manual' => true];
    }
    if ($days < 0) return ['stav' => 'expirovany', 'stav_manual' => false];
    if ($days < 30) return ['stav' => 'upozornujuci', 'stav_manual' => false];
    return ['stav' => 'dobry', 'stav_manual' => false];
}

function updateReminderStav(int $id, array $input): void {
    Auth::requireRole(['admin', 'dispecer', 'manazer']);
    $pdo = Database::connect();
    $stavInput = $input['stav'] ?? '';
    // 'auto' alebo prazdne -> NULL = automaticky vypocet
    $stavValue = ($stavInput === '' || $stavInput === 'auto') ? null : $stavInput;

    $stmt = $pdo->prepare('UPDATE vehicle_deadlines SET stav = ? WHERE id = ?');
    $stmt->execute([$stavValue, $id]);
    if ($stmt->rowCount() === 0) sendError(404, 'Termin nenajdeny');

    $row = $pdo->prepare('SELECT stav, datum_expiracie FROM vehicle_deadlines WHERE id = ?');
    $row->execute([$id]);
    $r = $row->fetch();
    $days = (int)ceil((strtotime($r['datum_expiracie']) - time()) / 86400);
    $info = resolveStavReminder($r['stav'] ?? null, $days);
    sendJSON(['stav' => $info['stav'], 'stav_manual' => $info['stav_manual']]);
}

function getReminders(): void {
    Auth::requireRole(['admin', 'dispecer', 'manazer']);
    $pdo = Database::connect();

    // 1) terminy vozidiel z vehicle_deadlines
    $vehicleRows = $pdo->query("
        SELECT vd.id, vd.typ, vd.datum_expiracie, vd.poznamka, vd.ecv, vd.stav,
               COALESCE(det.znacka, '') AS znacka,
               COALESCE(det.model, '') AS model
        FROM vehicle_deadlines vd
        LEFT JOIN vehicle_details det ON det.ecv = vd.ecv
        ORDER BY vd.datum_expiracie ASC
    ")->fetchAll();

    $typLabels = [
        'stk' => 'STK',
        'ek' => 'Emisna kontrola',
        'poistenie' => 'Poistenie',
        'tachograf' => 'Tachograf',
        'dalsie' => 'Ine',
    ];

    $vehicles = array_map(function ($r) use ($typLabels) {
        $days = (int)ceil((strtotime($r['datum_expiracie']) - time()) / 86400);
        $stavInfo = resolveStavReminder($r['stav'] ?? null, $days);
        return [
            'id' => $r['id'],
            'nazov' => trim($r['znacka'] . ' ' . $r['model']) ?: $r['ecv'],
            'ecv' => $r['ecv'],
            'typ' => $typLabels[$r['typ']] ?? $r['typ'],
            'datum_expiracie' => $r['datum_expiracie'],
            'dni' => $days,
            'poznamka' => $r['poznamka'],
            'stav' => $stavInfo['stav'],
            'stav_manual' => $stavInfo['stav_manual'],
        ];
    }, $vehicleRows);

    // 2) terminy vodicov z driver_details (psychotesty, certA1, poistenie)
    $driverRows = $pdo->query("
        SELECT wd_driver_id,
               psychotesty_platnost, psychotesty_stav,
               certifikat_a1_platnost, certifikat_a1_stav,
               poistenie_vodica_platnost, poistenie_vodica_stav
        FROM driver_details
        WHERE psychotesty_platnost IS NOT NULL
           OR certifikat_a1_platnost IS NOT NULL
           OR poistenie_vodica_platnost IS NOT NULL
    ")->fetchAll();

    // mena vodicov tahame z WD; ak nejde, fallback je ID
    $driverNames = [];
    try {
        require_once __DIR__ . '/../services/WebdispecinkService.php';
        $list = WebdispecinkService::getDriversList();
        foreach ($list as $d) {
            $driverNames[(int)$d['iddriver']] = $d['jmeno'] . ' ' . $d['prijmeni'];
        }
    } catch (Exception $e) {}

    $driverReminders = [];
    $typy = [
        'psychotesty_platnost' => ['label' => 'Psychotesty', 'stavField' => 'psychotesty_stav'],
        'certifikat_a1_platnost' => ['label' => 'Certifikat A1', 'stavField' => 'certifikat_a1_stav'],
        'poistenie_vodica_platnost' => ['label' => 'Poistenie vodica', 'stavField' => 'poistenie_vodica_stav'],
    ];

    foreach ($driverRows as $row) {
        $wdId = (int)$row['wd_driver_id'];
        $meno = $driverNames[$wdId] ?? "Vodic #$wdId";
        foreach ($typy as $field => $meta) {
            if (empty($row[$field])) continue;
            $days = (int)ceil((strtotime($row[$field]) - time()) / 86400);
            $stavDb = $row[$meta['stavField']] ?? null;
            $stavInfo = resolveStavReminder($stavDb, $days);
            $driverReminders[] = [
                'wd_driver_id' => $wdId,
                'meno' => $meno,
                'typ' => $meta['label'],
                'stav_field' => $meta['stavField'],
                'datum_expiracie' => $row[$field],
                'dni' => $days,
                'stav' => $stavInfo['stav'],
                'stav_manual' => $stavInfo['stav_manual'],
            ];
        }
    }

    usort($driverReminders, fn($a, $b) => $a['dni'] <=> $b['dni']);

    sendJSON([
        'vehicles' => $vehicles,
        'drivers' => $driverReminders,
    ]);
}

function updateDriverReminderStav(int $wdDriverId, array $input): void {
    Auth::requireRole(['admin', 'dispecer', 'manazer']);

    $allowed = ['psychotesty_stav', 'certifikat_a1_stav', 'poistenie_vodica_stav'];
    $field = $input['stav_field'] ?? '';
    if (!in_array($field, $allowed)) sendError(400, 'Neplatny stav_field');

    $stavInput = $input['stav'] ?? '';
    $stavValue = ($stavInput === '' || $stavInput === 'auto') ? null : $stavInput;

    $pdo = Database::connect();
    $stmt = $pdo->prepare("UPDATE driver_details SET {$field} = ? WHERE wd_driver_id = ?");
    $stmt->execute([$stavValue, $wdDriverId]);
    if ($stmt->rowCount() === 0) sendError(404, 'Vodic nenajdeny');

    // potrebujem aj platnost na recompute auto stavu
    $platnostField = str_replace('_stav', '_platnost', $field);
    $row = $pdo->prepare("SELECT {$platnostField}, {$field} FROM driver_details WHERE wd_driver_id = ?");
    $row->execute([$wdDriverId]);
    $r = $row->fetch();
    $days = (int)ceil((strtotime($r[$platnostField]) - time()) / 86400);
    $info = resolveStavReminder($r[$field] ?? null, $days);
    sendJSON(['stav' => $info['stav'], 'stav_manual' => $info['stav_manual']]);
}
