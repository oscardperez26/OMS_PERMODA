SET NOCOUNT ON;

IF SCHEMA_ID(N'oms') IS NULL
BEGIN
  EXEC('CREATE SCHEMA [oms]');
END;

IF OBJECT_ID(N'[oms].[TransportadoraConfig]', N'U') IS NULL
BEGIN
  CREATE TABLE [oms].[TransportadoraConfig]
  (
    [TransportadoraId] INT NOT NULL,
    [Servicio] NVARCHAR(120) NULL,
    [PermiteExpress] BIT NOT NULL
      CONSTRAINT [DF_TransportadoraConfig_PermiteExpress] DEFAULT ((0)),
    [ModuloCode] NVARCHAR(120) NULL,
    [CosteFijo] DECIMAL(18, 6) NULL,
    [DistanciaFijaKm] DECIMAL(18, 6) NULL,
    [CosteIncrementalKm] DECIMAL(18, 6) NULL,
    [CreatedAt] DATETIME2(0) NOT NULL
      CONSTRAINT [DF_TransportadoraConfig_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt] DATETIME2(0) NULL,
    CONSTRAINT [PK_TransportadoraConfig]
      PRIMARY KEY CLUSTERED ([TransportadoraId] ASC)
  );
END;

IF OBJECT_ID(N'[oms].[TransportadoraConfig]', N'U') IS NOT NULL
  AND OBJECT_ID(N'[oms].[Transportadora]', N'U') IS NOT NULL
  AND NOT EXISTS
  (
    SELECT 1
    FROM sys.foreign_keys fk
    WHERE fk.parent_object_id = OBJECT_ID(N'[oms].[TransportadoraConfig]')
      AND fk.referenced_object_id = OBJECT_ID(N'[oms].[Transportadora]')
  )
BEGIN
  ALTER TABLE [oms].[TransportadoraConfig]
    WITH CHECK
    ADD CONSTRAINT [FK_TransportadoraConfig_Transportadora]
      FOREIGN KEY ([TransportadoraId])
      REFERENCES [oms].[Transportadora] ([TransportadoraId]);
END;

IF OBJECT_ID(N'[oms].[TransportadoraTienda]', N'U') IS NULL
BEGIN
  CREATE TABLE [oms].[TransportadoraTienda]
  (
    [TransportadoraId] INT NOT NULL,
    [TiendaId] INT NOT NULL,
    [Activo] BIT NOT NULL
      CONSTRAINT [DF_TransportadoraTienda_Activo] DEFAULT ((1)),
    [CreatedAt] DATETIME2(0) NOT NULL
      CONSTRAINT [DF_TransportadoraTienda_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt] DATETIME2(0) NULL,
    CONSTRAINT [PK_TransportadoraTienda]
      PRIMARY KEY CLUSTERED ([TransportadoraId] ASC, [TiendaId] ASC)
  );
END;

IF OBJECT_ID(N'[oms].[TransportadoraTienda]', N'U') IS NOT NULL
  AND OBJECT_ID(N'[oms].[Transportadora]', N'U') IS NOT NULL
  AND NOT EXISTS
  (
    SELECT 1
    FROM sys.foreign_keys fk
    WHERE fk.parent_object_id = OBJECT_ID(N'[oms].[TransportadoraTienda]')
      AND fk.referenced_object_id = OBJECT_ID(N'[oms].[Transportadora]')
  )
BEGIN
  ALTER TABLE [oms].[TransportadoraTienda]
    WITH CHECK
    ADD CONSTRAINT [FK_TransportadoraTienda_Transportadora]
      FOREIGN KEY ([TransportadoraId])
      REFERENCES [oms].[Transportadora] ([TransportadoraId]);
END;

IF OBJECT_ID(N'[oms].[TransportadoraTienda]', N'U') IS NOT NULL
  AND OBJECT_ID(N'[oms].[Tienda]', N'U') IS NOT NULL
  AND NOT EXISTS
  (
    SELECT 1
    FROM sys.foreign_keys fk
    WHERE fk.parent_object_id = OBJECT_ID(N'[oms].[TransportadoraTienda]')
      AND fk.referenced_object_id = OBJECT_ID(N'[oms].[Tienda]')
  )
BEGIN
  ALTER TABLE [oms].[TransportadoraTienda]
    WITH CHECK
    ADD CONSTRAINT [FK_TransportadoraTienda_Tienda]
      FOREIGN KEY ([TiendaId])
      REFERENCES [oms].[Tienda] ([TiendaId]);
END;

IF OBJECT_ID(N'[oms].[TransportadoraTienda]', N'U') IS NOT NULL
  AND NOT EXISTS
  (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'[oms].[TransportadoraTienda]')
      AND name = N'IX_TransportadoraTienda_TiendaId'
  )
BEGIN
  CREATE NONCLUSTERED INDEX [IX_TransportadoraTienda_TiendaId]
    ON [oms].[TransportadoraTienda] ([TiendaId] ASC);
END;

IF OBJECT_ID(N'[oms].[TransportadoraTienda]', N'U') IS NOT NULL
  AND NOT EXISTS
  (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'[oms].[TransportadoraTienda]')
      AND name = N'IX_TransportadoraTienda_Activo'
  )
BEGIN
  CREATE NONCLUSTERED INDEX [IX_TransportadoraTienda_Activo]
    ON [oms].[TransportadoraTienda] ([Activo] ASC);
END;
