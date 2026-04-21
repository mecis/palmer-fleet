<?php
// Palmer Fleet - Dashboard API

function getDashboard(): void {
    Auth::requireAuth();

    $db = Database::connect();

    // Posledné 4 servisné záznamy
    $posledneServisy = $db->query("
        SELECT s.id, s.typ_ukonu, s.popis, s.datum_ukonu, s.ecv,
               COALESCE(d.znacka, '') AS znacka,
               COALESCE(d.model, '')  AS model
        FROM service_records s
        LEFT JOIN vehicle_details d ON d.ecv = s.ecv
        ORDER BY s.datum_ukonu DESC, s.id DESC
        LIMIT 4
    ")->fetchAll();

    // Posledné 4 nahrané dokumenty vodičov
    $posledneDokumenty = $db->query("
        SELECT id, wd_driver_id, nazov, typ_dokumentu, mime_type, velkost, created_at
        FROM driver_documents
        ORDER BY created_at DESC, id DESC
        LIMIT 4
    ")->fetchAll();

    sendJSON([
        'posledne_servisy'           => $posledneServisy,
        'posledne_dokumenty_vodicov' => $posledneDokumenty,
    ]);
}
