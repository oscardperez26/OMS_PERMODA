SET NOCOUNT ON;

IF COL_LENGTH('oms.Producto', 'OrigenDatos') IS NOT NULL
BEGIN
  ALTER TABLE [oms].[Producto]
    DROP COLUMN [OrigenDatos], [ZiSyncedAt];
END;

IF COL_LENGTH('oms.ProductoVariante', 'OrigenDatos') IS NOT NULL
BEGIN
  ALTER TABLE [oms].[ProductoVariante]
    DROP COLUMN [OrigenDatos], [ZiSyncedAt];
END;

IF COL_LENGTH('oms.Inventario', 'OrigenDatos') IS NOT NULL
BEGIN
  ALTER TABLE [oms].[Inventario]
    DROP COLUMN [OrigenDatos], [ZiSyncedAt];
END;
