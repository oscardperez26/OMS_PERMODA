SET NOCOUNT ON;

IF SCHEMA_ID(N'oms') IS NULL
BEGIN
  EXEC('CREATE SCHEMA [oms]');
END;

IF OBJECT_ID(N'[oms].[Transportadora]', N'U') IS NOT NULL
BEGIN
  IF COL_LENGTH(N'[oms].[Transportadora]', N'Servicio') IS NULL
  BEGIN
    ALTER TABLE [oms].[Transportadora]
      ADD [Servicio] NVARCHAR(120) NULL;
  END;

  IF COL_LENGTH(N'[oms].[Transportadora]', N'PermiteExpress') IS NULL
  BEGIN
    ALTER TABLE [oms].[Transportadora]
      ADD [PermiteExpress] BIT NOT NULL
        CONSTRAINT [DF_Transportadora_PermiteExpress] DEFAULT ((0));
  END;

  IF COL_LENGTH(N'[oms].[Transportadora]', N'PermiteExpress') IS NOT NULL
  BEGIN
    UPDATE [oms].[Transportadora]
    SET [PermiteExpress] = 0
    WHERE [PermiteExpress] IS NULL;

    ALTER TABLE [oms].[Transportadora]
      ALTER COLUMN [PermiteExpress] BIT NOT NULL;

    IF NOT EXISTS
    (
      SELECT 1
      FROM sys.default_constraints dc
      INNER JOIN sys.columns c
        ON c.[object_id] = dc.parent_object_id
       AND c.column_id = dc.parent_column_id
      WHERE dc.parent_object_id = OBJECT_ID(N'[oms].[Transportadora]')
        AND c.[name] = N'PermiteExpress'
    )
    BEGIN
      ALTER TABLE [oms].[Transportadora]
        ADD CONSTRAINT [DF_Transportadora_PermiteExpress] DEFAULT ((0)) FOR [PermiteExpress];
    END;
  END;

  IF COL_LENGTH(N'[oms].[Transportadora]', N'ModuloCode') IS NULL
  BEGIN
    ALTER TABLE [oms].[Transportadora]
      ADD [ModuloCode] NVARCHAR(120) NULL;
  END;
END;

IF OBJECT_ID(N'[oms].[TransportadoraConfig]', N'U') IS NOT NULL
  AND OBJECT_ID(N'[oms].[Transportadora]', N'U') IS NOT NULL
BEGIN
  UPDATE t
  SET
    [Servicio] = COALESCE(NULLIF(LTRIM(RTRIM(cfg.[Servicio])), N''), t.[Servicio]),
    [PermiteExpress] = COALESCE(cfg.[PermiteExpress], t.[PermiteExpress], 0),
    [ModuloCode] = COALESCE(NULLIF(LTRIM(RTRIM(cfg.[ModuloCode])), N''), t.[ModuloCode]),
    [UpdatedAt] = SYSUTCDATETIME()
  FROM [oms].[Transportadora] t
  INNER JOIN [oms].[TransportadoraConfig] cfg
    ON cfg.[TransportadoraId] = t.[TransportadoraId];
END;

IF OBJECT_ID(N'[oms].[TransportadoraConfig]', N'U') IS NOT NULL
BEGIN
  IF EXISTS
  (
    SELECT 1
    FROM sys.foreign_keys
    WHERE [name] = N'FK_TransportadoraConfig_Transportadora'
      AND parent_object_id = OBJECT_ID(N'[oms].[TransportadoraConfig]')
  )
  BEGIN
    ALTER TABLE [oms].[TransportadoraConfig]
      DROP CONSTRAINT [FK_TransportadoraConfig_Transportadora];
  END;

  DROP TABLE [oms].[TransportadoraConfig];
END;

IF OBJECT_ID(N'[oms].[CostoTransporte]', N'U') IS NOT NULL
  AND NOT EXISTS
  (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'[oms].[CostoTransporte]')
      AND [name] = N'UX_CostoTransporte_TarifaBase_ByCombo'
  )
BEGIN
  IF EXISTS
  (
    SELECT 1
    FROM [oms].[CostoTransporte]
    WHERE [PesoMinKg] IS NULL
      AND [PesoMaxKg] IS NULL
      AND [ValorMin] IS NULL
      AND [ValorMax] IS NULL
    GROUP BY [EmpresaId], [ZonaTransporteId], [TransportadoraId], [MonedaId]
    HAVING COUNT(1) > 1
  )
  BEGIN
    THROW 51000, 'No se puede crear UX_CostoTransporte_TarifaBase_ByCombo porque existen tarifas base duplicadas.', 1;
  END;

  CREATE UNIQUE NONCLUSTERED INDEX [UX_CostoTransporte_TarifaBase_ByCombo]
    ON [oms].[CostoTransporte]
    (
      [EmpresaId] ASC,
      [ZonaTransporteId] ASC,
      [TransportadoraId] ASC,
      [MonedaId] ASC
    )
    WHERE [PesoMinKg] IS NULL
      AND [PesoMaxKg] IS NULL
      AND [ValorMin] IS NULL
      AND [ValorMax] IS NULL;
END;
