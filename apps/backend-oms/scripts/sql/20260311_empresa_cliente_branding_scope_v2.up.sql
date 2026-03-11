SET NOCOUNT ON;

IF SCHEMA_ID(N'oms') IS NULL
BEGIN
  EXEC('CREATE SCHEMA [oms]');
END;

IF OBJECT_ID(N'[oms].[EmpresaCliente]', N'U') IS NOT NULL
BEGIN
  IF COL_LENGTH(N'oms.EmpresaCliente', N'DisplayName') IS NULL
  BEGIN
    ALTER TABLE [oms].[EmpresaCliente]
      ADD [DisplayName] NVARCHAR(180) NULL;
  END;

  IF COL_LENGTH(N'oms.EmpresaCliente', N'LogoUrl') IS NULL
  BEGIN
    ALTER TABLE [oms].[EmpresaCliente]
      ADD [LogoUrl] NVARCHAR(800) NULL;
  END;

  IF COL_LENGTH(N'oms.EmpresaCliente', N'FaviconUrl') IS NULL
  BEGIN
    ALTER TABLE [oms].[EmpresaCliente]
      ADD [FaviconUrl] NVARCHAR(800) NULL;
  END;
END;

IF OBJECT_ID(N'[oms].[Tienda]', N'U') IS NOT NULL
BEGIN
  IF COL_LENGTH(N'oms.Tienda', N'EmpresaClienteId') IS NULL
  BEGIN
    ALTER TABLE [oms].[Tienda]
      ADD [EmpresaClienteId] INT NULL;
  END;

  IF OBJECT_ID(N'[oms].[EmpresaCliente]', N'U') IS NOT NULL
    AND NOT EXISTS
    (
      SELECT 1
      FROM sys.foreign_keys
      WHERE parent_object_id = OBJECT_ID(N'[oms].[Tienda]')
        AND name = N'FK_Tienda_EmpresaCliente'
    )
  BEGIN
    ALTER TABLE [oms].[Tienda]
      WITH CHECK
      ADD CONSTRAINT [FK_Tienda_EmpresaCliente]
      FOREIGN KEY ([EmpresaClienteId])
      REFERENCES [oms].[EmpresaCliente]([EmpresaClienteId]);
  END;

  IF NOT EXISTS
  (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'[oms].[Tienda]')
      AND name = N'IX_Tienda_EmpresaClienteId'
  )
  BEGIN
    CREATE NONCLUSTERED INDEX [IX_Tienda_EmpresaClienteId]
      ON [oms].[Tienda] ([EmpresaClienteId] ASC)
      WHERE [EmpresaClienteId] IS NOT NULL;
  END;
END;

IF OBJECT_ID(N'[oms].[Usuario]', N'U') IS NOT NULL
BEGIN
  IF COL_LENGTH(N'oms.Usuario', N'EmpresaClienteId') IS NULL
  BEGIN
    ALTER TABLE [oms].[Usuario]
      ADD [EmpresaClienteId] INT NULL;
  END;

  IF OBJECT_ID(N'[oms].[EmpresaCliente]', N'U') IS NOT NULL
    AND NOT EXISTS
    (
      SELECT 1
      FROM sys.foreign_keys
      WHERE parent_object_id = OBJECT_ID(N'[oms].[Usuario]')
        AND name = N'FK_Usuario_EmpresaCliente'
    )
  BEGIN
    ALTER TABLE [oms].[Usuario]
      WITH CHECK
      ADD CONSTRAINT [FK_Usuario_EmpresaCliente]
      FOREIGN KEY ([EmpresaClienteId])
      REFERENCES [oms].[EmpresaCliente]([EmpresaClienteId]);
  END;

  IF NOT EXISTS
  (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'[oms].[Usuario]')
      AND name = N'IX_Usuario_EmpresaClienteId'
  )
  BEGIN
    CREATE NONCLUSTERED INDEX [IX_Usuario_EmpresaClienteId]
      ON [oms].[Usuario] ([EmpresaClienteId] ASC)
      WHERE [EmpresaClienteId] IS NOT NULL;
  END;
END;
