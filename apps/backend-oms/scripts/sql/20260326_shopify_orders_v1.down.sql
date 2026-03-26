-- ============================================================
-- Migration: 20260326_shopify_orders_v1.down
-- Rollback: elimina PedidoLinea, estado PAGADO y canal SHOPIFY
-- ============================================================

DROP TABLE IF EXISTS [oms].[PedidoLinea];

DELETE FROM [oms].[Estado]
WHERE [Entidad] = N'PEDIDO' AND [Codigo] = N'PAGADO';

DELETE FROM [oms].[CanalVenta]
WHERE [Codigo] = N'SHOPIFY';
