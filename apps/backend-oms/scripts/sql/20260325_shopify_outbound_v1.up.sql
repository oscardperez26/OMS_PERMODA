SET NOCOUNT ON;

-- ============================================================
-- Shopify Outbound Integration — Fase 2
-- Crea las tablas para integraciones salientes (OMS -> Shopify)
-- separadas de oms.Integracion (exclusivamente inbound).
-- ============================================================

-- ------------------------------------------------------------
-- 1. oms.IntegracionSaliente
--    Registro maestro de un conector outbound por empresa.
--    ProviderCode es columna nativa (no JSON) para consultas
--    directas y constraints futuros.
-- ------------------------------------------------------------
IF OBJECT_ID(N'[oms].[IntegracionSaliente]', N'U') IS NULL
BEGIN
  CREATE TABLE [oms].[IntegracionSaliente]
  (
    [IntegracionSalienteId] INT           IDENTITY(1, 1) NOT NULL,
    [EmpresaId]             INT           NOT NULL,
    [ProviderCode]          NVARCHAR(40)  NOT NULL,
    [Nombre]                NVARCHAR(200) NOT NULL,
    [Estado]                NVARCHAR(20)  NOT NULL
      CONSTRAINT [DF_IntegracionSaliente_Estado] DEFAULT (N'ACTIVO'),
    [ConfigJson]            NVARCHAR(MAX) NULL,
    [CreatedAt]             DATETIME2(0)  NOT NULL
      CONSTRAINT [DF_IntegracionSaliente_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt]             DATETIME2(0)  NULL,
    CONSTRAINT [PK_IntegracionSaliente]
      PRIMARY KEY CLUSTERED ([IntegracionSalienteId] ASC)
  );
END;

-- FK -> oms.Empresa (solo si la tabla existe)
IF OBJECT_ID(N'[oms].[IntegracionSaliente]', N'U') IS NOT NULL
  AND OBJECT_ID(N'[oms].[Empresa]', N'U') IS NOT NULL
  AND NOT EXISTS
  (
    SELECT 1 FROM sys.foreign_keys fk
    WHERE fk.parent_object_id = OBJECT_ID(N'[oms].[IntegracionSaliente]')
      AND fk.name = N'FK_IntegracionSaliente_Empresa'
  )
