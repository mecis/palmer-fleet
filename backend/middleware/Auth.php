<?php
// Palmer Fleet - JWT Autentifikácia

require_once __DIR__ . '/../config/database.php';

class Auth {
    
    /**
     * Vytvorí JWT token pre používateľa
     */
    public static function generateToken(array $user): string {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload = json_encode([
            'id'   => $user['id'],
            'email' => $user['email'],
            'rola' => $user['rola'],
            'exp'  => time() + (60 * 60 * 8) // 8 hodín
        ]);

        $base64Header  = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $base64Payload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));

        $signature = hash_hmac('sha256', "$base64Header.$base64Payload", JWT_SECRET, true);
        $base64Signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

        return "$base64Header.$base64Payload.$base64Signature";
    }

    /**
     * Overí JWT token z Authorization hlavičky
     * Vráti payload alebo null
     */
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

        // Overenie podpisu
        $signature = hash_hmac('sha256', "$base64Header.$base64Payload", JWT_SECRET, true);
        $expectedSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

        if (!hash_equals($expectedSignature, $base64Signature)) {
            return null;
        }

        $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $base64Payload)), true);

        // Overenie expirácie
        if (!$payload || ($payload['exp'] ?? 0) < time()) {
            return null;
        }

        return $payload;
    }

    /**
     * Vyžaduje prihlásenie - ak nie je token, vráti 401
     */
    public static function requireAuth(): array {
        $user = self::verifyToken();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Neautorizovaný prístup']);
            exit;
        }
        return $user;
    }

    /**
     * Vyžaduje konkrétnu rolu
     */
    public static function requireRole(array $allowedRoles): array {
        $user = self::requireAuth();
        if (!in_array($user['rola'], $allowedRoles)) {
            http_response_code(403);
            echo json_encode(['error' => 'Nedostatočné oprávnenie']);
            exit;
        }
        return $user;
    }
}
