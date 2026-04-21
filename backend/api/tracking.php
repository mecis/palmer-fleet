<?php
// Webdispatching – tracking API

require_once __DIR__ . '/../services/WebdispecinkService.php';

/**
 * GET /tracking/positions  – aktuálne polohy všetkých vozidiel (zlúčené s info o vozidle)
 */
function getPositions(): void {
    $authUser = Auth::requireAuth();
    try {
        $positions = WebdispecinkService::getAllPositions(true);
        $cars      = WebdispecinkService::getCarsList();

        // Index vozidiel podľa carid
        $carsMap = [];
        foreach ($cars as $car) {
            $carsMap[$car['carid']] = $car;
        }

        // Načítaj naves_ecv z lokálnej DB
        $db       = Database::connect();
        $detRows  = $db->query('SELECT ecv, naves_ecv FROM vehicle_details WHERE naves_ecv IS NOT NULL')->fetchAll();
        $navesMap = [];  // ecv_tahaca => ecv_navesu
        foreach ($detRows as $row) {
            $navesMap[$row['ecv']] = $row['naves_ecv'];
        }

        // Zlúč polohy s informáciami o vozidle
        $merged = array_map(function ($pos) use ($carsMap, $navesMap) {
            $car   = $carsMap[$pos['carid']] ?? [];
            $ident = $car['identifikator'] ?? $pos['carid'];
            return array_merge($pos, [
                'identifikator' => $ident,
                'driver'        => $car['driver']     ?? '',
                'odometerKm'    => $car['odometerKm'] ?? $pos['km'] ?? 0,
                'online'        => $car['online']     ?? 0,
                'disabled'      => $car['disabled']   ?? 0,
                'wd_type'       => (int)($car['type'] ?? 9),
                'naves_ecv'     => $navesMap[$ident]  ?? null,
                'is_own'        => false,
            ]);
        }, $positions);

        // Vodič: označ svoje vozidlá (podľa dallas karty alebo mena)
        if (($authUser['rola'] ?? '') === 'vodic' && !empty($authUser['wd_driver_id'])) {
            $wdId    = (int)$authUser['wd_driver_id'];
            $drivers = WebdispecinkService::getDriversList();
            $own     = null;
            foreach ($drivers as $d) {
                if ((int)$d['iddriver'] === $wdId) { $own = $d; break; }
            }
            if ($own) {
                $ownName   = trim(($own['jmeno'] ?? '') . ' ' . ($own['prijmeni'] ?? ''));
                $ownDallas = $own['dallas'] ?? '';
                foreach ($merged as &$v) {
                    $matchDallas = $ownDallas && ($v['ac_dallas'] ?? '') === $ownDallas;
                    $matchName   = $ownName   && trim($v['driver'] ?? '') === $ownName;
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

/**
 * GET /tracking/cars  – zoznam vozidiel z Webdispečink
 */
function getTrackingCars(): void {
    Auth::requireAuth();
    try {
        sendJSON(WebdispecinkService::getCarsList());
    } catch (Exception $e) {
        sendError(502, $e->getMessage());
    }
}

/**
 * GET /tracking/history?car_id=X&from=2024-01-01T00:00:00&to=2024-01-01T23:59:59
 */
function getPositionHistory(): void {
    Auth::requireAuth();

    $carId = isset($_GET['car_id']) ? (int)$_GET['car_id'] : 0;
    $from  = trim($_GET['from'] ?? '');
    $to    = trim($_GET['to']   ?? '');

    if (!$carId || !$from || !$to) {
        sendError(400, 'Povinné parametre: car_id, from, to');
    }

    try {
        sendJSON(WebdispecinkService::getTimePositions($carId, $from, $to));
    } catch (Exception $e) {
        sendError(502, $e->getMessage());
    }
}

/**
 * GET /tracking/drivers  – zoznam vodičov z Webdispečink
 */
function getDrivers(): void {
    $authUser = Auth::requireAuth();
    try {
        $drivers = WebdispecinkService::getDriversList();

        // Vodič vidí len seba
        if ($authUser['rola'] === 'vodic') {
            $ownId = (int)($authUser['wd_driver_id'] ?? 0);
            $drivers = array_values(array_filter($drivers, fn($d) => (int)$d['iddriver'] === $ownId));
        }

        $positions = WebdispecinkService::getAllPositions();
        $cars      = WebdispecinkService::getCarsList();

        // Štatistiky vodičov (celková doba jazdy + km) — od 2020 po teraz
        $statsByDriver = [];
        try {
            $stats = WebdispecinkService::getStaDrivers('2020-01-01 00:00:00', gmdate('Y-m-d H:i:s'));
            foreach ($stats as $s) {
                $statsByDriver[(int)$s['iddriver']] = $s;
            }
        } catch (Exception $e) {
            // štatistiky sú nepovinné
        }

        // Index áut podľa carid + dallas
        $carsMap     = [];
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

        // Index priradených vozidiel podľa mena vodiča (z car listu)
        // jeden vodič môže mať viac vozidiel
        $carsByDriver = [];
        foreach ($cars as $car) {
            $name = trim($car['driver'] ?? '');
            if ($name === '') continue;
            $carsByDriver[$name][] = $car['identifikator'];
        }

        $drivers = array_map(function ($d) use ($posByDallas, $carsByDriver, $statsByDriver) {
            $fullName = trim($d['jmeno'] . ' ' . $d['prijmeni']);

            // Priradené vozidlá z car listu (permanentné priradenie)
            $assigned = $carsByDriver[$fullName] ?? [];

            // Aktuálna jazda cez dallas (karta vložená vo vozidle)
            $pos        = $posByDallas[$d['dallas']] ?? null;
            $isDriving  = $pos && (int)$pos['speed'] > 0;
            $activeSpz  = $pos ? ($pos['identifikator'] ?: '') : '';

            // SPZ: ak jazdí → aktuálne vozidlo (karta vložená); inak → priradené z car listu
            $displaySpz = ($isDriving && $activeSpz) ? $activeSpz : ($assigned[0] ?? $activeSpz);

            $d['current_spz']    = $displaySpz;
            $d['assigned_cars']  = $assigned;
            $d['is_driving']     = $isDriving;
            $d['current_speed']  = $isDriving ? (int)$pos['speed'] : 0;

            $stat                = $statsByDriver[(int)$d['iddriver']] ?? null;
            $d['total_drive_time'] = $stat['Doba_jizdy'] ?? null;   // "HH:MM:SS" (môže byť >24h)
            $d['total_km']         = $stat ? (float)$stat['Celkem_km'] : null;

            return $d;
        }, $drivers);

        sendJSON($drivers);
    } catch (Exception $e) {
        sendError(502, $e->getMessage());
    }
}

/**
 * PUT /tracking/driver/{id}  – aktualizácia vodiča
 */
function updateDriver(int $id, array $input): void {
    Auth::requireRole(['admin', 'dispecer']);
    $ok = WebdispecinkService::updateDriver($id, $input);
    if ($ok) {
        sendJSON(['message' => 'Vodič bol aktualizovaný']);
    } else {
        sendError(502, 'Webdispečink nepotvrdil uloženie');
    }
}

/**
 * GET /tracking/status  – otestuje spojenie s Webdispečink
 */
function getTrackingStatus(): void {
    Auth::requireRole(['admin']);
    $ok = WebdispecinkService::testLogin();
    sendJSON(['connected' => $ok]);
}

/**
 * GET /tracking/wd-raw  – všetky surové dáta z WD API (admin/debug)
 */
function getWdRaw(): void {
    Auth::requireRole(['admin']);
    $result = [];

    // Základné dáta
    try { $result['cars']      = WebdispecinkService::getCarsList(); }
    catch (Exception $e) { $result['cars'] = ['error' => $e->getMessage()]; }

    try { $result['positions'] = WebdispecinkService::getAllPositions(true); }
    catch (Exception $e) { $result['positions'] = ['error' => $e->getMessage()]; }

    try { $result['drivers']   = WebdispecinkService::getDriversList(true); }
    catch (Exception $e) { $result['drivers'] = ['error' => $e->getMessage()]; }

    try { $result['drivers2']  = WebdispecinkService::getDriversList2(); }
    catch (Exception $e) { $result['drivers2'] = ['error' => $e->getMessage()]; }

    try { $result['trailers']  = WebdispecinkService::getTrailersList(); }
    catch (Exception $e) { $result['trailers'] = ['error' => $e->getMessage()]; }

    try { $result['cargroups'] = WebdispecinkService::getCarGroups(); }
    catch (Exception $e) { $result['cargroups'] = ['error' => $e->getMessage()]; }

    try { $result['fuel_cards'] = WebdispecinkService::getFuelCards(); }
    catch (Exception $e) { $result['fuel_cards'] = ['error' => $e->getMessage()]; }

    // Dáta vyžadujúce parametre — použijeme prvé auto/vodiča a posledných 30 dní
    $cars = is_array($result['cars']) && !isset($result['cars']['error']) ? $result['cars'] : [];
    $firstCarId = !empty($cars) ? (int)$cars[0]['carid'] : 0;

    $drivers = is_array($result['drivers']) && !isset($result['drivers']['error']) ? $result['drivers'] : [];
    $firstDriverId = !empty($drivers) ? (int)$drivers[0]['iddriver'] : 0;

    $from = gmdate('Y-m-d H:i:s', strtotime('-30 days'));
    $to   = gmdate('Y-m-d H:i:s');

    if ($firstCarId) {
        try { $result['car_atribut']       = WebdispecinkService::getCarAtribut($firstCarId); }
        catch (Exception $e) { $result['car_atribut'] = ['error' => $e->getMessage()]; }

        try { $result['warning_lights']    = WebdispecinkService::getWarningLightsActive($firstCarId); }
        catch (Exception $e) { $result['warning_lights'] = ['error' => $e->getMessage()]; }

        try { $result['logbook']           = array_slice(WebdispecinkService::getCarLogBook($firstCarId, $from, $to), 0, 5); }
        catch (Exception $e) { $result['logbook'] = ['error' => $e->getMessage()]; }

        try { $result['overspeed']         = array_slice(WebdispecinkService::getCarOverSpeed($firstCarId, $from, $to), 0, 10); }
        catch (Exception $e) { $result['overspeed'] = ['error' => $e->getMessage()]; }

        try { $result['border_crossing']   = array_slice(WebdispecinkService::getBorderCrossing($firstCarId, $from, $to), 0, 10); }
        catch (Exception $e) { $result['border_crossing'] = ['error' => $e->getMessage()]; }
    }

    try { $result['sta_cars']    = WebdispecinkService::getStaCars($from, $to); }
    catch (Exception $e) { $result['sta_cars'] = ['error' => $e->getMessage()]; }

    try { $result['sta_drivers'] = WebdispecinkService::getStaDrivers($from, $to); }
    catch (Exception $e) { $result['sta_drivers'] = ['error' => $e->getMessage()]; }

    if ($firstDriverId) {
        try { $result['driver_rating'] = WebdispecinkService::getDriverRating($firstDriverId, $from, $to); }
        catch (Exception $e) { $result['driver_rating'] = ['error' => $e->getMessage()]; }
    }

    // Metadáta — aké auto/vodič sa použili ako vzorka
    $result['_meta'] = [
        'sample_car_id'    => $firstCarId,
        'sample_driver_id' => $firstDriverId,
        'date_from'        => $from,
        'date_to'          => $to,
    ];

    sendJSON($result);
}
