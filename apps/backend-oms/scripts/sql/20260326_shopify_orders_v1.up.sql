-- ============================================================
-- Migration: 20260326_shopify_orders_v1.up
-- Descripción: Canal de venta SHOPIFY + tabla oms.PedidoLinea
--              para almacenar líneas de pedidos recibidos via webhook.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Canal de venta SHOPIFY (idempotente)
--    EmpresaId = 1 — ajustar si la empresa difiere en producción
-- ------------------------------------------------------------
IF NOT EXISTS (
  SELECT 1 FROM [oms].[CanalVenta] WHERE [Codigo] = N'SHOPIFY'
)
BEGIN
  INSERT INTO [oms].[CanalVenta] ([EmpresaId], [Codigo], [Nombre], [Tipo], [Estado])
  VALUES (1, N'SHOPIFY', N'Shopify', N'ECOMMERCE', N'ACTIVO');
END;

-- ------------------------------------------------------------
-- 2. Estado PAGADO para Pedidos (idempotente)
--    Usado como estado inicial al recibir orders/paid de Shopify.
-- ------------------------------------------------------------
IF NOT EXISTS (
  SELECT 1 FROM [oms].[Estado]
  WHERE [Entidad] = N'PEDIDO' AND [Codigo] = N'PAGADO'
)
BEGIN
  INSERT INTO [oms].[Estado] ([Entidad], [Codigo], [Nombre], [Orden], [EsFinal], [Activo])
  VALUES (N'PEDIDO', N'PAGADO', N'Pagado', 10, 0, 1);
END;

-- ------------------------------------------------------------
-- 3. Tabla oms.PedidoLinea
--    Almacena las líneas (line_items) de cada pedido Shopify.
--    ShopifyLineItemId + PedidoId = clave única para idempotencia.
-- ------------------------------------------------------------
IF NOT EXISTS (
  SELECT 1 FROM sys.tables
  WHERE schema_id = SCHEMA_ID(N'oms') AND name = N'PedidoLinea'
)
BEGIN
  CREATE TABLE [oms].[PedidoLinea] (
    [PedidoLineaId]     INT           IDENTITY(1,1) NOT NULL,
    [PedidoId]          BIGINT        NOT NULL,
    [ShopifyLineItemId] NVARCHAR(40)  NOT NULL,
    [ShopifyVariantId]  NVARCHAR(40)  NULL,
    [ShopifyProductId]  NVARCHAR(40)  NULL,
    [VarianteId]        BIGINT        NULL,
    [SKU]               NVARCHAR(120) NULL,
    [Nombre]            NVARCHAR(500) NOT NULL,
    [Cantidad]          INT           NOT NULL,
    [PrecioUnitario]    DECIMAL(18,2) NOT NULL,
    [Total]             DECIMAL(18,2) NOT NULL,
    [CreatedAt]         DATETIME2(3)  NOT NULL CONSTRAINT [DF_PedidoLinea_CreatedAt] DEFAULT SYSUTCDATETIME(),
    CONSTRAINT [PK_PedidoLinea]
      PRIMARY KEY ([PedidoLineaId]),
    CONSTRAINT [FK_PedidoLinea_Pedido]
      FOREIGN KEY ([PedidoId]) REFERENCES [oms].[Pedido]([PedidoId]),
    CONSTRAINT [FK_PedidoLinea_Variante]
      FOREIGN KEY ([VarianteId]) REFERENCES [oms].[ProductoVariante]([VarianteId]),
    CONSTRAINT [UX_PedidoLinea_Shopify]
      UNIQUE ([PedidoId], [ShopifyLineItemId])
  );
END;
