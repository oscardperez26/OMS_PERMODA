SET NOCOUNT ON;

-- ============================================================
-- C1 DOWN: Eliminar columnas ExternalTallaId / ExternalColorId
-- ============================================================

IF EXISTS
(
  SELECT 1 FROM sys.columns c
  WHERE c.object_id = OBJECT_ID(N'[oms].[ProductoVariante]')
    AND c.name = N'ExternalColorId'
)
BEGIN
  ALTER TABLE [oms].[ProductoVariante]
    DROP COLUMN [ExternalColorId];
END;

IF EXISTS
(
  SELECT 1 FROM sys.columns c
  WHERE c.object_id = OBJECT_ID(N'[oms].[ProductoVariante]')
    AND c.name = N'ExternalTallaId'
)
BEGIN
  ALTER TABLE [oms].[ProductoVariante]
    DROP COLUMN [ExternalTallaId];
END;
