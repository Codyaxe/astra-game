-- =========================================================
-- Astra Constellation Game — MySQL Database Schema
-- =========================================================

CREATE DATABASE IF NOT EXISTS constellation_game;
USE constellation_game;

-- 1. Players Table
CREATE TABLE IF NOT EXISTS players (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    first_name          VARCHAR(100) NOT NULL,
    last_name           VARCHAR(100) NOT NULL,
    sr_code             VARCHAR(50)  NOT NULL UNIQUE,
    course              VARCHAR(50)  NOT NULL,
    contact_number      VARCHAR(30),
    registration_source VARCHAR(20)  DEFAULT 'ocr',      -- 'ocr' | 'mobile_qr'
    id_picture_path     VARCHAR(255),
    ocr_raw_text        TEXT,
    qr_ticket_code      VARCHAR(100) UNIQUE,
    total_attempts_used INT          DEFAULT 0,
    best_score          DOUBLE       DEFAULT 0.0,
    mi                  VARCHAR(10)  DEFAULT '',
    department          VARCHAR(50)  DEFAULT '',
    year_level          VARCHAR(20)  DEFAULT '',
    section             VARCHAR(50)  DEFAULT '',
    created_at          DATETIME     DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Constellations Table
CREATE TABLE IF NOT EXISTS constellations (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    name                VARCHAR(100) NOT NULL UNIQUE,
    head_node_id        INT          NOT NULL DEFAULT 0,
    star_nodes_json     JSON,
    fake_nodes_json     JSON,
    time_limit_sec      INT          NOT NULL DEFAULT 30
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Game Sessions Table
CREATE TABLE IF NOT EXISTS game_sessions (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    player_id           INT NOT NULL,
    constellation_id    INT NOT NULL,
    attempt_number      INT NOT NULL DEFAULT 1,
    score               DOUBLE   DEFAULT 0.0,
    time_elapsed_ms     INT      DEFAULT 0,
    wrong_connections   INT      DEFAULT 0,
    total_clicks        INT      DEFAULT 0,
    wand_travel_dist    DOUBLE   DEFAULT 0.0,
    recalibration_count INT      DEFAULT 0,
    completed_status    INT      DEFAULT 0,              -- 0=in-progress, 1=completed, 2=disqualified, 3=circle_exit
    accuracy            DOUBLE   DEFAULT 100.0,
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id)        REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (constellation_id) REFERENCES constellations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Leaderboard Table
CREATE TABLE IF NOT EXISTS leaderboard (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    player_id           INT NOT NULL UNIQUE,
    highest_score       DOUBLE   DEFAULT 0.0,
    attempts_used       INT      DEFAULT 0,
    updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
