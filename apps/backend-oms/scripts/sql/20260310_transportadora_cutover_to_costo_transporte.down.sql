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
    FROM sys.foreign_keys
    WHERE [name] = N'FK_TransportadoraConfig_Transportadora'
      AND parent_object_id = OBJECT_ID(N'[oms].[TransportadoraConfig]')
  )
BEGIN
  ALTER TABLE [oms].[TransportadoraConfig]
    WITH CHECK
    ADD CONSTRAINT [FK_TransportadoraConfig_Transportadora]
      FOREIGN KEY ([TransportadoraId])
      REFERENCES [oms].[Transportadora] ([TransportadoraId]);
END;

IF OBJECT_ID(N'[oms].[TransportadoraConfig]', N'U') IS NOT NULL
  AND OBJECT_ID(N'[oms].[Transportadora]', N'U') IS NOT NULL
BEGIN
  MERGE [oms].[TransportadoraConfig] AS target
  USING
  (
    SELECT
      [TransportadoraId],
      NULLIF(LTRIM(RTRIM([Servicio])), N'') AS [Servicio],
      COALESCE([PermiteExpress], 0) AS [PermiteExpress],
      NULLIF(LTRIM(RTRIM([ModuloCode])), N'') AS [ModuloCode]
    FROM [oms].[Transportadora]
  ) AS source
    ON target.[TransportadoraId] = source.[TransportadoraId]
  WHEN MATCHED THEN
    UPDATE SET
      [Servicio] = source.[Servicio],
      [PermiteExpress] = source.[PermiteExpress],
      [ModuloCode] = source.[ModuloCode],
      [UpdatedAt] = SYSUTCDATETIME()
  WHEN NOT MATCHED BY TARGET THEN
    INSERT
    (
      [TransportadoraId],
      [Servicio],
      [PermiteExpress],
      [ModuloCode],
      [CosteFijo],
      [DistanciaFijaKm],
      [CosteIncrementalKm],
      [CreatedAt],
      [UpdatedAt]
    )
    VALUES
    (
      source.[TransportadoraId],
      source.[Servicio],
      source.[PermiteExpress],
      source.[ModuloCode],
      NULL,
      NULL,
      NULL,
      SYSUTCDATETIME(),
      NULL
    );
END;

IF OBJECT_ID(N'[oms].[CostoTransporte]', N'U') IS NOT NULL
  AND EXISTS
  (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'[oms].[CostoTransporte]')
      AND [name] = N'UX_CostoTransporte_TarifaBase_ByCombo'
  )
BEGIN
  DROP INDEX [UX_CostoTransporte_TarifaBase_ByCombo]
    ON [oms].[CostoTransporte];
END;

IF OBJECT_ID(N'[oms].[Transportadora]', N'U') IS NOT NULL
BEGIN
  DECLARE @defaultPermiteExpressConstraint SYSNAME;

  SELECT @defaultPermiteExpressConstraint = dc.[name]
  FROM sys.default_constraints dc
  INNER JOIN sys.columns c
    ON c.[object_id] = dc.parent_object_id
   AND c.column_id = dc.parent_column_id
  WHERE dc.parent_object_id = OBJECT_ID(N'[oms].[Transportadora]')
    AND c.[name] = N'PermiteExpress';

  IF @defaultPermiteExpressConstraint IS NOT NULL
  BEGIN
    EXEC(N'ALTER TABLE [oms].[Transportadora] DROP CONSTRAINT [' + @defaultPermiteExpressConstraint + N']');
  END;

  IF COL_LENGTH(N'[oms].[Transportadora]', N'ModuloCode') IS NOT NULL
  BEGIN
    ALTER TABLE [oms].[Transportadora]
      DROP COLUMN [ModuloCode];
  END;

  IF COL_LENGTH(N'[oms].[Transportadora]', N'PermiteExpress') IS NOT NULL
  BEGIN
    ALTER TABLE [oms].[Transportadora]
      DROP COLUMN [PermiteExpress];
  END;

  IF COL_LENGTH(N'[oms].[Transportadora]', N'Servicio') IS NOT NULL
  BEGIN
    ALTER TABLE [oms].[Transportadora]
      DROP COLUMN [Servicio];
  END;
END;
