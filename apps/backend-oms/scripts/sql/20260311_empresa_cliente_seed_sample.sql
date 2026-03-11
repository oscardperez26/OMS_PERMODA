USE [OMS];
GO

DECLARE @EmpresaId INT = 1; -- KOAJ raiz
DECLARE @NombreFranquicia NVARCHAR(180) = N'EMPRESA PEPITO';
DECLARE @DocFranquicia NVARCHAR(120) = N'900999888-1';

IF NOT EXISTS (
  SELECT 1
  FROM [oms].[EmpresaCliente]
  WHERE [EmpresaId] = @EmpresaId
    AND [Nombre] = @NombreFranquicia
)
BEGIN
  INSERT INTO [oms].[EmpresaCliente]
  (
    [EmpresaId], [Nombre], [Documento], [Email], [Telefono],
    [PaisId], [CiudadId], [Direccion], [Estado], [CreatedAt], [UpdatedAt],
    [DisplayName], [LogoUrl], [FaviconUrl]
  )
  VALUES
  (
    @EmpresaId, @NombreFranquicia, @DocFranquicia, N'admin@pepito.com', N'3000000000',
    1, 1, N'Direccion prueba franquicia', N'ACTIVA', SYSUTCDATETIME(), NULL,
    N'Pepito Store', N'https://cdn.ejemplo.com/pepito-logo.png', N'https://cdn.ejemplo.com/pepito-favicon.png'
  );
END
ELSE
BEGIN
  UPDATE [oms].[EmpresaCliente]
  SET
    [DisplayName] = N'Pepito Store',
    [LogoUrl] = N'https://cdn.ejemplo.com/pepito-logo.png',
    [FaviconUrl] = N'https://cdn.ejemplo.com/pepito-favicon.png',
    [UpdatedAt] = SYSUTCDATETIME()
  WHERE [EmpresaId] = @EmpresaId
    AND [Nombre] = @NombreFranquicia;
END

DECLARE @EmpresaClienteId INT =
(
  SELECT TOP 1 [EmpresaClienteId]
  FROM [oms].[EmpresaCliente]
  WHERE [EmpresaId] = @EmpresaId
    AND [Nombre] = @NombreFranquicia
  ORDER BY [EmpresaClienteId] DESC
);

IF NOT EXISTS (
  SELECT 1 FROM [oms].[Tienda]
  WHERE [EmpresaId] = @EmpresaId AND [Codigo] = N'PEP-001'
)
BEGIN
  INSERT INTO [oms].[Tienda]
  (
    [EmpresaId], [EmpresaClienteId], [Codigo], [Nombre],
    [PaisId], [CiudadId], [Direccion], [Telefono],
    [FulfillmentHabilitado], [Activo], [CreatedAt], [UpdatedAt]
  )
  VALUES
  (
    @EmpresaId, @EmpresaClienteId, N'PEP-001', N'Tienda Pepito Centro',
    1, 1, N'Calle 1 # 1-01', N'3001111111',
    1, 1, SYSUTCDATETIME(), NULL
  );
END

IF NOT EXISTS (
  SELECT 1 FROM [oms].[Tienda]
  WHERE [EmpresaId] = @EmpresaId AND [Codigo] = N'PEP-002'
)
BEGIN
  INSERT INTO [oms].[Tienda]
  (
    [EmpresaId], [EmpresaClienteId], [Codigo], [Nombre],
    [PaisId], [CiudadId], [Direccion], [Telefono],
    [FulfillmentHabilitado], [Activo], [CreatedAt], [UpdatedAt]
  )
  VALUES
  (
    @EmpresaId, @EmpresaClienteId, N'PEP-002', N'Tienda Pepito Norte',
    1, 1, N'Calle 2 # 2-02', N'3002222222',
    1, 1, SYSUTCDATETIME(), NULL
  );
END

SELECT
  ec.[EmpresaClienteId], ec.[EmpresaId], ec.[Nombre], ec.[DisplayName], ec.[LogoUrl], ec.[FaviconUrl]
FROM [oms].[EmpresaCliente] ec
WHERE ec.[EmpresaClienteId] = @EmpresaClienteId;

SELECT
  t.[TiendaId], t.[EmpresaId], t.[EmpresaClienteId], t.[Codigo], t.[Nombre], t.[Activo]
FROM [oms].[Tienda] t
WHERE t.[EmpresaClienteId] = @EmpresaClienteId
ORDER BY t.[Codigo];
GO
