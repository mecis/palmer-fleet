# Palmer Fleet – Sumár projektu

**Účel dokumentu:** prehľad projektu pre účely bakalárskej práce (sekcia *Návrh riešenia a technológie*). Obsahuje tech stack, architektúru, moduly, API povrch a DB schému.

---

## 1. Zhrnutie projektu

**Palmer Fleet** je webová aplikácia pre správu vozového parku dopravnej spoločnosti. Integruje živé dáta z externého telematického systému **Webdispečink** (SOAP API) s vlastnou evidenciou vozidiel, vodičov, termínov (STK, poistenie, tachograf), servisných záznamov a dokumentov. Používateľom s rôznymi rolami (admin, dispečer, manažér, vodič) poskytuje jednotné prostredie na sledovanie stavu flotily, upomienok a denných operácií.

**Cieľová skupina:** dispečeri a manažment dopravnej firmy Palmer.

---

## 2. Technologický stack

### 2.1 Backend

| Technológia | Verzia | Účel |
|---|---|---|
| **PHP** | 8.3 | Serverová logika, API |
| **MariaDB** | 10.x | Relačná databáza |
| **PDO** | — | Prístup k DB (prepared statements) |
| **JWT (firebase/php-jwt štýl – vlastná implementácia)** | — | Autentifikácia |
| **Apache (mod_rewrite, .htaccess)** | — | URL routing na `index.php` |
| **SOAP/cURL** | — | Klient pre Webdispečink API |

**Bez frameworku:** backend je custom „micro-framework" postavený okolo jedného front controllera ([backend/index.php](backend/index.php)) — zvolené pre minimálne závislosti, nízku réžiu a plnú kontrolu nad štruktúrou (cieľ bakalárky bol ukázať pochopenie architektúry, nie použitie Laravelu).

### 2.2 Frontend

| Technológia | Verzia | Účel |
|---|---|---|
| **React** | 19.2 | UI library |
| **Create React App (react-scripts)** | 5.0 | Build toolchain |
| **React Router** | 7.13 | SPA routing |
| **Axios** | 1.13 | HTTP klient |
| **Context API** | — | Globálny auth state (`AuthContext`) |
| **CSS** | — | Scoped štýly v `App.css` (bez preprocessora, bez UI knižnice) |

**Zdôvodnenie výberu React:** komponentná architektúra, veľká komunita, odľahčený stav cez hooks, kompatibilita s CRA pre jednoduché nasadenie ako statický build.

### 2.3 Integrácia s treťou stranou

- **Webdispečink** – SOAP API poskytovateľa GPS trackingu. Vracia pozície vozidiel, rýchlosti, vodičov, štatistiky (doba jazdy, km). Volané serverovo z [backend/services/WebdispecinkService.php](backend/services/WebdispecinkService.php) — frontend nikdy nevolá WD priamo (ochrana credentials).

---

## 3. Architektúra

### 3.1 Celkový pohľad

```
┌──────────────────┐           ┌─────────────────────┐           ┌──────────────────┐
│                  │  HTTPS    │                     │  SOAP     │                  │
│  React SPA       │ ────────▶ │  PHP REST API       │ ────────▶ │  Webdispečink    │
│  (browser)       │  JSON     │  (Apache + PHP 8.3) │  XML      │  (externé API)   │
│                  │ ◀──────── │                     │ ◀──────── │                  │
└──────────────────┘           └──────────┬──────────┘           └──────────────────┘
                                          │ PDO
                                          ▼
                                 ┌─────────────────┐
                                 │  MariaDB        │
                                 │  palmer_fleet   │
                                 └─────────────────┘
```

**Typ architektúry:** trojvrstvová (prezentačná / aplikačná / dátová) s jasne oddelenými zodpovednosťami. Frontend a backend komunikujú výhradne cez REST JSON API.

### 3.2 Backend – štruktúra

```
backend/
├── index.php                    # Front controller – routing (~170 riadkov)
├── config/
│   ├── Connection.php           # PDO singleton (Database::connect())
│   ├── database.php             # DB credentials
│   └── webdispecink.php         # WD credentials + endpoint
├── middleware/
│   ├── Auth.php                 # JWT auth – Auth::requireAuth() / requireRole()
│   └── cors.php                 # CORS hlavičky
├── api/                         # Endpoint handlers (funkcie)
│   ├── auth.php                 # Login, me
│   ├── dashboard.php            # Agregované údaje pre dashboard
│   ├── drivers.php              # Detaily vodičov + dokumenty
│   ├── vehicles.php             # Vozidlá (id-based) + deadlines, dokumenty
│   ├── vehicle-details.php      # Vozidlá (ECV-based) + deadlines, docs, service records
│   ├── trailers.php             # Návesy (manuálne spravované)
│   ├── reminders.php            # Centrálny prehľad exspirácií
│   ├── tracking.php             # Proxy na Webdispečink (pozície, vodiči)
│   ├── users.php                # Správa používateľov
│   └── logs.php                 # Systémové logy
├── services/
│   └── WebdispecinkService.php  # SOAP klient pre WD
└── uploads/                     # Nahrávané súbory (dokumenty, mimo VCS)
```

