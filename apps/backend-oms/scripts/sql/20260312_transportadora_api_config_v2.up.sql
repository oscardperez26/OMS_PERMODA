SET NOCOUNT ON;

IF SCHEMA_ID(N'oms') IS NULL
BEGIN
  EXEC('CREATE SCHEMA [oms]');
END;

IF OBJECT_ID(N'[oms].[TransportadoraApiConfig]', N'U') IS NULL
BEGIN
  CREATE TABLE [oms].[TransportadoraApiConfig]
  (
    [TransportadoraId] INT NOT NULL,
    [BaseUrl] NVARCHAR(500) NULL,
    [AuthType] NVARCHAR(30) NOT NULL
      CONSTRAINT [DF_TransportadoraApiConfig_AuthType] DEFAULT (N'API_KEY'),
    [ApiKeyCiphertext] NVARCHAR(MAX) NULL,
    [ApiKeyIv] NVARCHAR(64) NULL,
    [ApiKeyTag] NVARCHAR(64) NULL,
    [TimeoutMs] INT NOT NULL
      CONSTRAINT [DF_TransportadoraApiConfig_TimeoutMs] DEFAULT ((15000)),
    [CreateShipmentEndpoint] NVARCHAR(300) NULL,
    [TrackingEndpointTemplate] NVARCHAR(300) NULL,
    [TrackingNumberField] NVARCHAR(120) NULL,
    [StatusField] NVARCHAR(120) NULL,
    [ApiKeyLastRotatedAt] DATETIME2(0) NULL,
    [CreatedAt] DATETIME2(0) NOT NULL
      CONSTRAINT [DF_TransportadoraApiConfig_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt] DATETIME2(0) NULL,
    CONSTRAINT [PK_TransportadoraApiConfig]
      PRIMARY KEY CLUSTERED ([TransportadoraId] ASC),
    CONSTRAINT [CK_TransportadoraApiConfig_AuthType]
      CHECK ([AuthType] = N'API_KEY')
  );
END;

IF OBJECT_ID(N'[oms].[TransportadoraApiConfig]', N'U') IS NOT NULL
  AND OBJECT_ID(N'[oms].[Transportadora]', N'U') IS NOT NULL
  AND NOT EXISTS
  (
    SELECT 1
    FROM sys.foreign_keys fk
    WHERE fk.parent_object_id = OBJECT_ID(N'[oms].[TransportadoraApiConfig]')
      AND fk.name = N'FK_TransportadoraApiConfig_Transportadora'
  )
BEGIN
  ALTER TABLE [oms].[TransportadoraApiConfig]
    WITH CHECK
    ADD CONSTRAINT [FK_TransportadoraApiConfig_Transportadora]
      FOREIGN KEY ([TransportadoraId])
      REFERENCES [oms].[Transportadora] ([TransportadoraId]);
END;
