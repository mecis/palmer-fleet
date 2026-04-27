<?php
// tracking endpointy - vsetko co prichadza z webdispecinku

require_once __DIR__ . '/../services/WebdispecinkService.php';

// GET /tracking/positions - aktualne polohy + zlucene s info o aute
function getPositions(): void {
    $authUser = Auth::requireAuth();
    try {
        $positions = WebdispecinkService::getAllPositions(true);
        $cars      = WebdispecinkService::getCarsList();

        // index podla carid aby som nemusel hladat
        $carsMap = [];
        foreach ($cars as $car) {
            $carsMap[$car['carid']] = $car;
        }

        // priradene navesy z lokalnej DB
        $db = Database::connect();
        $detRows = $db->query('SELECT ecv, naves_ecv FROM vehicle_details WHERE naves_ecv IS NOT NULL')->fetchAll();
        $navesMap = [];
        foreach ($detRows as $row) {
            $navesMap[$row['ecv']] = $row['naves_ecv'];
        }

        // doplnim k pozicii info z carsList
        $merged = array_map(function ($pos) use ($carsMap, $navesMap) {
            $car = $carsMap[$pos['carid']] ?? [];
            $ident = $car['identifikator'] ?? $pos['carid'];
            return array_merge($pos, [
                'identifikator' => $ident,
                'driver' => $car['driver'] ?? '',
                'odometerKm' => $car['odometerKm'] ?? $pos['km'] ?? 0,
                'online' => $car['online'] ?? 0,
                'disabled' => $car['disabled'] ?? 0,
                'wd_type' => (int)($car['type'] ?? 9),
                'naves_ecv' => $navesMap[$ident] ?? null,
                'is_own' => false,
            ]);
        }, $positions);

        // ked je prihlaseny vodic, oznacim mu vlastne auta
        if (($authUser['rola'] ?? '') === 'vodic' && !empty($authUser['wd_driver_id'])) {
            $wdId = (int)$authUser['wd_driver_id'];
            $drivers = WebdispecinkService::getDriversList();
            $own = null;
            foreach ($drivers as $d) {
                if ((int)$d['iddriver'] === $wdId) { $own = $d; break; }
            }
            if ($own) {
                $ownName = trim(($own['jmeno'] ?? '') . ' ' . ($own['prijmeni'] ?? ''));
                $ownDallas = $own['dallas'] ?? '';
                foreach ($merged as &$v) {
                    $matchDallas = $ownDallas && ($v['ac_dallas'] ?? '') === $ownDallas;
                    $matchName = $ownName && trim($v['driver'] ?? '') === $ownName;
                    if ($matchDallas || $matchName) $v['is_own'] = true;
                }
                unset($v);
            }
        }

        sendJSON($merged);
    } catch (Exception $e) {
        sendError(502, $e->getMessage());
    }
}

function getTrackingCars(): void {
    Auth::requireAuth();
    try {
        sendJSON(WebdispecinkService::getCarsList());
    } catch (Exception $e) {
        sendError(502, $e->getMessage());
    }
}

// GET /tracking/history?car_id=X&from=...&to=...
function getPositionHistory(): void {
    Auth::requireAuth();

    $carId = isset($_GET['car_id']) ? (int)$_GET['car_id'] : 0;
    $from = trim($_GET['from'] ?? '');
    $to = trim($_GET['to'] ?? '');

    if (!$carId || !$from || !$to) {
        sendError(400, 'Povinne parametre: car_id, from, to');
    }

    try {
        sendJSON(WebdispecinkService::getTimePositions($carId, $from, $to));
    } catch (Exception $e) {
        sendError(502, $e->getMessage());
    }
}

// GET /tracking/drivers - zoznam vodicov vratane statistik
function getDrivers(): void {
    $authUser = Auth::requireAuth();
    try {
        $drivers = WebdispecinkService::getDriversList();

        // vodic vidi len seba
        if ($authUser['rola'] === 'vodic') {
            $ownId = (int)($authUser['wd_driver_id'] ?? 0);
            $drivers = array_values(array_filter($drivers, fn($d) => (int)$d['iddriver'] === $ownId));
        }

        $positions = WebdispecinkService::getAllPositions();
        $cars = WebdispecinkService::getCarsList();

        // celkova doba jazdy + km od 2020 po dnes
        $statsByDriver = [];
        try {
            $stats = WebdispecinkService::getStaDrivers('2020-01-01 00:00:00', gmdate('Y-m-d H:i:s'));
            foreach ($stats as $s) {
                $statsByDriver[(int)$s['iddriver']] = $s;
            }
        } catch (Exception $e) {
            // statistiky nie su povinne, idem dalej
        }

        // indexy na rychle hladanie
        $carsMap = [];
        $posByDallas = [];
        foreach ($cars as $car) {
            $carsMap[$car['carid']] = $car;
        }
        foreach ($positions as $pos) {
            $car = $carsMap[$pos['carid']] ?? [];
            $pos['identifikator'] = $car['identifikator'] ?? '';
            if (!empty($pos['ac_dallas'])) {
                $posByDallas[$pos['ac_dallas']] = $pos;
            }
        }

        // jeden vodic moze mat priradene viacero aut
        $carsByDriver = [];
        foreach ($cars as $car) {
            $name = trim($car['driver'] ?? '');
            if ($name === '') continue;
            $carsByDriver[$name][] = $car['identifikator'];
        }

        $drivers = array_map(function ($d) use ($posByDallas, $carsByDriver, $statsByDriver) {
            $fullName = trim($d['jmeno'] . ' ' . $d['prijmeni']);

            $assigned = $carsByDriver[$fullName] ?? [];

            // ak ma vlozenu kartu, beriem to ako prave aktivnu jazdu
            $pos = $posByDallas[$d['dallas']] ?? null;
            $isDriving = $pos && (int)$pos['speed'] > 0;
            $activeSpz = $pos ? ($pos['identifikator'] ?: '') : '';

            // ked jazdi -> ukaz aktivne; inak -> permanentne priradene
            $displaySpz = ($isDriving && $activeSpz) ? $activeSpz : ($assigned[0] ?? $activeSpz);

            $d['current_spz'] = $displaySpz;
            $d['assigned_cars'] = $assigned;
            $d['is_driving'] = $isDriving;
            $d['current_speed'] = $isDriving ? (int)$pos['speed'] : 0;

            $stat = $statsByDriver[(int)$d['iddriver']] ?? null;
            $d['total_drive_time'] = $stat['Doba_jizdy'] ?? null;  // HH:MM:SS, moze byt >24h
            $d['total_km'] = $stat ? (float)$stat['Celkem_km'] : null;

            return $d;
        }, $drivers);

        sendJSON($drivers);
    } catch (Exception $e) {
        sendError(502, $e->getMessage());
    }
}

function updateDriver(int $id, array $input): void {
    Auth::requireRole(['admin', 'dispecer']);
    $ok = WebdispecinkService::updateDriver($id, $input);
    if ($ok) {
        sendJSON(['message' => 'Vodic bol aktualizovany']);
    } else {
        sendError(502, 'Webdispecink nepotvrdil ulozenie');
    }
}

// rychly check ci ide WD spojenie
function getTrackingStatus(): void {
    Auth::requireRole(['admin']);
    $ok = WebdispecinkService::testLogin();
    sendJSON(['connected' => $ok]);
}
