<?php
// Webdispatching – tracking API

require_once __DIR__ . '/../services/WebdispecinkService.php';

/**
 * GET /tracking/positions  – aktuálne polohy všetkých vozidiel (zlúčené s info o vozidle)
 */
function getPositions(): void {
    Auth::requireAuth();
    try {
        $positions = WebdispecinkService::getAllPositions(true);
        $cars      = WebdispecinkService::getCarsList();

        // Index vozidiel podľa carid
        $carsMap = [];
        foreach ($cars as $car) {
            $carsMap[$car['carid']] = $car;
        }

        // Zlúč polohy s informáciami o vozidle
        $merged = array_map(function ($pos) use ($carsMap) {
            $car = $carsMap[$pos['carid']] ?? [];
            return array_merge($pos, [
                'identifikator' => $car['identifikator'] ?? $pos['carid'],
                'driver'        => $car['driver']        ?? '',
                'odometerKm'    => $car['odometerKm']    ?? $pos['km'] ?? 0,
                'online'        => $car['online']        ?? 0,
                'disabled'      => $car['disabled']      ?? 0,
            ]);
        }, $positions);

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
    Auth::requireAuth();
    try {
        $drivers = WebdispecinkService::getDriversList();

        $positions = WebdispecinkService::getAllPositions();
        $cars      = WebdispecinkService::getCarsList();

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

        $drivers = array_map(function ($d) use ($posByDallas, $carsByDriver) {
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
