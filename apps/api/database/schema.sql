-- Skema MariaDB fase lanjutan (tidak digunakan pada MVP statis)
CREATE TABLE IF NOT EXISTS practice_sessions (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL,
  selected_juz_start TINYINT UNSIGNED NOT NULL,
  selected_juz_end TINYINT UNSIGNED NOT NULL,
  prompt_surah SMALLINT UNSIGNED NOT NULL,
  prompt_ayah SMALLINT UNSIGNED NOT NULL,
  evaluation_status VARCHAR(24) NOT NULL,
  metadata_json JSON NULL,
  INDEX idx_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

