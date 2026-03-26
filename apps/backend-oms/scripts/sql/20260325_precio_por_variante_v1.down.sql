SET NOCOUNT ON;

-- ============================================================
-- Rollback: Fix A1 precio por variante
-- ============================================================

-- Eliminar unique index de TarifaPrecioDetalle
IF EXISTS
(
  SELECT 1 FROM sys.indexes i
  WHERE i.object_id = OBJECT_ID(N'[oms].[TarifaPrecioDetalle]')
    AND i.name = N'UX_TarifaPrecioDetalle_Tarifa_Variante'
)
BEGIN
  DROP INDEX [UX_TarifaPrecioDetalle_Tarifa_Variante]
    ON [oms].[TarifaPrecioDetalle];
END;

-- Eliminar unique index de OfertaPrecioDetalle
IF EXISTS
(
  SELECT 1 FROM sys.indexes i
  WHERE i.object_id = OBJECT_ID(N'[oms].[OfertaPrecioDetalle]')
    AND i.name = N'UX_OfertaPrecioDetalle_Oferta_Variante'
)
BEGIN
  DROP INDEX [UX_OfertaPrecioDetalle_Oferta_Variante]
    ON [oms].[OfertaPrecioDetalle];
END;

-- Eliminar columna VarianteId de OfertaPrecioDetalle
IF OBJECT_ID(N'[oms].[OfertaPrecioDetalle]', N'U') IS NOT NULL
  AND EXISTS
  (
    SELECT 1 FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'[oms].[OfertaPrecioDetalle]')
      AND c.name = N'VarianteId'
  )
BEGIN
  ALTER TABLE [oms].[OfertaPrecioDetalle]
    DROP COLUMN [VarianteId];
END;

IF OBJECT_ID(N'[oms].[TarifaPrecioDetalle]', N'U') IS NOT NULL
  AND NOT EXISTS
  (
    SELECT 1 FROM sys.indexes i
    WHERE i.object_id = OBJECT_ID(N'[oms].[TarifaPrecioDetalle]')
      AND i.name = N'UX_TPD_Tarifa_Talla_Color'
  )
BEGIN
  CREATE UNIQUE NONCLUSTERED INDEX [UX_TPD_Tarifa_Talla_Color]
    ON [oms].[TarifaPrecioDetalle] ([TarifaPrecioId] ASC, [ExternalTallaId] ASC, [ExternalColorId] ASC);
END;

IF OBJECT_ID(N'[oms].[OfertaPrecioDetalle]', N'U') IS NOT NULL
  AND NOT EXISTS
  (
    SELECT 1 FROM sys.indexes i
    WHERE i.object_id = OBJECT_ID(N'[oms].[OfertaPrecioDetalle]')
      AND i.name = N'UX_OPD_Oferta_Talla_Color'
  )
BEGIN
  CREATE UNIQUE NONCLUSTERED INDEX [UX_OPD_Oferta_Talla_Color]
    ON [oms].[OfertaPrecioDetalle] ([OfertaPrecioId] ASC, [ExternalTallaId] ASC, [ExternalColorId] ASC);
END;
