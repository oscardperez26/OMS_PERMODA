SET NOCOUNT ON;

IF OBJECT_ID(N'[oms].[Usuario]', N'U') IS NOT NULL
BEGIN
  IF EXISTS
  (
    SELECT 1
    FROM sys.foreign_keys
    WHERE parent_object_id = OBJECT_ID(N'[oms].[Usuario]')
      AND name = N'FK_Usuario_EmpresaCliente'
  )
  BEGIN
    ALTER TABLE [oms].[Usuario]
      DROP CONSTRAINT [FK_Usuario_EmpresaCliente];
  END;

  IF EXISTS
  (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'[oms].[Usuario]')
      AND name = N'IX_Usuario_EmpresaClienteId'
  )
  BEGIN
    DROP INDEX [IX_Usuario_EmpresaClienteId]
      ON [oms].[Usuario];
  END;

  IF COL_LENGTH(N'oms.Usuario', N'EmpresaClienteId') IS NOT NULL
  BEGIN
    ALTER TABLE [oms].[Usuario]
      DROP COLUMN [EmpresaClienteId];
  END;
END;

IF OBJECT_ID(N'[oms].[Tienda]', N'U') IS NOT NULL
BEGIN
  IF EXISTS
  (
    SELECT 1
    FROM sys.foreign_keys
    WHERE parent_object_id = OBJECT_ID(N'[oms].[Tienda]')
      AND name = N'FK_Tienda_EmpresaCliente'
  )
  BEGIN
    ALTER TABLE [oms].[Tienda]
      DROP CONSTRAINT [FK_Tienda_EmpresaCliente];
  END;

  IF EXISTS
  (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'[oms].[Tienda]')
      AND name = N'IX_Tienda_EmpresaClienteId'
  )
  BEGIN
    DROP INDEX [IX_Tienda_EmpresaClienteId]
      ON [oms].[Tienda];
  END;

  IF COL_LENGTH(N'oms.Tienda', N'EmpresaClienteId') IS NOT NULL
  BEGIN
    ALTER TABLE [oms].[Tienda]
      DROP COLUMN [EmpresaClienteId];
  END;
END;

IF OBJECT_ID(N'[oms].[EmpresaCliente]', N'U') IS NOT NULL
BEGIN
  IF COL_LENGTH(N'oms.EmpresaCliente', N'FaviconUrl') IS NOT NULL
  BEGIN
    ALTER TABLE [oms].[EmpresaCliente]
      DROP COLUMN [FaviconUrl];
  END;

  IF COL_LENGTH(N'oms.EmpresaCliente', N'LogoUrl') IS NOT NULL
  BEGIN
    ALTER TABLE [oms].[EmpresaCliente]
      DROP COLUMN [LogoUrl];
  END;

  IF COL_LENGTH(N'oms.EmpresaCliente', N'DisplayName') IS NOT NULL
  BEGIN
    ALTER TABLE [oms].[EmpresaCliente]
      DROP COLUMN [DisplayName];
  END;
END;
