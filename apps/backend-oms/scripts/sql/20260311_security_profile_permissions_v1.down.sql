USE [OMS];
GO
SET NOCOUNT ON;

IF OBJECT_ID(N'[oms].[PerfilPermiso]', N'U') IS NOT NULL
BEGIN
  IF EXISTS
  (
    SELECT 1
    FROM sys.foreign_keys
    WHERE parent_object_id = OBJECT_ID(N'[oms].[PerfilPermiso]')
      AND name = N'FK_PerfilPermiso_Perfil'
  )
  BEGIN
    ALTER TABLE [oms].[PerfilPermiso]
      DROP CONSTRAINT [FK_PerfilPermiso_Perfil];
  END;

  IF EXISTS
  (
    SELECT 1
    FROM sys.foreign_keys
    WHERE parent_object_id = OBJECT_ID(N'[oms].[PerfilPermiso]')
      AND name = N'FK_PerfilPermiso_Permiso'
  )
  BEGIN
    ALTER TABLE [oms].[PerfilPermiso]
      DROP CONSTRAINT [FK_PerfilPermiso_Permiso];
  END;

  DROP TABLE [oms].[PerfilPermiso];
END;

IF OBJECT_ID(N'[oms].[Permiso]', N'U') IS NOT NULL
BEGIN
  DROP TABLE [oms].[Permiso];
END;
