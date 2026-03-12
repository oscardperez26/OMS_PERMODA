SET NOCOUNT ON;

DECLARE @EmpresaId INT = 1;
DECLARE @CodigoIntegracion NVARCHAR(120) = N'KOAJ_INBOUND';
DECLARE @CanalCodigo NVARCHAR(100) = N'ECOM';
DECLARE @CanalVentaId INT;

SELECT TOP 1 @CanalVentaId = [CanalVentaId]
FROM [oms].[CanalVenta]
WHERE [EmpresaId] = @EmpresaId
  AND UPPER([Codigo]) = UPPER(@CanalCodigo)
ORDER BY [CanalVentaId] ASC;

IF @CanalVentaId IS NULL
BEGIN
  SELECT TOP 1 @CanalVentaId = [CanalVentaId]
  FROM [oms].[CanalVenta]
  WHERE [EmpresaId] = @EmpresaId
  ORDER BY [CanalVentaId] ASC;
END;

IF @CanalVentaId IS NULL
BEGIN
  RAISERROR(
    'No existe CanalVenta para EmpresaId=1. No se puede crear KOAJ_INBOUND.',
    16,
    1
  );
  RETURN;
END;

DECLARE @ConfigJson NVARCHAR(MAX) = N'{
  "flowType": "INBOUND",
  "providerCode": "KOAJ",
  "mode": "KOAJ_PILOT",
  "connection": {
    "baseUrl": "https://koaj8.dev.koaj.co/api",
    "authType": "API_KEY",
    "timeoutMs": 15000
  },
  "endpoints": {
    "listConfirmedOrdersEndpoint": "/orders",
    "orderDetailEndpoint": "/orders/{id}"
  },
  "filters": {
    "confirmedStatuses": ["CONFIRMED"]
  },
  "mapping": {
    "externalOrderIdField": "id",
    "externalReferenceField": "reference",
    "customerNameField": "customer_name",
    "totalField": "total_paid_tax_incl",
    "statusField": "status"
  },
  "validation": {
    "isValid": false,
    "errors": ["Configuracion pendiente de validacion"],
    "validatedAt": null
  },
  "lastSync": null
}';

IF EXISTS
(
  SELECT 1
  FROM [oms].[Integracion]
  WHERE [EmpresaId] = @EmpresaId
    AND [Codigo] = @CodigoIntegracion
)
BEGIN
  UPDATE [oms].[Integracion]
  SET
    [CanalVentaId] = @CanalVentaId,
    [Nombre] = N'KOAJ Entrante',
    [ConfigJson] = @ConfigJson,
    [Estado] = N'ACTIVO',
    [UpdatedAt] = SYSUTCDATETIME()
  WHERE [EmpresaId] = @EmpresaId
    AND [Codigo] = @CodigoIntegracion;
END
ELSE
BEGIN
  INSERT INTO [oms].[Integracion]
  (
    [EmpresaId],
    [CanalVentaId],
    [Codigo],
    [Nombre],
    [ConfigJson],
    [Estado],
    [UpdatedAt]
  )
  VALUES
  (
    @EmpresaId,
    @CanalVentaId,
    @CodigoIntegracion,
    N'KOAJ Entrante',
    @ConfigJson,
    N'ACTIVO',
    NULL
  );
END;

SELECT TOP 1
  [IntegracionId],
  [EmpresaId],
  [CanalVentaId],
  [Codigo],
  [Nombre],
  [Estado],
  [UpdatedAt]
FROM [oms].[Integracion]
WHERE [EmpresaId] = @EmpresaId
  AND [Codigo] = @CodigoIntegracion
ORDER BY [IntegracionId] DESC;
