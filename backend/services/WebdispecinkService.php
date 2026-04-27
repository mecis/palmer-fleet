<?php
// SOAP klient pre Webdispecink. Bez php-soap, robim si XML rucne cez cURL.

require_once __DIR__ . '/../config/webdispecink.php';

class WebdispecinkService {

    private const ENDPOINT  = 'https://api.webdispecink.cz/code/WebDispecinkServiceNet.php';
    private const NAMESPACE = 'urn://api.webdispecink.cz/webdisser_02';

    public static function testLogin(): bool {
        try {
            $res = self::call('_login', self::auth());
            // _login vracia '1' alebo '0'
            return trim($res ?? '') === '1';
        } catch (Exception $e) {
            return false;
        }
    }

    public static function getAllPositions(bool $geocode = false): array {
        $res = self::call('_getAllCarsPosition', array_merge(self::auth(), [
            'geocode' => $geocode ? 1 : 0,
        ]));
        return self::rows($res);
    }

    public static function getCarsList(): array {
        $res = self::call('_getCarsList2', array_merge(self::auth(), [
            'activeOnly' => 0,
        ]));
        return self::rows($res);
    }

    // historia poloh, casy v UTC
    public static function getTimePositions(int $carId, string $from, string $to): array {
        $res = self::call('_getTimePositions2', array_merge(self::auth(), [
            'IdCar' => $carId,
            'GMDateFrom' => $from,
            'GMDateTo' => $to,
        ]));
        return self::rows($res);
    }

    public static function updateDriver(int $driverId, array $data): bool {
        $res = self::call('_updateDriver', array_merge(self::auth(), [
            'iddriver' => $driverId,
            'r_jmeno' => $data['jmeno'] ?? '',
            'r_prijmeni' => $data['prijmeni'] ?? '',
            'mobil' => $data['mobil'] ?? '',
            'dallas' => $data['dallas'] ?? '',
        ]));
        return trim($res ?? '') === '1';
    }

    // pozor, _getTrailer2 nie _getTrailers
    public static function getTrailersList(): array {
        $res = self::call('_getTrailer2', array_merge(self::auth(), [
            'activeOnly' => 0,
        ]));
        return self::rows($res);
    }

    public static function getDriversList(bool $includeDisabled = false): array {
        $res = self::call('_getDriversList', array_merge(self::auth(), [
            'disabled' => $includeDisabled ? 1 : 0,
        ]));
        return self::rows($res);
    }

    public static function getDriversList2(): array {
        $res = self::call('_getDriversList2', self::auth());
        return self::rows($res);
    }

    public static function getCarGroups(): array {
        $res = self::call('_getCargroups', self::auth());
        return self::rows($res);
    }

    public static function getCarAtribut(int $carId): array {
        $res = self::call('_getCarAtribut2', array_merge(self::auth(), [
            'IdCar' => $carId,
        ]));
        return self::rows($res);
    }

    public static function getWarningLightsActive(int $carId): array {
        $res = self::call('_getWarningLightsActive', array_merge(self::auth(), [
            'IdCar' => $carId,
        ]));
        return self::rows($res);
    }

    public static function getWarningLightsHistory(int $carId, string $from, string $to): array {
        $res = self::call('_getWarningLightsHistory', array_merge(self::auth(), [
            'IdCar' => $carId,
            'GMDateFrom' => $from,
            'GMDateTo' => $to,
        ]));
        return self::rows($res);
    }

    public static function getFuelCards(): array {
        $res = self::call('_getFuelCards', self::auth());
        return self::rows($res);
    }

    public static function getCarLogBook(int $carId, string $from, string $to): array {
        $res = self::call('_getCarLogBook', array_merge(self::auth(), [
            'IdCar' => $carId,
            'GMDateFrom' => $from,
            'GMDateTo' => $to,
        ]));
        return self::rows($res);
    }

    public static function getCarOverSpeed(int $carId, string $from, string $to): array {
        $res = self::call('_getCarOverSpeed', array_merge(self::auth(), [
            'IdCar' => $carId,
            'GMDateFrom' => $from,
            'GMDateTo' => $to,
        ]));
        return self::rows($res);
    }

    public static function getBorderCrossing(int $carId, string $from, string $to): array {
        $res = self::call('_getBorderCrossing', array_merge(self::auth(), [
            'IdCar' => $carId,
            'GMDateFrom' => $from,
            'GMDateTo' => $to,
        ]));
        return self::rows($res);
    }

    public static function getStaDrivers(string $from, string $to): array {
        $res = self::call('_getStaDrivers', array_merge(self::auth(), [
            'GMDateFrom' => $from,
            'GMDateTo' => $to,
        ]));
        return self::rows($res);
    }

    public static function getStaCars(string $from, string $to): array {
        $res = self::call('_getStaCars', array_merge(self::auth(), [
            'GMDateFrom' => $from,
            'GMDateTo' => $to,
        ]));
        return self::rows($res);
    }

    public static function getDriverRating(int $driverId, string $from, string $to): array {
        $res = self::call('_getDriverRating', array_merge(self::auth(), [
            'IdDriver' => $driverId,
            'GMDateFrom' => $from,
            'GMDateTo' => $to,
        ]));
        return self::rows($res);
    }

    private static function auth(): array {
        return [
            'kodf' => WD_KODF,
            'username' => WD_USERNAME,
            'pass' => WD_PASSWORD,
        ];
    }

    // posle SOAP request a vrati obsah <return>
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
        // heredoc nevie self::, doplnam string-replace
        $envelope = str_replace('{self::NAMESPACE}', self::NAMESPACE, $envelope);

        $ch = curl_init(self::ENDPOINT);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $envelope,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_HTTPHEADER => [
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

        // SOAP fault?
        if (strpos($response, '<faultstring>') !== false) {
            preg_match('/<faultstring>(.*?)<\/faultstring>/s', $response, $m);
            throw new RuntimeException('SOAP Fault: ' . ($m[1] ?? 'unknown'));
        }

        if (!preg_match('/<return[^>]*>(.*?)<\/return>/s', $response, $m)) {
            return null;
        }

        return $m[1];
    }

    // XML -> pole poli. Vie aj <item>...</item> aj plain <return>...</return>
    private static function rows(?string $xml): array {
        if ($xml === null || trim($xml) === '') return [];

        // 1. skusam najst <item> elementy
        preg_match_all('/<item[^>]*>(.*?)<\/item>/s', $xml, $items);
        if (!empty($items[1])) {
            return array_map([self::class, 'parseFields'], $items[1]);
        }

        // 2. fallback - kazdy opakujuci sa tag = jeden riadok
        preg_match_all('/<([a-zA-Z][a-zA-Z0-9_]*)>(.*?)<\/\1>/s', $xml, $tags, PREG_SET_ORDER);
        if (empty($tags)) return [];

        // ak prvy child obsahuje deti, je to pole
        $firstContent = $tags[0][2];
        if (strpos($firstContent, '<') !== false) {
            $result = [];
            foreach ($tags as $tag) {
                $row = self::parseFields($tag[2]);
                if (!empty($row)) $result[] = $row;
            }
            return $result;
        }

        // inak je to jeden objekt
        return [self::parseFields($xml)];
    }

    private static function parseFields(string $xml): array {
        preg_match_all('/<([a-zA-Z][a-zA-Z0-9_]*)>(.*?)<\/\1>/s', $xml, $m, PREG_SET_ORDER);
        $row = [];
        foreach ($m as $match) {
            $row[$match[1]] = html_entity_decode($match[2], ENT_XML1 | ENT_QUOTES, 'UTF-8');
        }
        return $row;
    }
}
