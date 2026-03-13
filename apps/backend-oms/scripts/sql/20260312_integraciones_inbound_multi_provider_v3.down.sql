SET NOCOUNT ON;

IF OBJECT_ID(N'[oms].[IntegracionPedidoExterno]', N'U') IS NOT NULL
BEGIN
  IF EXISTS
  (
    SELECT 1
    FROM sys.foreign_keys
    WHERE parent_object_id = OBJECT_ID(N'[oms].[IntegracionPedidoExterno]')
      AND name = N'FK_IntegracionPedidoExterno_Pedido'
  )
  BEGIN
    ALTER TABLE [oms].[IntegracionPedidoExterno]
      DROP CONSTRAINT [FK_IntegracionPedidoExterno_Pedido];
  END;

  IF EXISTS
  (
    SELECT 1
    FROM sys.foreign_keys
    WHERE parent_object_id = OBJECT_ID(N'[oms].[IntegracionPedidoExterno]')
      AND name = N'FK_IntegracionPedidoExterno_Integracion'
  )
  BEGIN
    ALTER TABLE [oms].[IntegracionPedidoExterno]
      DROP CONSTRAINT [FK_IntegracionPedidoExterno_Integracion];
  END;

  IF EXISTS
  (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'[oms].[IntegracionPedidoExterno]')
      AND name = N'IX_IntegracionPedidoExterno_PedidoId'
  )
  BEGIN
    DROP INDEX [IX_IntegracionPedidoExterno_PedidoId]
      ON [oms].[IntegracionPedidoExterno];
  END;

  IF EXISTS
  (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'[oms].[IntegracionPedidoExterno]')
      AND name = N'UX_IntegracionPedidoExterno_Integracion_ExternalOrderId'
  )
  BEGIN
    DROP INDEX [UX_IntegracionPedidoExterno_Integracion_ExternalOrderId]
      ON [oms].[IntegracionPedidoExterno];
  END;

  DROP TABLE [oms].[IntegracionPedidoExterno];
END;

IF OBJECT_ID(N'[oms].[Pedido]', N'U') IS NOT NULL
  AND COL_LENGTH('oms.Pedido', 'IntegracionId') IS NOT NULL
BEGIN
  IF EXISTS
  (
    SELECT 1
    FROM sys.foreign_keys
    WHERE parent_object_id = OBJECT_ID(N'[oms].[Pedido]')
      AND name = N'FK_Pedido_Integracion'
  )
  BEGIN
    ALTER TABLE [oms].[Pedido]
      DROP CONSTRAINT [FK_Pedido_Integracion];
  END;

  IF EXISTS
  (
    SELECT 1
    FROM sys.stats
    WHERE object_id = OBJECT_ID(N'[oms].[Pedido]')
      AND name = N'IX_Pedido_IntegracionId'
  )
  BEGIN
    IF EXISTS
    (
      SELECT 1
      FROM sys.indexes
      WHERE object_id = OBJECT_ID(N'[oms].[Pedido]')
        AND name = N'IX_Pedido_IntegracionId'
    )
    BEGIN
      DROP INDEX [IX_Pedido_IntegracionId]
        ON [oms].[Pedido];
    END
    ELSE
    BEGIN
      DROP STATISTICS [oms].[Pedido].[IX_Pedido_IntegracionId];
    END;
  END;

  IF EXISTS
  (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'[oms].[Pedido]')
      AND name = N'IX_Pedido_IntegracionId'
  )
  BEGIN
    DROP INDEX [IX_Pedido_IntegracionId]
      ON [oms].[Pedido];
  END;

  ALTER TABLE [oms].[Pedido]
    DROP COLUMN [IntegracionId];
END;
