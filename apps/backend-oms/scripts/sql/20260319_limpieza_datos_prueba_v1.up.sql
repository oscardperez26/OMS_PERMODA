  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID('tempdb..#PedidosPrueba') IS NOT NULL
      DROP TABLE #PedidosPrueba;

  CREATE TABLE #PedidosPrueba (
    [PedidoId] BIGINT NOT NULL PRIMARY KEY
  );

  INSERT INTO #PedidosPrueba ([PedidoId])
  SELECT p.[PedidoId]
  FROM [oms].[Pedido] p
  WHERE p.[EmpresaId] = 1
    AND p.[IntegracionId] = 1
  UNION
  SELECT p.[PedidoId]
  FROM [oms].[IntegracionPedidoExterno] ipe
  INNER JOIN [oms].[Pedido] p
    ON p.[PedidoId] = ipe.[PedidoId]
  WHERE p.[EmpresaId] = 1
    AND ipe.[IntegracionId] = 1;

  -- NOTA: en este flujo pueden existir pedidos reales con IntegracionId NULL.
  -- No se aborta por esa condicion porque esos pedidos quedan fuera de #PedidosPrueba.

  -- VALIDACION 2: abortar si variantes antiguas tienen
  -- DetallePedido fuera del scope de prueba
  IF EXISTS (
    SELECT 1
    FROM [oms].[DetallePedido] dp
    INNER JOIN [oms].[ProductoVariante] pv
      ON pv.[VarianteId] = dp.[VarianteId]
    LEFT JOIN #PedidosPrueba pp
      ON pp.[PedidoId] = dp.[PedidoId]
    WHERE pv.[OrigenDatos] IS NULL
      AND pv.[EmpresaId] = 1
      AND pp.[PedidoId] IS NULL
  )
  BEGIN
    RAISERROR(
      'Variantes antiguas tienen pedidos fuera del scope IntegracionId=1.',
      16, 1
      );
    END;

    -- BORRADO en orden de dependencias
    DELETE FROM [oms].[PedidoEstadoHistorial]
    WHERE [PedidoId] IN (SELECT [PedidoId] FROM #PedidosPrueba);

    DELETE FROM [oms].[DetallePedido]
    WHERE [PedidoId] IN (SELECT [PedidoId] FROM #PedidosPrueba);

  DELETE FROM [oms].[IntegracionPedidoExterno]
  WHERE [PedidoId] IN (SELECT [PedidoId] FROM #PedidosPrueba);

    -- Limpieza defensiva por si triggers recrearon historial
    DELETE FROM [oms].[PedidoEstadoHistorial]
    WHERE [PedidoId] IN (SELECT [PedidoId] FROM #PedidosPrueba);

    DELETE FROM [oms].[Pedido]
    WHERE [PedidoId] IN (SELECT [PedidoId] FROM #PedidosPrueba);

    DELETE FROM [oms].[InventarioReserva]
    WHERE [VarianteId] IN (
      SELECT [VarianteId] FROM [oms].[ProductoVariante]
      WHERE [OrigenDatos] IS NULL AND [EmpresaId] = 1
    );

    DELETE FROM [oms].[VarianteAtributo]
    WHERE [VarianteId] IN (
      SELECT [VarianteId] FROM [oms].[ProductoVariante]
      WHERE [OrigenDatos] IS NULL AND [EmpresaId] = 1
    );

    DELETE FROM [oms].[Inventario]
    WHERE [VarianteId] IN (
      SELECT [VarianteId] FROM [oms].[ProductoVariante]
      WHERE [OrigenDatos] IS NULL AND [EmpresaId] = 1
    );

    DELETE FROM [oms].[ProductoVariante]
    WHERE [OrigenDatos] IS NULL AND [EmpresaId] = 1;

    DELETE FROM [oms].[Producto]
    WHERE [OrigenDatos] IS NULL AND [EmpresaId] = 1;

    DROP TABLE #PedidosPrueba;

    COMMIT TRANSACTION;

    -- Verificacion final
    SELECT 'Productos ZI' AS Descripcion, COUNT(*) AS Total
    FROM [oms].[Producto] WHERE [OrigenDatos] = 'ZI'
    UNION ALL
    SELECT 'Variantes ZI', COUNT(*)
    FROM [oms].[ProductoVariante] WHERE [OrigenDatos] = 'ZI'
    UNION ALL
    SELECT 'Pedidos restantes', COUNT(*)
    FROM [oms].[Pedido];

  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    IF OBJECT_ID('tempdb..#PedidosPrueba') IS NOT NULL
      DROP TABLE #PedidosPrueba;
    DECLARE @msg NVARCHAR(2048) = ERROR_MESSAGE();
    RAISERROR(@msg, 16, 1);
  END CATCH;
