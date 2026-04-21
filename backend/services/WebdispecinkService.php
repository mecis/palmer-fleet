<?php
// Webdispatching SOAP klient (bez php-soap, využíva cURL + raw XML)

require_once __DIR__ . '/../config/webdispecink.php';

class WebdispecinkService {

    private const ENDPOINT  = 'https://api.webdispecink.cz/code/WebDispecinkServiceNet.php';
    private const NAMESPACE = 'urn://api.webdispecink.cz/webdisser_02';

    // ------------------------------------------------------------------ //
    //  Verejné metódy
    // ------------------------------------------------------------------ //

    public static function testLogin(): bool {
        try {
            $res = self::call('_login', self::auth());
            // call() vracia obsah <return> — pre _login je to '1' (ok) alebo '0' (fail)
            return trim($res ?? '') === '1';
        } catch (Exception $e) {
            return false;
        }
    }

    /** Aktuálne polohy všetkých vozidiel */
    public static function getAllPositions(bool $geocode = false): array {
        $res = self::call('_getAllCarsPosition', array_merge(self::auth(), [
            'geocode' => $geocode ? 1 : 0,
        ]));
        return self::rows($res);
    }

    /** Zoznam vozidiel */
    public static function getCarsList(): array {
        $res = self::call('_getCarsList2', array_merge(self::auth(), [
            'activeOnly' => 0,
        ]));
        return self::rows($res);
    }

    /** História polôh vozidla (časy v UTC: "YYYY-MM-DD HH:MM:SS") */
    public static function getTimePositions(int $carId, string $from, string $to): array {
        $res = self::call('_getTimePositions2', array_merge(self::auth(), [
            'IdCar'      => $carId,
            'GMDateFrom' => $from,
            'GMDateTo'   => $to,
        ]));
        return self::rows($res);
    }

    /** Aktualizácia vodiča */
    public static function updateDriver(int $driverId, array $data): bool {
        $res = self::call('_updateDriver', array_merge(self::auth(), [
            'iddriver'   => $driverId,
            'r_jmeno'    => $data['jmeno']    ?? '',
            'r_prijmeni' => $data['prijmeni'] ?? '',
            'mobil'      => $data['mobil']    ?? '',
            'dallas'     => $data['dallas']   ?? '',
        ]));
        return trim($res ?? '') === '1';
    }

    /** Zoznam príves (správna metóda) */
    public static function getTrailersList(): array {
        $res = self::call('_getTrailer2', array_merge(self::auth(), [
            'activeOnly' => 0,
        ]));
        return self::rows($res);
    }

    /** Zoznam vodičov */
    public static function getDriversList(bool $includeDisabled = false): array {
        $res = self::call('_getDriversList', array_merge(self::auth(), [
            'disabled' => $includeDisabled ? 1 : 0,
        ]));
        return self::rows($res);
    }

    /** Rozšírený zoznam vodičov */
    public static function getDriversList2(): array {
        $res = self::call('_getDriversList2', self::auth());
        return self::rows($res);
    }

    /** Skupiny vozidiel */
    public static function getCarGroups(): array {
        $res = self::call('_getCargroups', self::auth());
        return self::rows($res);
    }

    /** Atribúty vozidla (značka, model, VIN, ...) */
    public static function getCarAtribut(int $carId): array {
        $res = self::call('_getCarAtribut2', array_merge(self::auth(), [
            'IdCar' => $carId,
        ]));
        return self::rows($res);
    }

    /** Aktívne výstrahy kontrolky */
    public static function getWarningLightsActive(int $carId): array {
        $res = self::call('_getWarningLightsActive', array_merge(self::auth(), [
            'IdCar' => $carId,
        ]));
        return self::rows($res);
    }

    /** História výstrah kontroliek */
    public static function getWarningLightsHistory(int $carId, string $from, string $to): array {
        $res = self::call('_getWarningLightsHistory', array_merge(self::auth(), [
            'IdCar'      => $carId,
            'GMDateFrom' => $from,
            'GMDateTo'   => $to,
        ]));
        return self::rows($res);
    }

    /** Palivové karty */
    public static function getFuelCards(): array {
        $res = self::call('_getFuelCards', self::auth());
        return self::rows($res);
    }

    /** Kniha jázd */
    public static function getCarLogBook(int $carId, string $from, string $to): array {
        $res = self::call('_getCarLogBook', array_merge(self::auth(), [
            'IdCar'      => $carId,
            'GMDateFrom' => $from,
            'GMDateTo'   => $to,
        ]));
        return self::rows($res);
    }

    /** Prekročenie rýchlosti */
    public static function getCarOverSpeed(int $carId, string $from, string $to): array {
        $res = self::call('_getCarOverSpeed', array_merge(self::auth(), [
            'IdCar'      => $carId,
            'GMDateFrom' => $from,
            'GMDateTo'   => $to,
        ]));
        return self::rows($res);
    }

    /** Hraničné priechody */
    public static function getBorderCrossing(int $carId, string $from, string $to): array {
        $res = self::call('_getBorderCrossing', array_merge(self::auth(), [
            'IdCar'      => $carId,
            'GMDateFrom' => $from,
            'GMDateTo'   => $to,
        ]));
        return self::rows($res);
    }

