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
        if ($method === 'GET' && !$id)     getVehicles();
        elseif ($method === 'GET' && $id)  getVehicle((int)$id);
        elseif ($method === 'POST')        createVehicle($input);
        elseif ($method === 'PUT' && $id)  updateVehicle((int)$id, $input);
        elseif ($method === 'DELETE' && $id) deleteVehicle((int)$id);
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

    // --- DASHBOARD ---
    case 'dashboard':
        require_once __DIR__ . '/api/dashboard.php';
        if ($method === 'GET') getDashboard();
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
