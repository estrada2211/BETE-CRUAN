-- Create Database
CREATE DATABASE IF NOT EXISTS `crop_damage_db`;
USE `crop_damage_db`;

-- Drop tables if they exist (for reset/clean setups, run with caution)
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `reports`;
DROP TABLE IF EXISTS `users`;

-- Users Table
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('farmer', 'admin') NOT NULL DEFAULT 'farmer',
  `full_name` VARCHAR(100) NOT NULL,
  `contact_number` VARCHAR(20),
  `address` VARCHAR(255) DEFAULT NULL,
  `crop_type` VARCHAR(100) DEFAULT 'Rice',
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `boundary_polygon` LONGTEXT DEFAULT NULL,
  `pending_boundary_polygon` LONGTEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reports Table
CREATE TABLE IF NOT EXISTS `reports` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `farmer_id` INT NOT NULL,
  `image_name` VARCHAR(255) NOT NULL,
  `disaster_type` ENUM('Flood', 'Drought', 'Typhoon', 'Pest', 'Disease') NOT NULL DEFAULT 'Flood',
  `details` TEXT NOT NULL,
  `severity` ENUM('minor', 'moderate', 'severe') NOT NULL,
  `status` ENUM('pending', 'verified', 'responded') NOT NULL DEFAULT 'pending',
  `latitude` DECIMAL(10, 8) NOT NULL,
  `longitude` DECIMAL(11, 8) NOT NULL,
  `boundary_polygon` LONGTEXT NOT NULL, -- Stores JSON string of coordinates: [[lat,lng],[lat,lng],...]
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_reports_farmer` FOREIGN KEY (`farmer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notifications Table
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `message` VARCHAR(255) NOT NULL,
  `is_read` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
