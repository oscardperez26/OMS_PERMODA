SET NOCOUNT ON;

-- ============================================================
-- Rollback: Shopify Outbound Integration — Fase 2
-- Elimina tablas en orden inverso respetando FKs.
-- ============================================================

IF OBJECT_ID(N'[oms].[IntegracionVarianteExterna]', N'U') IS NOT NULL
  DROP TABLE [oms].[IntegracionVarianteExterna];

IF OBJECT_ID(N'[oms].[IntegracionProductoExterno]', N'U') IS NOT NULL
  DROP TABLE [oms].[IntegracionProductoExterno];

IF OBJECT_ID(N'[oms].[IntegracionSaliente]', N'U') IS NOT NULL
  DROP TABLE [oms].[IntegracionSaliente];
