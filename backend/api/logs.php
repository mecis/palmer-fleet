<?php
// Palmer Fleet - System Log API

function getLogs(): void {
    Auth::requireRole(['admin']);

    $db = Database::connect();

    $limit  = min((int)($_GET['limit'] ?? 100), 500);
    $offset = (int)($_GET['offset'] ?? 0);
    $akcia  = $_GET['akcia'] ?? '';

    $where = $akcia ? 'WHERE akcia = ?' : '';
    $params = $akcia ? [$akcia] : [];

    $stmt = $db->prepare("
        SELECT id, datum, akcia, popis, user_id, user_meno, ip_adresa
        FROM system_log
        $where
        ORDER BY datum DESC
        LIMIT $limit OFFSET $offset
    ");
    $stmt->execute($params);
    $logs = $stmt->fetchAll();

    $countStmt = $db->prepare("SELECT COUNT(*) FROM system_log $where");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    sendJSON(['logs' => $logs, 'total' => $total]);
}

function writeLog(PDO $db, string $akcia, string $popis, ?int $userId, ?string $userMeno): void {
    $ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? null;
    $stmt = $db->prepare('INSERT INTO system_log (akcia, popis, user_id, user_meno, ip_adresa) VALUES (?, ?, ?, ?, ?)');
    $stmt->execute([$akcia, $popis, $userId, $userMeno, $ip]);
}
