<?php
// JWT auth middleware - vlastna implementacia (HS256)

require_once __DIR__ . '/../config/database.php';

class Auth {

    // vygeneruje token pri prihlaseni; expirovany za 8h
    public static function generateToken(array $user): string {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload = json_encode([
            'id' => $user['id'],
            'email' => $user['email'],
            'rola' => $user['rola'],
            'wd_driver_id' => isset($user['wd_driver_id']) ? (int)$user['wd_driver_id'] : null,
            'exp' => time() + (60 * 60 * 8),
        ]);

        $base64Header = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $base64Payload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));

        $signature = hash_hmac('sha256', "$base64Header.$base64Payload", JWT_SECRET, true);
        $base64Signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

        return "$base64Header.$base64Payload.$base64Signature";
    }

    // overi token z Authorization hlavicky, vrati payload alebo null
    public static function verifyToken(): ?array {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

        if (!preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
            return null;
        }

        $token = $matches[1];
        $parts = explode('.', $token);

        if (count($parts) !== 3) {
            return null;
        }

        [$base64Header, $base64Payload, $base64Signature] = $parts;

        // overim podpis
        $signature = hash_hmac('sha256', "$base64Header.$base64Payload", JWT_SECRET, true);
        $expectedSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

        if (!hash_equals($expectedSignature, $base64Signature)) {
            return null;
        }

        $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $base64Payload)), true);

        // expiracia
        if (!$payload || ($payload['exp'] ?? 0) < time()) {
            return null;
        }

        return $payload;
    }

    // ak token chyba alebo neplatny -> 401
    public static function requireAuth(): array {
        $user = self::verifyToken();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Neautorizovany pristup']);
            exit;
        }
        return $user;
    }

    // ak rola nesedi -> 403
    public static function requireRole(array $allowedRoles): array {
        $user = self::requireAuth();
        if (!in_array($user['rola'], $allowedRoles)) {
            http_response_code(403);
            echo json_encode(['error' => 'Nedostatocne opravnenie']);
            exit;
        }
        return $user;
    }
}
