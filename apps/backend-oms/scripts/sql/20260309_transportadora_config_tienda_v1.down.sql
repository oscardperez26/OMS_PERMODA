SET NOCOUNT ON;

IF OBJECT_ID(N'[oms].[TransportadoraTienda]', N'U') IS NOT NULL
BEGIN
  IF EXISTS
  (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'[oms].[TransportadoraTienda]')
      AND name = N'IX_TransportadoraTienda_TiendaId'
  )
  BEGIN
    DROP INDEX [IX_TransportadoraTienda_TiendaId]
      ON [oms].[TransportadoraTienda];
  END;

  IF EXISTS
  (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'[oms].[TransportadoraTienda]')
      AND name = N'IX_TransportadoraTienda_Activo'
  )
  BEGIN
    DROP INDEX [IX_TransportadoraTienda_Activo]
      ON [oms].[TransportadoraTienda];
  END;

  DROP TABLE [oms].[TransportadoraTienda];
END;

IF OBJECT_ID(N'[oms].[TransportadoraConfig]', N'U') IS NOT NULL
BEGIN
  DROP TABLE [oms].[TransportadoraConfig];
END;
