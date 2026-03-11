USE [OMS];
GO
SET NOCOUNT ON;

IF SCHEMA_ID(N'oms') IS NULL
BEGIN
  EXEC('CREATE SCHEMA [oms]');
END;

IF OBJECT_ID(N'[oms].[Permiso]', N'U') IS NULL
BEGIN
  CREATE TABLE [oms].[Permiso]
  (
    [PermisoId] INT IDENTITY(1, 1) NOT NULL,
    [Codigo] NVARCHAR(120) NOT NULL,
    [Nombre] NVARCHAR(180) NOT NULL,
    [Modulo] NVARCHAR(120) NOT NULL,
    [Accion] NVARCHAR(120) NOT NULL,
    [Activo] BIT NOT NULL
      CONSTRAINT [DF_Permiso_Activo] DEFAULT ((1)),
    [CreatedAt] DATETIME2(0) NOT NULL
      CONSTRAINT [DF_Permiso_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt] DATETIME2(0) NULL,
    CONSTRAINT [PK_Permiso]
      PRIMARY KEY CLUSTERED ([PermisoId] ASC)
  );
END;

IF OBJECT_ID(N'[oms].[Permiso]', N'U') IS NOT NULL
  AND NOT EXISTS
  (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'[oms].[Permiso]')
      AND name = N'UX_Permiso_Codigo'
  )
BEGIN
  CREATE UNIQUE NONCLUSTERED INDEX [UX_Permiso_Codigo]
    ON [oms].[Permiso] ([Codigo] ASC);
END;

IF OBJECT_ID(N'[oms].[PerfilPermiso]', N'U') IS NULL
BEGIN
  CREATE TABLE [oms].[PerfilPermiso]
  (
    [PerfilId] INT NOT NULL,
    [PermisoId] INT NOT NULL,
    [CreatedAt] DATETIME2(0) NOT NULL
      CONSTRAINT [DF_PerfilPermiso_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_PerfilPermiso]
      PRIMARY KEY CLUSTERED ([PerfilId] ASC, [PermisoId] ASC)
  );
END;

IF OBJECT_ID(N'[oms].[PerfilPermiso]', N'U') IS NOT NULL
  AND OBJECT_ID(N'[oms].[Perfil]', N'U') IS NOT NULL
  AND NOT EXISTS
  (
    SELECT 1
    FROM sys.foreign_keys
    WHERE parent_object_id = OBJECT_ID(N'[oms].[PerfilPermiso]')
      AND name = N'FK_PerfilPermiso_Perfil'
  )
BEGIN
  ALTER TABLE [oms].[PerfilPermiso]
    WITH CHECK
    ADD CONSTRAINT [FK_PerfilPermiso_Perfil]
      FOREIGN KEY ([PerfilId])
      REFERENCES [oms].[Perfil] ([PerfilId]);
END;

IF OBJECT_ID(N'[oms].[PerfilPermiso]', N'U') IS NOT NULL
  AND OBJECT_ID(N'[oms].[Permiso]', N'U') IS NOT NULL
  AND NOT EXISTS
  (
    SELECT 1
    FROM sys.foreign_keys
    WHERE parent_object_id = OBJECT_ID(N'[oms].[PerfilPermiso]')
      AND name = N'FK_PerfilPermiso_Permiso'
  )
BEGIN
  ALTER TABLE [oms].[PerfilPermiso]
    WITH CHECK
    ADD CONSTRAINT [FK_PerfilPermiso_Permiso]
      FOREIGN KEY ([PermisoId])
      REFERENCES [oms].[Permiso] ([PermisoId]);
END;

IF OBJECT_ID(N'[oms].[PerfilPermiso]', N'U') IS NOT NULL
  AND NOT EXISTS
  (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'[oms].[PerfilPermiso]')
      AND name = N'IX_PerfilPermiso_PermisoId'
  )
BEGIN
  CREATE NONCLUSTERED INDEX [IX_PerfilPermiso_PermisoId]
    ON [oms].[PerfilPermiso] ([PermisoId] ASC);
END;

IF OBJECT_ID(N'[oms].[Permiso]', N'U') IS NOT NULL
BEGIN
  ;WITH Seed AS
  (
    SELECT
      CAST(v.[Codigo] AS NVARCHAR(120)) AS [Codigo],
      CAST(v.[Nombre] AS NVARCHAR(180)) AS [Nombre],
      CAST(v.[Modulo] AS NVARCHAR(120)) AS [Modulo],
      CAST(v.[Accion] AS NVARCHAR(120)) AS [Accion]
    FROM (VALUES
      (N'orders.read', N'Consultar pedidos', N'orders', N'read'),
      (N'orders.manage', N'Gestionar pedidos', N'orders', N'manage'),
      (N'catalog.read', N'Consultar catalogos legacy', N'catalog', N'read'),
      (N'catalog.manage', N'Gestionar catalogos legacy', N'catalog', N'manage'),
      (N'config.read', N'Consultar configuracion general', N'config', N'read'),
      (N'config.manage', N'Gestionar configuracion general', N'config', N'manage'),
      (N'users.manage', N'Gestionar usuarios y perfiles', N'users', N'manage'),
      (N'security.manage', N'Gestionar permisos de seguridad', N'security', N'manage')
    ) AS v([Codigo], [Nombre], [Modulo], [Accion])
  )
  MERGE [oms].[Permiso] AS target
  USING Seed AS source
    ON target.[Codigo] = source.[Codigo]
  WHEN MATCHED THEN
    UPDATE SET
      [Nombre] = source.[Nombre],
      [Modulo] = source.[Modulo],
      [Accion] = source.[Accion],
      [Activo] = 1,
      [UpdatedAt] = SYSUTCDATETIME()
  WHEN NOT MATCHED BY TARGET THEN
    INSERT ([Codigo], [Nombre], [Modulo], [Accion], [Activo], [UpdatedAt])
    VALUES (source.[Codigo], source.[Nombre], source.[Modulo], source.[Accion], 1, NULL);
END;

IF OBJECT_ID(N'[oms].[PerfilPermiso]', N'U') IS NOT NULL
  AND OBJECT_ID(N'[oms].[Permiso]', N'U') IS NOT NULL
  AND OBJECT_ID(N'[oms].[Perfil]', N'U') IS NOT NULL
BEGIN
  ;WITH Seed AS
  (
    SELECT
      v.[PerfilId],
      p.[PermisoId]
    FROM (VALUES
      (1, N'orders.read'),
      (1, N'orders.manage'),
      (1, N'catalog.read'),
      (1, N'catalog.manage'),
      (1, N'config.read'),
      (1, N'config.manage'),
      (1, N'users.manage'),
      (1, N'security.manage'),
      (2, N'orders.read'),
      (2, N'catalog.read'),
      (2, N'config.read'),
      (3, N'orders.read'),
      (3, N'orders.manage'),
      (4, N'orders.read')
    ) AS v([PerfilId], [CodigoPermiso])
    INNER JOIN [oms].[Permiso] p
      ON p.[Codigo] = v.[CodigoPermiso]
    INNER JOIN [oms].[Perfil] pf
      ON pf.[PerfilId] = v.[PerfilId]
  )
  MERGE [oms].[PerfilPermiso] AS target
  USING Seed AS source
    ON target.[PerfilId] = source.[PerfilId]
   AND target.[PermisoId] = source.[PermisoId]
  WHEN NOT MATCHED BY TARGET THEN
    INSERT ([PerfilId], [PermisoId], [CreatedAt])
    VALUES (source.[PerfilId], source.[PermisoId], SYSUTCDATETIME());
END;
