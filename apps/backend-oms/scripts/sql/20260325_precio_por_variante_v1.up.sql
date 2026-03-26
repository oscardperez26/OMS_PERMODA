SET NOCOUNT ON;

-- ============================================================
-- Fix A1: Precio y oferta por variante real
--
-- Problema: TarifaPrecioDetalle y OfertaPrecioDetalle usaban
-- (TarifaPrecioId/OfertaPrecioId + ExternalTallaId + ExternalColorId)
-- como clave de MERGE. Dos productos con la misma combinacion
-- talla/color en la misma tarifa pisaban el VarianteId del otro.
--
-- Fix:
--   1. TarifaPrecioDetalle
--      a. Dropear indice viejo UX_TPD_Tarifa_Talla_Color (talla+color)
--      b. Limpiar todos los precios stale (son datos ZI; se regeneran con sync)
--      c. Crear nuevo unique index (TarifaPrecioId, VarianteId)
--   2. OfertaPrecioDetalle
--      a. Limpiar todos los precios de oferta stale
--      b. Agregar columna VarianteId + unique index filtrado WHERE VarianteId IS NOT NULL
-- ============================================================

-- ------------------------------------------------------------
-- 1a. TarifaPrecioDetalle — dropear indice viejo (talla+color)
-- ------------------------------------------------------------
IF EXISTS
(
  SELECT 1 FROM sys.indexes i
  WHERE i.object_id = OBJECT_ID(N'[oms].[TarifaPrecioDetalle]')
    AND i.name = N'UX_TPD_Tarifa_Talla_Color'
)
BEGIN
  DROP INDEX [UX_TPD_Tarifa_Talla_Color] ON [oms].[TarifaPrecioDetalle];
END;

-- ------------------------------------------------------------
-- 1b. TarifaPrecioDetalle — limpiar datos stale
--     Los precios vienen 100% de ZI y se regeneran con sync.
--     Limpiar garantiza que el nuevo indice no choca con datos
--     que tienen VarianteId NULL o incorrecto del modelo viejo.
-- ------------------------------------------------------------
IF OBJECT_ID(N'[oms].[TarifaPrecioDetalle]', N'U') IS NOT NULL
BEGIN
  DELETE FROM [oms].[TarifaPrecioDetalle];
END;

-- ------------------------------------------------------------
-- 1c. TarifaPrecioDetalle — crear nuevo unique index por variante
-- ------------------------------------------------------------
IF OBJECT_ID(N'[oms].[TarifaPrecioDetalle]', N'U') IS NOT NULL
  AND NOT EXISTS
  (
    SELECT 1 FROM sys.indexes i
    WHERE i.object_id = OBJECT_ID(N'[oms].[TarifaPrecioDetalle]')
      AND i.name = N'UX_TarifaPrecioDetalle_Tarifa_Variante'
  )
BEGIN
  CREATE UNIQUE NONCLUSTERED INDEX [UX_TarifaPrecioDetalle_Tarifa_Variante]
    ON [oms].[TarifaPrecioDetalle] ([TarifaPrecioId] ASC, [VarianteId] ASC);
END;

-- ------------------------------------------------------------
-- 2a. OfertaPrecioDetalle — limpiar datos stale
-- ------------------------------------------------------------
IF OBJECT_ID(N'[oms].[OfertaPrecioDetalle]', N'U') IS NOT NULL
BEGIN
  DELETE FROM [oms].[OfertaPrecioDetalle];
END;

IF EXISTS
(
  SELECT 1 FROM sys.indexes i
  WHERE i.object_id = OBJECT_ID(N'[oms].[OfertaPrecioDetalle]')
    AND i.name = N'UX_OPD_Oferta_Talla_Color'
)
BEGIN
  DROP INDEX [UX_OPD_Oferta_Talla_Color] ON [oms].[OfertaPrecioDetalle];
END;

-- ------------------------------------------------------------
-- 2b. OfertaPrecioDetalle — agregar columna VarianteId
-- ------------------------------------------------------------
IF OBJECT_ID(N'[oms].[OfertaPrecioDetalle]', N'U') IS NOT NULL
  AND NOT EXISTS
  (
    SELECT 1 FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'[oms].[OfertaPrecioDetalle]')
      AND c.name = N'VarianteId'
  )
BEGIN
  ALTER TABLE [oms].[OfertaPrecioDetalle]
    ADD [VarianteId] INT NULL;
END;

-- Unique index filtrado: solo filas donde VarianteId ya fue resuelto.
IF OBJECT_ID(N'[oms].[OfertaPrecioDetalle]', N'U') IS NOT NULL
  AND NOT EXISTS
  (
    SELECT 1 FROM sys.indexes i
    WHERE i.object_id = OBJECT_ID(N'[oms].[OfertaPrecioDetalle]')
      AND i.name = N'UX_OfertaPrecioDetalle_Oferta_Variante'
  )
BEGIN
  CREATE UNIQUE NONCLUSTERED INDEX [UX_OfertaPrecioDetalle_Oferta_Variante]
    ON [oms].[OfertaPrecioDetalle] ([OfertaPrecioId] ASC, [VarianteId] ASC)
    WHERE [VarianteId] IS NOT NULL;
END;
