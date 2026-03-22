<?php
// Palmer Fleet - Dashboard API

function getDashboard(): void {
    Auth::requireAuth();
    
    $db = Database::connect();

    // Blížiace sa termíny (nasledujúcich 30 dní)
    $stmtDeadlines = $db->query("
        SELECT 
            d.id, d.typ, d.datum_expiracie, d.poznamka,
            v.ecv, v.znacka, v.model, v.id AS id_vozidla,
            DATEDIFF(d.datum_expiracie, CURDATE()) AS dni_do_expiracie
        FROM deadlines d
        JOIN vehicles v ON d.id_vozidla = v.id
        WHERE v.aktivne = 1
          AND d.datum_expiracie BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
        ORDER BY d.datum_expiracie ASC
    ");

    // Expirované termíny (už po termíne)
    $stmtExpired = $db->query("
        SELECT 
            d.id, d.typ, d.datum_expiracie,
            v.ecv, v.znacka, v.model, v.id AS id_vozidla,
            DATEDIFF(CURDATE(), d.datum_expiracie) AS dni_po_expiracie
        FROM deadlines d
        JOIN vehicles v ON d.id_vozidla = v.id
        WHERE v.aktivne = 1
          AND d.datum_expiracie < CURDATE()
        ORDER BY d.datum_expiracie ASC
    ");

    // Štatistiky
    $stmtStats = $db->query("
        SELECT
            (SELECT COUNT(*) FROM vehicles WHERE aktivne = 1) AS pocet_vozidiel,
            (SELECT COUNT(*) FROM users WHERE aktivny = 1 AND rola = 'vodic') AS pocet_vodicov,
            (SELECT COUNT(*) FROM service_records WHERE MONTH(datum_ukonu) = MONTH(CURDATE()) AND YEAR(datum_ukonu) = YEAR(CURDATE())) AS servisy_tento_mesiac,
            (SELECT COALESCE(SUM(cena), 0) FROM service_records WHERE MONTH(datum_ukonu) = MONTH(CURDATE()) AND YEAR(datum_ukonu) = YEAR(CURDATE())) AS naklady_tento_mesiac
    ");

    // Posledné servisné záznamy
    $stmtRecentService = $db->query("
        SELECT 
            s.id, s.typ_ukonu, s.popis, s.cena, s.datum_ukonu,
            v.ecv, v.znacka
        FROM service_records s
        JOIN vehicles v ON s.id_vozidla = v.id
        ORDER BY s.datum_vytvorenia DESC
        LIMIT 5
    ");

    sendJSON([
        'blizace_terminy' => $stmtDeadlines->fetchAll(),
        'expirovane_terminy' => $stmtExpired->fetchAll(),
        'statistiky' => $stmtStats->fetch(),
        'posledne_servisy' => $stmtRecentService->fetchAll(),
    ]);
}
