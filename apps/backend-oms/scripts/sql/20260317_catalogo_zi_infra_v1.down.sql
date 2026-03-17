SET NOCOUNT ON;

IF OBJECT_ID(N'[oms].[ZiTiendaMapping]', N'U') IS NOT NULL
  DROP TABLE [oms].[ZiTiendaMapping];

IF OBJECT_ID(N'[oms].[ZiSyncLog]', N'U') IS NOT NULL
  DROP TABLE [oms].[ZiSyncLog];
