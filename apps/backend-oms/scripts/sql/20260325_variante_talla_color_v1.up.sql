SET NOCOUNT ON;

-- ============================================================
-- C1: Columnas explícitas ExternalTallaId / ExternalColorId
--     en oms.ProductoVariante
--
-- Problema: el código infería talla y color del formato de SKU
-- ({ziId}-{tallaId}-{colorId}). Si ZI cambia el formato, los
-- lookups de precio/stock se rompen silenciosamente.
--
-- Fix: almacenar ExternalTallaId y ExternalColorId directamente
-- durante el upsert de variante (la API ZI ya devuelve id_talla
-- e id_color en el array combinaciones).
-- Backfill para registros existentes desde el formato de SKU.
-- ============================================================

-- ------------------------------------------------------------
-- Añadir ExternalTallaId (idempotente)
-- ------------------------------------------------------------
IF OBJECT_ID(N'[oms].[ProductoVariante]', N'U') IS NOT NULL
  AND NOT EXISTS
  (
    SELECT 1 FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'[oms].[ProductoVariante]')
      AND c.name = N'ExternalTallaId'
  )
BEGIN
  ALTER TABLE [oms].[ProductoVariante]
    ADD [ExternalTallaId] NVARCHAR(40) NULL;
END;

-- ------------------------------------------------------------
-- Añadir ExternalColorId (idempotente)
-- ------------------------------------------------------------
IF OBJECT_ID(N'[oms].[ProductoVariante]', N'U') IS NOT NULL
  AND NOT EXISTS
  (
    SELECT 1 FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'[oms].[ProductoVariante]')
      AND c.name = N'ExternalColorId'
  )
BEGIN
  ALTER TABLE [oms].[ProductoVariante]
    ADD [ExternalColorId] NVARCHAR(40) NULL;
END;

-- ------------------------------------------------------------
-- Backfill desde SKU para registros existentes
-- Formato esperado: {ziId}-{tallaId}-{colorId}
-- Requiere al menos 2 guiones para evitar SKUs con otro formato.
-- ------------------------------------------------------------
IF OBJECT_ID(N'[oms].[ProductoVariante]', N'U') IS NOT NULL
BEGIN
  UPDATE [oms].[ProductoVariante]
  SET
    [ExternalTallaId] = SUBSTRING(
      [SKU],
      CHARINDEX('-', [SKU]) + 1,
      CHARINDEX('-', [SKU], CHARINDEX('-', [SKU]) + 1)
        - CHARINDEX('-', [SKU]) - 1
    ),
    [ExternalColorId] = SUBSTRING(
      [SKU],
      CHARINDEX('-', [SKU], CHARINDEX('-', [SKU]) + 1) + 1,
      LEN([SKU])
    )
  WHERE [ExternalTallaId] IS NULL
    AND LEN([SKU]) - LEN(REPLACE([SKU], '-', '')) >= 2;
END;
