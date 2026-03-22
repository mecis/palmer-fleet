-- Palmer Fleet - Databázová schéma
-- Verzia: 1.0
-- Autor: Martin Mečiar

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

USE palmer_fleet;

-- ============================================
-- Tabuľka: users (Používatelia)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    meno VARCHAR(100) NOT NULL,
    priezvisko VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    heslo VARCHAR(255) NOT NULL,
    rola ENUM('admin', 'dispecer', 'manazer', 'vodic') NOT NULL DEFAULT 'vodic',
    telefon VARCHAR(20) DEFAULT NULL,
    aktivny TINYINT(1) NOT NULL DEFAULT 1,
    datum_vytvorenia DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    datum_aktualizacie DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- Tabuľka: vehicles (Vozidlá)
-- ============================================
CREATE TABLE IF NOT EXISTS vehicles (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ecv VARCHAR(20) NOT NULL UNIQUE COMMENT 'Evidenčné číslo vozidla',
    vin VARCHAR(17) DEFAULT NULL UNIQUE COMMENT 'Vehicle Identification Number',
    znacka VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    rok_vyroby YEAR DEFAULT NULL,
    stav_odometra INT UNSIGNED DEFAULT 0 COMMENT 'Aktuálny stav km',
    typ_vozidla ENUM('tahac', 'naves', 'dodavka', 'osobne') NOT NULL DEFAULT 'tahac',
    aktivne TINYINT(1) NOT NULL DEFAULT 1,
    poznamka TEXT DEFAULT NULL,
    datum_vytvorenia DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    datum_aktualizacie DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- Tabuľka: assignments (Priradenia vodič-vozidlo)
-- ============================================
CREATE TABLE IF NOT EXISTS assignments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_vozidla INT UNSIGNED NOT NULL,
    id_pouzivatela INT UNSIGNED NOT NULL,
    datum_od DATE NOT NULL,
    datum_do DATE DEFAULT NULL COMMENT 'NULL = aktuálne priradenie',
    poznamka TEXT DEFAULT NULL,
    datum_vytvorenia DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_vozidla) REFERENCES vehicles(id) ON DELETE RESTRICT,
    FOREIGN KEY (id_pouzivatela) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_assignment_vehicle (id_vozidla),
    INDEX idx_assignment_user (id_pouzivatela),
    INDEX idx_assignment_dates (datum_od, datum_do)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- Tabuľka: service_records (Servisné záznamy)
-- ============================================
CREATE TABLE IF NOT EXISTS service_records (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_vozidla INT UNSIGNED NOT NULL,
    id_pouzivatela INT UNSIGNED NOT NULL COMMENT 'Kto záznam vytvoril',
    typ_ukonu ENUM('oprava', 'udrzba', 'pneu', 'olej', 'brzdy', 'ine') NOT NULL,
    popis VARCHAR(500) NOT NULL,
    cena DECIMAL(10,2) DEFAULT NULL,
    stav_odometra_pri_servise INT UNSIGNED DEFAULT NULL,
    datum_ukonu DATE NOT NULL,
    poznamka TEXT DEFAULT NULL,
    datum_vytvorenia DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_vozidla) REFERENCES vehicles(id) ON DELETE RESTRICT,
    FOREIGN KEY (id_pouzivatela) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_service_vehicle (id_vozidla),
    INDEX idx_service_date (datum_ukonu)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- Tabuľka: deadlines (Termíny / Expirácie)
-- ============================================
CREATE TABLE IF NOT EXISTS deadlines (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_vozidla INT UNSIGNED NOT NULL,
    typ ENUM('stk', 'ek', 'poistenie', 'tachograf', 'dalsie') NOT NULL,
    datum_expiracie DATE NOT NULL,
    poznamka TEXT DEFAULT NULL,
    notifikovane TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Bola notifikácia odoslaná',
    datum_vytvorenia DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    datum_aktualizacie DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_vozidla) REFERENCES vehicles(id) ON DELETE RESTRICT,
    INDEX idx_deadline_vehicle (id_vozidla),
    INDEX idx_deadline_expiry (datum_expiracie),
    INDEX idx_deadline_type_expiry (typ, datum_expiracie)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- Tabuľka: documents (Dokumenty / Súbory)
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_vozidla INT UNSIGNED DEFAULT NULL,
    id_pouzivatela INT UNSIGNED NOT NULL COMMENT 'Kto nahral dokument',
    nazov VARCHAR(255) NOT NULL,
    typ_dokumentu ENUM('cmr', 'dodaci_list', 'faktura', 'fotografia', 'ine') NOT NULL,
    cesta_suboru VARCHAR(500) NOT NULL COMMENT 'Cesta k súboru na serveri',
    velkost INT UNSIGNED DEFAULT NULL COMMENT 'Veľkosť v bytoch',
    datum_nahratia DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_vozidla) REFERENCES vehicles(id) ON DELETE SET NULL,
    FOREIGN KEY (id_pouzivatela) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_document_vehicle (id_vozidla),
    INDEX idx_document_user (id_pouzivatela)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- Testovací admin účet (heslo: admin123)
-- Heslo je bcrypt hash - ZMEŇ PO PRVOM PRIHLÁSENÍ
-- ============================================
INSERT INTO users (meno, priezvisko, email, heslo, rola) VALUES
('Admin', 'Palmer', 'admin@palmer.sk', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

SET FOREIGN_KEY_CHECKS = 1;
