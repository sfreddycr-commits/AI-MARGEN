-- V0001 — Baseline
-- Fija charset/collation por defecto de la base. Las tablas de negocio llegan en etapas posteriores.
-- Convenciones: ver database/docs/conventions.md

ALTER DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
