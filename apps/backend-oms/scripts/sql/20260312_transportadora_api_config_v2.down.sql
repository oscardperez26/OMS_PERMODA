SET NOCOUNT ON;

IF OBJECT_ID(N'[oms].[TransportadoraApiConfig]', N'U') IS NOT NULL
BEGIN
  IF EXISTS
  (
    SELECT 1
    FROM sys.foreign_keys
    WHERE parent_object_id = OBJECT_ID(N'[oms].[TransportadoraApiConfig]')
      AND name = N'FK_TransportadoraApiConfig_Transportadora'
  )
  BEGIN
    ALTER TABLE [oms].[TransportadoraApiConfig]
      DROP CONSTRAINT [FK_TransportadoraApiConfig_Transportadora];
  END;

  DROP TABLE [oms].[TransportadoraApiConfig];
END;
