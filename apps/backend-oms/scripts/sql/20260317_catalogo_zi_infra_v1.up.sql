SET NOCOUNT ON;

-- Tabla de log de sincronizacion con hashes por producto
IF OBJECT_ID(N'[oms].[ZiSyncLog]', N'U') IS NULL
BEGIN
  CREATE TABLE [oms].[ZiSyncLog] (
    [Id]              INT           IDENTITY(1,1) PRIMARY KEY,
    [Entity]          NVARCHAR(60)  NOT NULL,
    [ProductoZiId]    INT           NULL,
    [HashProduct]     NVARCHAR(64)  NULL,
    [HashPrice]       NVARCHAR(64)  NULL,
    [HashStock]       NVARCHAR(64)  NULL,
    [StartedAt]       DATETIME2     NOT NULL,
    [FinishedAt]      DATETIME2     NULL,
    [RecordsUpdated]  INT           NULL,
    [Status]          NVARCHAR(20)  NOT NULL,
    [Error]           NVARCHAR(MAX) NULL,
    [CreatedAt]       DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

-- Tabla de mapeo id_tienda ZI -> BodegaId OMS
-- Debe poblarse manualmente antes de activar sync de stock
IF OBJECT_ID(N'[oms].[ZiTiendaMapping]', N'U') IS NULL
BEGIN
  CREATE TABLE [oms].[ZiTiendaMapping] (
    [Id]          INT           IDENTITY(1,1) PRIMARY KEY,
    [ZiTiendaId]  NVARCHAR(20)  NOT NULL,
    [BodegaId]    INT           NOT NULL,
    [Activo]      BIT           NOT NULL DEFAULT 1,
    [CreatedAt]   DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT [UQ_ZiTiendaMapping_ZiTiendaId]
      UNIQUE ([ZiTiendaId]),
    CONSTRAINT [FK_ZiTiendaMapping_Bodega]
      FOREIGN KEY ([BodegaId]) REFERENCES [oms].[Bodega]([BodegaId])
  );
END;
