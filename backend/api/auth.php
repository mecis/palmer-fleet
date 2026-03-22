<?php
// Palmer Fleet - Auth API

function handleLogin(array $input): void {
    // Validácia vstupu
    $email = trim($input['email'] ?? '');
    $password = $input['heslo'] ?? '';

    if (!$email || !$password) {
        sendError(400, 'Email a heslo sú povinné');
    }

    $db = Database::connect();
    $stmt = $db->prepare('SELECT id, meno, priezvisko, email, heslo, rola, aktivny FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['heslo'])) {
        sendError(401, 'Nesprávny email alebo heslo');
    }

    if (!$user['aktivny']) {
        sendError(403, 'Účet je deaktivovaný');
    }

    // Generovanie tokenu
    $token = Auth::generateToken($user);

    sendJSON([
        'token' => $token,
        'user' => [
            'id' => $user['id'],
            'meno' => $user['meno'],
            'priezvisko' => $user['priezvisko'],
            'email' => $user['email'],
            'rola' => $user['rola'],
        ]
    ]);
}

function handleMe(): void {
    $authUser = Auth::requireAuth();
    
    $db = Database::connect();
    $stmt = $db->prepare('SELECT id, meno, priezvisko, email, rola FROM users WHERE id = ?');
    $stmt->execute([$authUser['id']]);
    $user = $stmt->fetch();

    if (!$user) {
        sendError(404, 'Používateľ nenájdený');
    }

    sendJSON($user);
}
