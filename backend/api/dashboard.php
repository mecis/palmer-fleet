<?php
// data pre dashboard - tahane queries naraz, frontend si to roztriedi

function getDashboard(): void {
    Auth::requireAuth();

    $db = Database::connect();

    // posledne servisne zaznamy
    $servisy = $db->query("
        SELECT s.id, s.typ_ukonu, s.popis, s.datum_ukonu, s.ecv,
               COALESCE(d.znacka, '') AS znacka,
               COALESCE(d.model, '') AS model
        FROM service_records s
        LEFT JOIN vehicle_details d ON d.ecv = s.ecv
        ORDER BY s.datum_ukonu DESC, s.id DESC
        LIMIT 4
    ")->fetchAll();

    // posledne nahrane dokumenty vodicov
    $dokumenty = $db->query("
        SELECT id, wd_driver_id, nazov, typ_dokumentu, mime_type, velkost, created_at
        FROM driver_documents
        ORDER BY created_at DESC, id DESC
        LIMIT 4
    ")->fetchAll();

    sendJSON([
        'posledne_servisy' => $servisy,
        'posledne_dokumenty_vodicov' => $dokumenty,
    ]);
}
