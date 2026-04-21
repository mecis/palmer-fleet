<?php
// Palmer Fleet - Hlavný API Router
// Všetky požiadavky smerujú sem cez .htaccess

require_once __DIR__ . '/middleware/cors.php';
require_once __DIR__ . '/config/Connection.php';
require_once __DIR__ . '/middleware/Auth.php';

// Získanie metódy a cesty
$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Odstránenie prefixu /api/ ak existuje
$uri = preg_replace('#^/api#', '', $uri);
$uri = trim($uri, '/');
$segments = $uri ? explode('/', $uri) : [];

// Získanie JSON body
$input = json_decode(file_get_contents('php://input'), true) ?? [];

// ============================================
// ROUTING
// ============================================

$resource = $segments[0] ?? '';
$id = $segments[1] ?? null;

switch ($resource) {

    // --- AUTH ---
    case 'auth':
        $action = $segments[1] ?? '';
        if ($action === 'login' && $method === 'POST') {
            require_once __DIR__ . '/api/auth.php';
            handleLogin($input);
        } elseif ($action === 'me' && $method === 'GET') {
            require_once __DIR__ . '/api/auth.php';
            handleMe();
        } else {
            sendError(404, 'Endpoint nenájdený');
        }
        break;

    // --- VEHICLES ---
    case 'vehicles':
        require_once __DIR__ . '/api/vehicles.php';
        $sub   = $segments[2] ?? '';
        $subId = (int)($segments[3] ?? 0);

        if ($method === 'GET'    && !$id && !$sub)                            getVehicles();
        elseif ($method === 'GET'    && $id && !$sub)                         getVehicle((int)$id);
        elseif ($method === 'POST'   && !$id)                                 createVehicle($input);
        elseif ($method === 'PUT'    && $id && !$sub)                         updateVehicle((int)$id, $input);
        elseif ($method === 'DELETE' && $id && !$sub)                         deleteVehicle((int)$id);
        elseif ($method === 'GET'    && $id && $sub === 'deadlines' && !$subId) getVehicleDeadlines((int)$id);
        elseif ($method === 'POST'   && $id && $sub === 'deadlines')          createVehicleDeadline((int)$id, $input);
        elseif ($method === 'DELETE' && $id && $sub === 'deadlines' && $subId) deleteVehicleDeadline((int)$id, $subId);
        elseif ($method === 'GET'    && $id && $sub === 'documents' && !$subId) getVehicleDocuments((int)$id);
        elseif ($method === 'POST'   && $id && $sub === 'documents' && !$subId) uploadVehicleDocument((int)$id);
        elseif ($method === 'GET'    && $id && $sub === 'documents' && $subId)  downloadVehicleDocument((int)$id, $subId);
        elseif ($method === 'DELETE' && $id && $sub === 'documents' && $subId)  deleteVehicleDocument((int)$id, $subId);
        else sendError(405, 'Metóda nie je povolená');
        break;

    // --- USERS ---
    case 'users':
        require_once __DIR__ . '/api/users.php';
        if ($method === 'GET' && !$id)     getUsers();
        elseif ($method === 'GET' && $id)  getUser((int)$id);
        elseif ($method === 'POST')        createUser($input);
        elseif ($method === 'PUT' && $id)  updateUser((int)$id, $input);
        else sendError(405, 'Metóda nie je povolená');
        break;

    // --- DRIVERS (driver details + documents) ---
    case 'drivers':
        require_once __DIR__ . '/api/drivers.php';
        $driverId = (int)($segments[1] ?? 0);
        $docId    = (int)($segments[3] ?? 0);
        $sub      = $segments[2] ?? '';   // 'documents'

        if ($method === 'GET'    && $driverId && !$sub)          getDriverDetail($driverId);
        elseif ($method === 'PUT'    && $driverId && !$sub)      saveDriverDetail($driverId, $input);
        elseif ($method === 'POST'   && $driverId && $sub === 'documents') uploadDriverDocument($driverId);
        elseif ($method === 'GET'    && $driverId && $sub === 'documents' && $docId) downloadDriverDocument($driverId, $docId);
        elseif ($method === 'DELETE' && $driverId && $sub === 'documents' && $docId) deleteDriverDocument($driverId, $docId);
        else sendError(405, 'Metóda nie je povolená');
        break;

    // --- VEHICLE DETAILS (ECV-based, no vehicles table dependency) ---
    case 'vehicle-details':
        require_once __DIR__ . '/api/vehicle-details.php';
        $ecv   = urldecode($segments[1] ?? '');
        $sub   = $segments[2] ?? '';
        $subId = (int)($segments[3] ?? 0);

        if (!$ecv) { sendError(400, 'EČV je povinné'); break; }

        if    ($method === 'GET'    && !$sub)                                    getVehicleDetail($ecv);
        elseif ($method === 'PUT'   && !$sub)                                    upsertVehicleDetail($ecv, $input);
        elseif ($method === 'GET'   && $sub === 'deadlines' && !$subId)          getVehicleDeadlinesDetail($ecv);
        elseif ($method === 'POST'  && $sub === 'deadlines')                     createVehicleDeadlineDetail($ecv, $input);
        elseif ($method === 'PUT'   && $sub === 'deadlines' && $subId)            updateVehicleDeadlineDetail($ecv, $subId, $input);
        elseif ($method === 'PATCH' && $sub === 'deadlines' && $subId)           updateDeadlineStav($ecv, $subId, $input);
        elseif ($method === 'DELETE'&& $sub === 'deadlines' && $subId)           deleteVehicleDeadlineDetail($ecv, $subId);
        elseif ($method === 'GET'   && $sub === 'documents' && !$subId)          getVehicleDocumentsDetail($ecv);
        elseif ($method === 'POST'  && $sub === 'documents' && !$subId)          uploadVehicleDocumentDetail($ecv);
        elseif ($method === 'GET'   && $sub === 'documents' && $subId)           downloadVehicleDocumentDetail($ecv, $subId);
        elseif ($method === 'DELETE'&& $sub === 'documents' && $subId)           deleteVehicleDocumentDetail($ecv, $subId);
        elseif ($method === 'GET'   && $sub === 'service' && !$subId)            getServiceRecordsDetail($ecv);
        elseif ($method === 'POST'  && $sub === 'service' && !$subId)            createServiceRecordDetail($ecv, $input);
        elseif ($method === 'PUT'   && $sub === 'service' && $subId)             updateServiceRecordDetail($ecv, $subId, $input);
        elseif ($method === 'DELETE'&& $sub === 'service' && $subId)             deleteServiceRecordDetail($ecv, $subId);
        else sendError(405, 'Metóda nie je povolená');
        break;

    // --- TRAILERS ---
    case 'trailers':
        require_once __DIR__ . '/api/trailers.php';
        $ecv = urldecode($segments[1] ?? '');
        if    ($method === 'GET'    && !$ecv)  getTrailers();
        elseif ($method === 'POST'  && !$ecv)  createTrailer($input);
        elseif ($method === 'PUT'   && $ecv)   updateTrailer($ecv, $input);
        elseif ($method === 'DELETE'&& $ecv)   deleteTrailer($ecv);
        else sendError(405, 'Metóda nie je povolená');
        break;

    // --- REMINDERS ---
    case 'reminders':
        require_once __DIR__ . '/api/reminders.php';
        $remSub = $segments[1] ?? '';
        $remId  = is_numeric($remSub) ? (int)$remSub : 0;
        if    ($method === 'GET'   && !$remSub)                          getReminders();
        elseif ($method === 'PATCH' && $remId)                           updateReminderStav($remId, $input);
        elseif ($method === 'PATCH' && $remSub === 'driver')             updateDriverReminderStav((int)($segments[2] ?? 0), $input);
        else sendError(405, 'Metóda nie je povolená');
        break;

    // --- DASHBOARD ---
    case 'dashboard':
        require_once __DIR__ . '/api/dashboard.php';
        if ($method === 'GET') getDashboard();
        else sendError(405, 'Metóda nie je povolená');
        break;

    // --- TRACKING (Webdispatching) ---
    case 'tracking':
        require_once __DIR__ . '/api/tracking.php';
        $action = $segments[1] ?? '';
        if ($method === 'GET' && $action === 'positions') getPositions();
        elseif ($method === 'GET' && $action === 'cars')    getTrackingCars();
        elseif ($method === 'GET'  && $action === 'drivers')  getDrivers();
        elseif ($method === 'PUT'  && $action === 'driver')   updateDriver((int)($segments[2] ?? 0), $input);
        elseif ($method === 'GET' && $action === 'history') getPositionHistory();
        elseif ($method === 'GET' && $action === 'status')  getTrackingStatus();
        elseif ($method === 'GET' && $action === 'wd-raw')  getWdRaw();
        else sendError(404, 'Endpoint nenájdený');
        break;

    // --- LOGS ---
    case 'logs':
        require_once __DIR__ . '/api/logs.php';
        if ($method === 'GET') getLogs();
        else sendError(405, 'Metóda nie je povolená');
        break;

    // --- DEFAULT ---
    default:
        sendError(404, 'Endpoint nenájdený');
        break;
}

// ============================================
// HELPER FUNKCIE
// ============================================

function sendJSON($data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function sendError(int $code, string $message): void {
    http_response_code($code);
    echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}
