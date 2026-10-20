-- =====================================================
-- Store Rating Application - Database Schema
-- Engine: InnoDB (supports foreign keys)
-- =====================================================

-- Drop tables in dependency order (ratings -> stores -> users)
DROP TABLE IF EXISTS ratings;
DROP TABLE IF EXISTS stores;
DROP TABLE IF EXISTS users;

-- =====================================================
-- users
-- =====================================================
CREATE TABLE users (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(60) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    address VARCHAR(400) NOT NULL,
    role ENUM('ADMIN','USER','OWNER') NOT NULL DEFAULT 'USER',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- stores
-- =====================================================
CREATE TABLE stores (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(60) NOT NULL,
    email VARCHAR(100) NOT NULL,
    address VARCHAR(400) NOT NULL,
    owner_id INT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_stores_email (email),
    KEY idx_stores_owner (owner_id),
    CONSTRAINT fk_stores_owner
        FOREIGN KEY (owner_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- ratings
-- =====================================================
CREATE TABLE ratings (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    store_id INT UNSIGNED NOT NULL,
    rating TINYINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_ratings_user_store (user_id, store_id),
    KEY idx_ratings_store (store_id),
    CONSTRAINT fk_ratings_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_ratings_store
        FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Usage
-- =====================================================
-- 1. Create the database:
--    CREATE DATABASE store_rating CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- 2. Run this file against it (mysql store_rating < schema.sql).
-- 3. Seed the admin account:
--    npm run seed