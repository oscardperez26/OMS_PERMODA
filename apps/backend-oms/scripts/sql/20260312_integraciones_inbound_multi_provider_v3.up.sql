SET NOCOUNT ON;

IF SCHEMA_ID(N'oms') IS NULL
BEGIN
  EXEC('CREATE SCHEMA [oms]');
END;

IF OBJECT_ID(N'[oms].[Pedido]', N'U') IS NOT NULL
  AND COL_LENGTH('oms.Pedido', 'IntegracionId') IS NULL
BEGIN
  ALTER TABLE [oms].[Pedido]
    ADD [IntegracionId] INT NULL;
END;

IF OBJECT_ID(N'[oms].[Pedido]', N'U') IS NOT NULL
  AND OBJECT_ID(N'[oms].[Integracion]', N'U') IS NOT NULL
  AND COL_LENGTH('oms.Pedido', 'IntegracionId') IS NOT NULL
  AND NOT EXISTS
  (
    SELECT 1
    FROM sys.foreign_keys fk
    WHERE fk.parent_object_id = OBJECT_ID(N'[oms].[Pedido]')
      AND fk.name = N'FK_Pedido_Integracion'
  )
BEGIN
  EXEC(N'
    ALTER TABLE [oms].[Pedido]
      WITH CHECK
      ADD CONSTRAINT [FK_Pedido_Integracion]
        FOREIGN KEY ([IntegracionId])
        REFERENCES [oms].[Integracion] ([IntegracionId]);
  ');
END;

IF OBJECT_ID(N'[oms].[Pedido]', N'U') IS NOT NULL
  AND EXISTS
  (
    SELECT 1
    FROM sys.stats s
    WHERE s.object_id = OBJECT_ID(N'[oms].[Pedido]')
      AND s.name = N'IX_Pedido_IntegracionId'
  )
  AND NOT EXISTS
  (
    SELECT 1
    FROM sys.indexes i
    WHERE i.object_id = OBJECT_ID(N'[oms].[Pedido]')
      AND i.name = N'IX_Pedido_IntegracionId'
  )
BEGIN
  DROP STATISTICS [oms].[Pedido].[IX_Pedido_IntegracionId];
END;

IF OBJECT_ID(N'[oms].[Pedido]', N'U') IS NOT NULL
  AND EXISTS
  (
    SELECT 1
    FROM sys.indexes i
    WHERE i.object_id = OBJECT_ID(N'[oms].[Pedido]')
      AND i.name = N'IX_Pedido_IntegracionId'
      AND NOT EXISTS
      (
        SELECT 1
        FROM sys.index_columns ic
        INNER JOIN sys.columns c
          ON c.object_id = ic.object_id
         AND c.column_id = ic.column_id
        WHERE ic.object_id = i.object_id
          AND ic.index_id = i.index_id
          AND c.name = N'IntegracionId'
      )
  )
BEGIN
  DROP INDEX [IX_Pedido_IntegracionId] ON [oms].[Pedido];
END;

IF OBJECT_ID(N'[oms].[Pedido]', N'U') IS NOT NULL
  AND COL_LENGTH('oms.Pedido', 'IntegracionId') IS NOT NULL
  AND NOT EXISTS
  (
    SELECT 1
    FROM sys.indexes i
    WHERE i.object_id = OBJECT_ID(N'[oms].[Pedido]')
      AND i.name = N'IX_Pedido_IntegracionId'
  )
BEGIN
  EXEC(N'
    CREATE NONCLUSTERED INDEX [IX_Pedido_IntegracionId]
      ON [oms].[Pedido] ([IntegracionId] ASC);
  ');
END;

IF OBJECT_ID(N'[oms].[IntegracionPedidoExterno]', N'U') IS NULL
BEGIN
  CREATE TABLE [oms].[IntegracionPedidoExterno]
  (
    [IntegracionPedidoExternoId] BIGINT IDENTITY(1, 1) NOT NULL,
    [IntegracionId] INT NOT NULL,
    [ExternalOrderId] NVARCHAR(160) NOT NULL,
    [ExternalReference] NVARCHAR(200) NULL,
    [PedidoId] BIGINT NULL,
    [Estado] NVARCHAR(40) NOT NULL
      CONSTRAINT [DF_IntegracionPedidoExterno_Estado] DEFAULT (N'INGESTADO'),
    [PayloadHash] NVARCHAR(128) NULL,
    [CreatedAt] DATETIME2(0) NOT NULL
      CONSTRAINT [DF_IntegracionPedidoExterno_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt] DATETIME2(0) NULL,
    CONSTRAINT [PK_IntegracionPedidoExterno]
      PRIMARY KEY CLUSTERED ([IntegracionPedidoExternoId] ASC)
  );
END;

IF OBJECT_ID(N'[oms].[IntegracionPedidoExterno]', N'U') IS NOT NULL
  AND NOT EXISTS
  (
    SELECT 1
    FROM sys.indexes i
    WHERE i.object_id = OBJECT_ID(N'[oms].[IntegracionPedidoExterno]')
      AND i.name = N'UX_IntegracionPedidoExterno_Integracion_ExternalOrderId'
  )
BEGIN
  CREATE UNIQUE NONCLUSTERED INDEX [UX_IntegracionPedidoExterno_Integracion_ExternalOrderId]
    ON [oms].[IntegracionPedidoExterno] ([IntegracionId] ASC, [ExternalOrderId] ASC);
END;

IF OBJECT_ID(N'[oms].[IntegracionPedidoExterno]', N'U') IS NOT NULL
  AND NOT EXISTS
  (
    SELECT 1
    FROM sys.indexes i
    WHERE i.object_id = OBJECT_ID(N'[oms].[IntegracionPedidoExterno]')
      AND i.name = N'IX_IntegracionPedidoExterno_PedidoId'
  )
BEGIN
  CREATE NONCLUSTERED INDEX [IX_IntegracionPedidoExterno_PedidoId]
    ON [oms].[IntegracionPedidoExterno] ([PedidoId] ASC);
END;

IF OBJECT_ID(N'[oms].[IntegracionPedidoExterno]', N'U') IS NOT NULL
  AND OBJECT_ID(N'[oms].[Integracion]', N'U') IS NOT NULL
  AND NOT EXISTS
  (
    SELECT 1
    FROM sys.foreign_keys fk
    WHERE fk.parent_object_id = OBJECT_ID(N'[oms].[IntegracionPedidoExterno]')
      AND fk.name = N'FK_IntegracionPedidoExterno_Integracion'
  )
BEGIN
  ALTER TABLE [oms].[IntegracionPedidoExterno]
    WITH CHECK
    ADD CONSTRAINT [FK_IntegracionPedidoExterno_Integracion]
      FOREIGN KEY ([IntegracionId])
      REFERENCES [oms].[Integracion] ([IntegracionId]);
END;

IF OBJECT_ID(N'[oms].[IntegracionPedidoExterno]', N'U') IS NOT NULL
  AND OBJECT_ID(N'[oms].[Pedido]', N'U') IS NOT NULL
  AND NOT EXISTS
  (
    SELECT 1
    FROM sys.foreign_keys fk
    WHERE fk.parent_object_id = OBJECT_ID(N'[oms].[IntegracionPedidoExterno]')
      AND fk.name = N'FK_IntegracionPedidoExterno_Pedido'
  )
BEGIN
  ALTER TABLE [oms].[IntegracionPedidoExterno]
    WITH CHECK
    ADD CONSTRAINT [FK_IntegracionPedidoExterno_Pedido]
      FOREIGN KEY ([PedidoId])
      REFERENCES [oms].[Pedido] ([PedidoId]);
END;