**Routing vzor:** všetky `/api/*` požiadavky rewritnuté `.htaccess`-om na `index.php`, ktorý switch-om rozhoduje podľa prvého URL segmentu a volá príslušnú funkciu z `api/*.php`.

**Príklad URL schémy:**
- `GET /api/vehicles` → `getVehicles()` v `api/vehicles.php`
- `GET /api/vehicle-details/{ecv}/service` → `getServiceRecordsDetail($ecv)` v `api/vehicle-details.php`
- `POST /api/vehicle-details/{ecv}/documents` → `uploadVehicleDocumentDetail($ecv)` (multipart)

### 3.3 Frontend – štruktúra

```
frontend/src/
├── App.js                       # Router + AuthProvider
├── App.css                      # Globálne CSS (~680 riadkov, scopované selektory)
├── context/
│   └── AuthContext.js           # useAuth() hook, JWT v localStorage
├── services/
│   └── api.js                   # Axios instance (baseURL, Authorization header)
├── components/
│   └── Layout.js                # Sidebar + header, ochrana rout
└── pages/                       # Route-level komponenty
    ├── Login.js
    ├── Dashboard.js             # Štatistiky, termíny, top vodiči, posledné servisy
    ├── Vehicles.js              # Zoznam ťahačov + návesov (2 sekcie), modal s tabmi
    ├── Drivers.js               # Zoznam vodičov + modal s detailmi a dokumentmi
    ├── Tracking.js              # Živá mapa (Webdispečink)
    ├── Users.js                 # Správa používateľov (admin)
    ├── Reminders.js             # Centrálny prehľad exspirácií
    ├── VehicleDetail.js
    ├── SystemLog.js
    └── WdDebug.js               # Debug endpoint pre WD SOAP odpovede
```

---

## 4. Autentifikácia a autorizácia

- **JWT** – vydávaný po úspešnom logine (`POST /api/auth/login`), ukladaný v `localStorage` na frontende, posielaný v hlavičke `Authorization: Bearer <token>`.
- **Middleware:**
  - `Auth::requireAuth()` – overí platnosť tokenu, vráti current user.
  - `Auth::requireRole(['admin', 'dispecer'])` – rolová kontrola.
- **Role:** `admin`, `dispecer`, `manazer`, `vodic`. Frontend zobrazuje rôzne UI prvky podľa `role` z `AuthContext`. Backend validuje na každom chránenom endpointe.

---

## 5. Databázová schéma (MariaDB)

**Hlavné tabuľky:**

| Tabuľka | Účel | Kľúčové stĺpce |
|---|---|---|
| `users` | Používatelia aplikácie | `email`, `heslo` (bcrypt), `rola` |
| `vehicles` | Vozidlá (ťahače, návesy, …) | `ecv` (unique), `vin`, `znacka`, `model`, `typ_vozidla` |
| `vehicle_details` | Rozšírené údaje (ECV-keyed) | `ecv` (PK), `naves_ecv` (priradený náves) |
| `vehicle_deadlines` | Termíny (STK, EK, poistenie, tachograf) | `ecv`, `typ`, `datum_expiracie`, `stav` |
| `vehicle_documents` | Nahrávané dokumenty vozidiel | `ecv`, `nazov`, `typ_dokumentu`, `mime_type` |
| `driver_documents` | Nahrávané dokumenty vodičov | `wd_driver_id`, `nazov`, `typ_dokumentu` |
| `service_records` | Servisné záznamy | `ecv`, `typ_ukonu`, `popis`, `cena`, `datum_ukonu` |
| `assignments` | Historické priradenia vodič↔vozidlo | `id_vozidla`, `id_pouzivatela`, `datum_od` |