    /** Štatistiky vodičov */
    public static function getStaDrivers(string $from, string $to): array {
        $res = self::call('_getStaDrivers', array_merge(self::auth(), [
            'GMDateFrom' => $from,
            'GMDateTo'   => $to,
        ]));
        return self::rows($res);
    }

    /** Štatistiky vozidiel */
    public static function getStaCars(string $from, string $to): array {
        $res = self::call('_getStaCars', array_merge(self::auth(), [
            'GMDateFrom' => $from,
            'GMDateTo'   => $to,
        ]));
        return self::rows($res);
    }

    /** Hodnotenie štýlu jazdy vodiča */
    public static function getDriverRating(int $driverId, string $from, string $to): array {
        $res = self::call('_getDriverRating', array_merge(self::auth(), [
            'IdDriver'   => $driverId,
            'GMDateFrom' => $from,
            'GMDateTo'   => $to,
        ]));
        return self::rows($res);
    }

    // ------------------------------------------------------------------ //
    //  Interné pomocné metódy
    // ------------------------------------------------------------------ //

    private static function auth(): array {
        return [
            'kodf'     => WD_KODF,
            'username' => WD_USERNAME,
            'pass'     => WD_PASSWORD,
        ];
    }

    /**
     * Vykoná SOAP volanie a vráti SimpleXMLElement "return" sekcie.
     */
    private static function call(string $method, array $params): ?string {
        $paramsXml = '';
        foreach ($params as $key => $val) {
            $paramsXml .= '<' . $key . '>' . htmlspecialchars((string)$val, ENT_XML1) . '</' . $key . '>';
        }

        $envelope = <<<XML
<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope
    xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:ns1="{self::NAMESPACE}">
  <SOAP-ENV:Body>
    <ns1:{$method}>
      {$paramsXml}
    </ns1:{$method}>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>
XML;
        // PHP heredoc nepodporuje self:: — musíme vložiť namespace ručne
        $envelope = str_replace('{self::NAMESPACE}', self::NAMESPACE, $envelope);

        $ch = curl_init(self::ENDPOINT);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $envelope,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 30,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: text/xml; charset=UTF-8',
                'SOAPAction: "' . self::NAMESPACE . '#' . $method . '"',
            ],
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr  = curl_error($ch);
        curl_close($ch);

        if ($curlErr) {
            throw new RuntimeException("cURL chyba: $curlErr");
        }
        if ($httpCode !== 200) {
            throw new RuntimeException("SOAP chyba HTTP $httpCode: " . substr($response, 0, 300));
        }

        // Parsovanie odpovede
        // Fault check
        if (strpos($response, '<faultstring>') !== false) {
            preg_match('/<faultstring>(.*?)<\/faultstring>/s', $response, $m);
            throw new RuntimeException('SOAP Fault: ' . ($m[1] ?? 'unknown'));
        }

        // Vyberieme obsah <return>...</return>
        if (!preg_match('/<return[^>]*>(.*?)<\/return>/s', $response, $m)) {
            return null; // prázdna odpoveď (napr. _login vracia bool)
        }

        return $m[1];
    }

    /**
     * Prevedie XML string na array of arrays.
     * Podporuje: <item><field>val</field></item> aj <return><field>val</field></return>
     */
    private static function rows(?string $xml): array {
        if ($xml === null || trim($xml) === '') return [];

        // Pokus: pole <item> elementov
        preg_match_all('/<item[^>]*>(.*?)<\/item>/s', $xml, $items);
        if (!empty($items[1])) {
            return array_map([self::class, 'parseFields'], $items[1]);
        }

        // Fallback: priame pole polí (každý tag = riadok)
        // napr. <row>...</row> alebo akýkoľvek opakujúci sa tag
        preg_match_all('/<([a-zA-Z][a-zA-Z0-9_]*)>(.*?)<\/\1>/s', $xml, $tags, PREG_SET_ORDER);
        if (empty($tags)) return [];

        // Ak prvý child sám obsahuje children — je to pole
        $firstTag = $tags[0][1];
        $firstContent = $tags[0][2];
        if (strpos($firstContent, '<') !== false) {
            // Pole riadkov — každý tag je riadok
            $result = [];
            foreach ($tags as $tag) {
                $row = self::parseFields($tag[2]);
                if (!empty($row)) $result[] = $row;
            }
            return $result;
        }

        // Inak je to jediný objekt — vrátime ako jeden riadok
        return [self::parseFields($xml)];
    }

    /** Parsuje <field>value</field> páry z XML stringu */
    private static function parseFields(string $xml): array {
        preg_match_all('/<([a-zA-Z][a-zA-Z0-9_]*)>(.*?)<\/\1>/s', $xml, $m, PREG_SET_ORDER);
        $row = [];
        foreach ($m as $match) {
            $row[$match[1]] = html_entity_decode($match[2], ENT_XML1 | ENT_QUOTES, 'UTF-8');
        }
        return $row;
    }
}
