SET NOCOUNT ON;

-- ============================================================
-- Agrega ExternalProductId a oms.Producto para almacenar el ID
-- numérico del producto en ZI (campo "id" de la API de ZI).
--
-- Problema: resolverVarianteIdPorTallaColor construía el SKU como
-- "{productoZiId}-{talla}-{color}" para buscar la variante, pero
-- después de migrar el formato de SKU a "{SKUBase}-{talla}-{color}"
-- la búsqueda siempre falla porque productoZiId ≠ SKUBase.
--
-- Fix: almacenar productoZiId en Producto.ExternalProductId y
-- hacer el lookup con JOIN Producto + filtros ExternalTallaId/Color.
--
-- ACCIÓN REQUERIDA TRAS EJECUTAR ESTE SCRIPT:
--   Ejecutar una sincronización ZI completa (sync/full) para
--   poblar ExternalProductId en todos los productos existentes.
-- ============================================================

IF COL_LENGTH('oms.Producto', 'ExternalProductId') IS NULL
  ALTER TABLE [oms].[Producto]
    ADD [ExternalProductId] INT NULL;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'IX_Producto_ExternalProductId'
    AND object_id = OBJECT_ID(N'[oms].[Producto]')
)
  CREATE NONCLUSTERED INDEX [IX_Producto_ExternalProductId]
    ON [oms].[Producto] ([EmpresaId], [ExternalProductId])
    WHERE [ExternalProductId] IS NOT NULL;