**Dizajnové rozhodnutie:** kľúč `ecv` (evidenčné číslo vozidla) sa používa ako prirodzený identifikátor pre súvisiace tabuľky (`vehicle_deadlines`, `vehicle_documents`, `service_records`) — umožňuje rozšírené dáta pre vozidlá, ktoré reálne neexistujú v tabuľke `vehicles` (napr. vozidlá prichádzajúce iba z Webdispečinku). Číselné `id` zostáva pre kanonickú tabuľku `vehicles`.

---

## 6. Kľúčové funkčné moduly

1. **Dashboard** – 3 sekcie: štatistické karty (počet vozidiel/vodičov/expirujúcich termínov), tabuľka najbližších termínov + Top 5 vodičov podľa doby jazdy, posledné servisné záznamy + posledné dokumenty vodičov.
2. **Vozidlá** – ťahače (dáta z Webdispečinku + rozšírená evidencia) a návesy (manuálne spravované). Modal s tabmi: Informácie, Termíny, Servis, Dokumenty.
3. **Vodiči** – zoznam z Webdispečinku s doplnkovými údajmi (doba jazdy, km), detail modal s evidenciou a dokumentmi.
4. **Tracking** – živá poloha vozidiel (mapa Google Maps).
5. **Upomienky** – agregovaný pohľad na termíny blížiace sa k expirácii s farebným rozlíšením (zelený/oranžový/červený badge).
6. **Servisné záznamy** – CRUD pre úkony (oprava, údržba, pneu, olej, brzdy), s cenou a stavom odometra.
7. **Používatelia** – admin CRUD s rolami.
8. **Systémové logy** – audit log zmien.

---

## 7. REST API povrch (výber)

| Endpoint | Metóda | Popis |
|---|---|---|
| `/api/auth/login` | POST | Login → JWT |
| `/api/auth/me` | GET | Aktuálny user |
| `/api/dashboard` | GET | Agregované dáta pre dashboard |
| `/api/vehicles` | GET/POST | Zoznam / vytvorenie |
| `/api/vehicle-details/{ecv}` | GET/PUT | Detail vozidla |
| `/api/vehicle-details/{ecv}/deadlines` | GET/POST | Termíny |
| `/api/vehicle-details/{ecv}/deadlines/{id}` | PUT/PATCH/DELETE | Úprava/zmazanie termínu |
| `/api/vehicle-details/{ecv}/documents` | GET/POST | Dokumenty (multipart upload) |
| `/api/vehicle-details/{ecv}/service` | GET/POST | Servisné záznamy |
| `/api/trailers` | GET/POST | Návesy |
| `/api/drivers/{id}` | GET/PUT | Detail vodiča |
| `/api/drivers/{id}/documents` | POST | Upload dokumentu vodiča |
| `/api/reminders` | GET | Centrálny prehľad exspirácií |
| `/api/tracking/positions` | GET | Aktuálne pozície z WD |
| `/api/tracking/drivers` | GET | Vodiči z WD + štatistiky |

---

## 8. Bezpečnostné prvky

- **Bcrypt hash hesla** (`password_hash` / `password_verify`).
- **JWT** s expiráciou, overenie signature na backende.
- **PDO prepared statements** proti SQL injection.
- **CORS middleware** s whitelist origin.
- **Role-based authorization** na úrovni jednotlivých endpointov.
- **Upload validácia** – MIME type check, veľkosť (max 10 MB), whitelist prípon (PDF/JPG/PNG/WEBP).
- **Credentials WD na serveri** – frontend nikdy nedostane SOAP credentials.

---

## 9. Nasadenie (prostredie)

- Linux server (Ubuntu), Apache 2.4 s mod_rewrite.
- PHP 8.3 (FPM), MariaDB 10.
- Frontend build (`npm run build`) → statické súbory servované Apache-om.
- Backend ako samostatný vhost pod `/api` (alebo ako sub-path toho istého vhostu).

---

## 10. Štatistiky kódu (orientačne)

- Backend: ~3 500 riadkov PHP (10 API súborov + middleware + service).
- Frontend: ~6 000 riadkov JS/JSX v React komponentoch + ~700 riadkov CSS.
- Databáza: 10+ tabuliek.

---

## 11. Odkazy v repe

- Front controller: [backend/index.php](backend/index.php)
- Auth middleware: [backend/middleware/Auth.php](backend/middleware/Auth.php)
- WD SOAP klient: [backend/services/WebdispecinkService.php](backend/services/WebdispecinkService.php)
- DB schéma: [database/schema.sql](database/schema.sql)
- React entry: [frontend/src/App.js](frontend/src/App.js)
- API klient: [frontend/src/services/api.js](frontend/src/services/api.js)