BEGIN
  EXEC(N'
    ALTER TABLE [oms].[IntegracionSaliente]
      WITH CHECK
      ADD CONSTRAINT [FK_IntegracionSaliente_Empresa]
        FOREIGN KEY ([EmpresaId])
        REFERENCES [oms].[Empresa] ([EmpresaId]);
  ');
END;

-- Index: búsqueda de integración activa por empresa + proveedor
IF OBJECT_ID(N'[oms].[IntegracionSaliente]', N'U') IS NOT NULL
  AND NOT EXISTS
  (
    SELECT 1 FROM sys.indexes i
    WHERE i.object_id = OBJECT_ID(N'[oms].[IntegracionSaliente]')
      AND i.name = N'IX_IntegracionSaliente_EmpresaId_ProviderCode_Estado'
  )
BEGIN
  CREATE NONCLUSTERED INDEX [IX_IntegracionSaliente_EmpresaId_ProviderCode_Estado]
    ON [oms].[IntegracionSaliente] ([EmpresaId] ASC, [ProviderCode] ASC, [Estado] ASC);
END;

-- ------------------------------------------------------------
-- 2. oms.IntegracionProductoExterno
--    Persiste el ID externo (Shopify GID) de cada producto OMS
--    publicado por una integración saliente.
--    Llave lógica: (IntegracionSalienteId, ProductoId).
-- ------------------------------------------------------------
IF OBJECT_ID(N'[oms].[IntegracionProductoExterno]', N'U') IS NULL
BEGIN
  CREATE TABLE [oms].[IntegracionProductoExterno]
  (
    [IntegracionProductoExternoId] BIGINT        IDENTITY(1, 1) NOT NULL,
    [IntegracionSalienteId]        INT           NOT NULL,
    [ProductoId]                   INT           NOT NULL,
    [ExternalProductId]            NVARCHAR(160) NOT NULL,
    [Estado]                       NVARCHAR(40)  NOT NULL
      CONSTRAINT [DF_IntegracionProductoExterno_Estado] DEFAULT (N'SINCRONIZADO'),
    [CreatedAt]                    DATETIME2(0)  NOT NULL
      CONSTRAINT [DF_IntegracionProductoExterno_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt]                    DATETIME2(0)  NULL,
    CONSTRAINT [PK_IntegracionProductoExterno]
      PRIMARY KEY CLUSTERED ([IntegracionProductoExternoId] ASC)
  );
END;

-- Unique: un producto solo puede tener un mapping por integración saliente
IF OBJECT_ID(N'[oms].[IntegracionProductoExterno]', N'U') IS NOT NULL
  AND NOT EXISTS
  (
    SELECT 1 FROM sys.indexes i
    WHERE i.object_id = OBJECT_ID(N'[oms].[IntegracionProductoExterno]')
      AND i.name = N'UX_IntegracionProductoExterno_Integracion_Producto'
  )
BEGIN
  CREATE UNIQUE NONCLUSTERED INDEX [UX_IntegracionProductoExterno_Integracion_Producto]
    ON [oms].[IntegracionProductoExterno] ([IntegracionSalienteId] ASC, [ProductoId] ASC);
END;

-- FK -> oms.IntegracionSaliente
IF OBJECT_ID(N'[oms].[IntegracionProductoExterno]', N'U') IS NOT NULL
  AND NOT EXISTS
  (
    SELECT 1 FROM sys.foreign_keys fk
    WHERE fk.parent_object_id = OBJECT_ID(N'[oms].[IntegracionProductoExterno]')
      AND fk.name = N'FK_IntegracionProductoExterno_IntegracionSaliente'
  )
BEGIN
  ALTER TABLE [oms].[IntegracionProductoExterno]
    WITH CHECK
    ADD CONSTRAINT [FK_IntegracionProductoExterno_IntegracionSaliente]
      FOREIGN KEY ([IntegracionSalienteId])
      REFERENCES [oms].[IntegracionSaliente] ([IntegracionSalienteId]);
END;

-- ------------------------------------------------------------
-- 3. oms.IntegracionVarianteExterna
--    Persiste el ID externo (Shopify GID) de cada variante OMS
--    publicada, más el InventoryItemId de Shopify.
--    Llave lógica: (IntegracionSalienteId, VarianteId).
--    ProductoId se almacena para facilitar lookups por producto.
-- ------------------------------------------------------------
IF OBJECT_ID(N'[oms].[IntegracionVarianteExterna]', N'U') IS NULL
BEGIN
  CREATE TABLE [oms].[IntegracionVarianteExterna]
  (
    [IntegracionVarianteExternaId] BIGINT        IDENTITY(1, 1) NOT NULL,
    [IntegracionSalienteId]        INT           NOT NULL,
    [ProductoId]                   INT           NOT NULL,
    [VarianteId]                   INT           NOT NULL,
    [ExternalVariantId]            NVARCHAR(160) NOT NULL,
    [InventoryItemId]              NVARCHAR(160) NULL,
    [Estado]                       NVARCHAR(40)  NOT NULL
      CONSTRAINT [DF_IntegracionVarianteExterna_Estado] DEFAULT (N'SINCRONIZADO'),
    [CreatedAt]                    DATETIME2(0)  NOT NULL
      CONSTRAINT [DF_IntegracionVarianteExterna_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt]                    DATETIME2(0)  NULL,
    CONSTRAINT [PK_IntegracionVarianteExterna]
      PRIMARY KEY CLUSTERED ([IntegracionVarianteExternaId] ASC)
  );
END;

-- Unique: una variante solo puede tener un mapping por integración saliente
IF OBJECT_ID(N'[oms].[IntegracionVarianteExterna]', N'U') IS NOT NULL
  AND NOT EXISTS
  (
    SELECT 1 FROM sys.indexes i
    WHERE i.object_id = OBJECT_ID(N'[oms].[IntegracionVarianteExterna]')
      AND i.name = N'UX_IntegracionVarianteExterna_Integracion_Variante'
  )
BEGIN
  CREATE UNIQUE NONCLUSTERED INDEX [UX_IntegracionVarianteExterna_Integracion_Variante]
    ON [oms].[IntegracionVarianteExterna] ([IntegracionSalienteId] ASC, [VarianteId] ASC);
END;

-- Index: lookup de variantes por producto (para cargar todas de un sync)
IF OBJECT_ID(N'[oms].[IntegracionVarianteExterna]', N'U') IS NOT NULL
  AND NOT EXISTS
  (
    SELECT 1 FROM sys.indexes i
    WHERE i.object_id = OBJECT_ID(N'[oms].[IntegracionVarianteExterna]')
      AND i.name = N'IX_IntegracionVarianteExterna_Integracion_Producto'
  )
BEGIN
  CREATE NONCLUSTERED INDEX [IX_IntegracionVarianteExterna_Integracion_Producto]
    ON [oms].[IntegracionVarianteExterna] ([IntegracionSalienteId] ASC, [ProductoId] ASC);
END;

-- FK -> oms.IntegracionSaliente
IF OBJECT_ID(N'[oms].[IntegracionVarianteExterna]', N'U') IS NOT NULL
  AND NOT EXISTS
  (
    SELECT 1 FROM sys.foreign_keys fk
    WHERE fk.parent_object_id = OBJECT_ID(N'[oms].[IntegracionVarianteExterna]')
      AND fk.name = N'FK_IntegracionVarianteExterna_IntegracionSaliente'
  )
BEGIN
  ALTER TABLE [oms].[IntegracionVarianteExterna]
    WITH CHECK
    ADD CONSTRAINT [FK_IntegracionVarianteExterna_IntegracionSaliente]
      FOREIGN KEY ([IntegracionSalienteId])
      REFERENCES [oms].[IntegracionSaliente] ([IntegracionSalienteId]);
END;
