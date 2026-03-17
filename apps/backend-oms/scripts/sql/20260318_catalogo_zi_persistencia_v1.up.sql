SET NOCOUNT ON;

IF COL_LENGTH('oms.Producto', 'OrigenDatos') IS NULL
  ALTER TABLE [oms].[Producto]
    ADD [OrigenDatos] NVARCHAR(20) NULL,
        [ZiSyncedAt]  DATETIME2   NULL;

IF COL_LENGTH('oms.ProductoVariante', 'OrigenDatos') IS NULL
  ALTER TABLE [oms].[ProductoVariante]
    ADD [OrigenDatos] NVARCHAR(20) NULL,
        [ZiSyncedAt]  DATETIME2   NULL;

IF COL_LENGTH('oms.Inventario', 'OrigenDatos') IS NULL
  ALTER TABLE [oms].[Inventario]
    ADD [OrigenDatos] NVARCHAR(20) NULL,
        [ZiSyncedAt]  DATETIME2   NULL;
