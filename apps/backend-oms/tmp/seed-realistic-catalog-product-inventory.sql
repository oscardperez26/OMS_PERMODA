SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
  BEGIN TRAN;

  DECLARE @EmpresaId INT = (
    SELECT TOP 1 [EmpresaId]
    FROM [oms].[Empresa]
    ORDER BY [EmpresaId] ASC
  );

  IF @EmpresaId IS NULL
    THROW 51000, 'No existe Empresa en [oms].[Empresa].', 1;

  DECLARE @Bodega081Id INT = (
    SELECT TOP 1 b.[BodegaId]
    FROM [oms].[Bodega] b
    INNER JOIN [oms].[Tienda] t ON t.[TiendaId] = b.[TiendaId]
    WHERE t.[EmpresaId] = @EmpresaId
      AND t.[Codigo] = '081'
      AND t.[Activo] = 1
      AND b.[Activo] = 1
    ORDER BY b.[BodegaId] ASC
  );

  DECLARE @Bodega198Id INT = (
    SELECT TOP 1 b.[BodegaId]
    FROM [oms].[Bodega] b
    INNER JOIN [oms].[Tienda] t ON t.[TiendaId] = b.[TiendaId]
    WHERE t.[EmpresaId] = @EmpresaId
      AND t.[Codigo] = '198'
      AND t.[Activo] = 1
      AND b.[Activo] = 1
    ORDER BY b.[BodegaId] ASC
  );

  IF @Bodega081Id IS NULL
    THROW 51000, 'No existe bodega activa para tienda 081.', 1;

  IF @Bodega198Id IS NULL
    THROW 51000, 'No existe bodega activa para tienda 198.', 1;

  DECLARE @CategoriasSeed TABLE (
    [ExternalCategoryId] INT NOT NULL PRIMARY KEY,
    [Codigo] NVARCHAR(80) NOT NULL,
    [Nombre] NVARCHAR(180) NOT NULL,
    [ParentExternalCategoryId] INT NULL
  );

  INSERT INTO @CategoriasSeed ([ExternalCategoryId], [Codigo], [Nombre], [ParentExternalCategoryId])
  VALUES
    (3,  '3',      'HOMBRE',                NULL),
    (31, '3-CAM',  'CAMISETAS HOMBRE',      3),
    (32, '3-PAN',  'PANTALONES HOMBRE',     3),
    (33, '3-JEA',  'JEANS HOMBRE',          3),
    (34, '3-BUZ',  'BUZOS HOMBRE',          3),
    (35, '3-CAL',  'CALZADO HOMBRE',        3),
    (4,  '4',      'MUJER',                 NULL),
    (41, '4-CAM',  'CAMISETAS MUJER',       4),
    (42, '4-JEA',  'JEANS MUJER',           4),
    (43, '4-BUZ',  'BUZOS MUJER',           4);

  MERGE [oms].[Categoria] AS tgt
  USING (
    SELECT
      @EmpresaId AS [EmpresaId],
      s.[ExternalCategoryId],
      s.[Codigo],
      s.[Nombre]
    FROM @CategoriasSeed s
  ) AS src
  ON tgt.[EmpresaId] = src.[EmpresaId]
     AND tgt.[ExternalCategoryId] = src.[ExternalCategoryId]
  WHEN MATCHED THEN
    UPDATE SET
      tgt.[Codigo] = src.[Codigo],
      tgt.[Nombre] = src.[Nombre],
      tgt.[Activo] = 1,
      tgt.[UpdatedAt] = SYSUTCDATETIME(),
      tgt.[ApiSuccess] = 1,
      tgt.[ApiStatusCode] = 200,
      tgt.[IsActiveExternal] = 1,
      tgt.[SourceTs] = SYSUTCDATETIME()
  WHEN NOT MATCHED THEN
    INSERT (
      [EmpresaId],
      [ParentId],
      [Codigo],
      [Nombre],
      [Activo],
      [CreatedAt],
      [UpdatedAt],
      [ExternalCategoryId],
      [ExternalParentId],
      [Level],
      [SourceTs],
      [IsActiveExternal],
      [ApiSuccess],
      [ApiStatusCode]
    )
    VALUES (
      src.[EmpresaId],
      NULL,
      src.[Codigo],
      src.[Nombre],
      1,
      SYSUTCDATETIME(),
      NULL,
      src.[ExternalCategoryId],
      NULL,
      NULL,
      SYSUTCDATETIME(),
      1,
      1,
      200
    );

  UPDATE c
  SET
    c.[ParentId] = p.[CategoriaId],
    c.[ExternalParentId] = s.[ParentExternalCategoryId],
    c.[UpdatedAt] = SYSUTCDATETIME()
  FROM [oms].[Categoria] c
  INNER JOIN @CategoriasSeed s
    ON s.[ExternalCategoryId] = c.[ExternalCategoryId]
  LEFT JOIN [oms].[Categoria] p
    ON p.[EmpresaId] = c.[EmpresaId]
   AND p.[ExternalCategoryId] = s.[ParentExternalCategoryId]
  WHERE c.[EmpresaId] = @EmpresaId;

  DECLARE @ColorSeed TABLE (
    [ExternalColorId] INT NOT NULL PRIMARY KEY,
    [SourceCode] NVARCHAR(60) NOT NULL,
    [Nombre] NVARCHAR(200) NOT NULL,
    [IsMaterial] BIT NOT NULL
  );

  INSERT INTO @ColorSeed ([ExternalColorId], [SourceCode], [Nombre], [IsMaterial])
  VALUES
    (264, '912', 'KAKY MUY CLARO', 0),
    (300, '909', 'NEGRO', 0),
    (301, '101', 'BLANCO', 0),
    (302, '102', 'GRIS', 0),
    (303, '302', 'AZUL', 0),
    (304, '760', 'INDIGO', 0),
    (305, '001', 'ROJO', 0),
    (306, '005', 'BLANCO HUESO', 0),
    (307, '315', 'VERDE OLIVA', 0),
    (308, '440', 'BEIGE', 0);

  MERGE [oms].[Color] AS tgt
  USING (
    SELECT
      @EmpresaId AS [EmpresaId],
      s.[ExternalColorId],
      s.[SourceCode],
      s.[Nombre],
      s.[IsMaterial]
    FROM @ColorSeed s
  ) AS src
  ON tgt.[EmpresaId] = src.[EmpresaId]
     AND tgt.[SourceCode] = src.[SourceCode]
  WHEN MATCHED THEN
    UPDATE SET
      tgt.[ExternalColorId] = src.[ExternalColorId],
      tgt.[CompanyID] = src.[EmpresaId],
      tgt.[Nombre] = src.[Nombre],
      tgt.[IsActive] = 1,
      tgt.[IsMaterial] = src.[IsMaterial],
      tgt.[SourceTs] = SYSUTCDATETIME(),
      tgt.[ApiSuccess] = 1,
      tgt.[ApiStatusCode] = 200,
      tgt.[UpdatedAt] = SYSUTCDATETIME()
  WHEN NOT MATCHED THEN
    INSERT (
      [EmpresaId],
      [ExternalColorId],
      [CompanyID],
      [SourceCode],
      [Nombre],
      [IsActive],
      [IsMaterial],
      [SourceTs],
      [ApiSuccess],
      [ApiStatusCode],
      [CreatedAt],
      [UpdatedAt]
    )
    VALUES (
      src.[EmpresaId],
      src.[ExternalColorId],
      src.[EmpresaId],
      src.[SourceCode],
      src.[Nombre],
      1,
      src.[IsMaterial],
      SYSUTCDATETIME(),
      1,
      200,
      SYSUTCDATETIME(),
      NULL
    );

  DECLARE @TallaSeed TABLE (
    [ExternalTallaId] INT NOT NULL PRIMARY KEY,
    [SourceCode] NVARCHAR(60) NOT NULL,
    [Nombre] NVARCHAR(200) NOT NULL
  );

  INSERT INTO @TallaSeed ([ExternalTallaId], [SourceCode], [Nombre])
  VALUES
    (9001, 'XXS', 'XXS'),
    (9002, 'XS',  'XS'),
    (9003, 'S',   'S'),
    (9004, 'M',   'M'),
    (9005, 'L',   'L'),
    (9006, 'XL',  'XL'),
    (9010, '10',  '10'),
    (9030, '30',  '30'),
    (9032, '32',  '32'),
    (9034, '34',  '34'),
    (9138, '38',  '38'),
    (9140, '40',  '40');

  MERGE [oms].[Talla] AS tgt
  USING (
    SELECT
      @EmpresaId AS [EmpresaId],
      s.[ExternalTallaId],
      s.[SourceCode],
      s.[Nombre]
    FROM @TallaSeed s
  ) AS src
  ON tgt.[EmpresaId] = src.[EmpresaId]
     AND tgt.[SourceCode] = src.[SourceCode]
  WHEN MATCHED THEN
    UPDATE SET
      tgt.[ExternalTallaId] = src.[ExternalTallaId],
      tgt.[Nombre] = src.[Nombre],
      tgt.[IsActive] = 1,
      tgt.[SourceTs] = SYSUTCDATETIME(),
      tgt.[UpdatedAt] = SYSUTCDATETIME()
  WHEN NOT MATCHED THEN
    INSERT (
      [EmpresaId],
      [ExternalTallaId],
      [SourceCode],
      [Nombre],
      [IsActive],
      [SourceTs],
      [CreatedAt],
      [UpdatedAt]
    )
    VALUES (
      src.[EmpresaId],
      src.[ExternalTallaId],
      src.[SourceCode],
      src.[Nombre],
      1,
      SYSUTCDATETIME(),
      SYSUTCDATETIME(),
      NULL
    );

  DECLARE @AtributoSeed TABLE (
    [Codigo] NVARCHAR(60) NOT NULL PRIMARY KEY,
    [Nombre] NVARCHAR(120) NOT NULL,
    [Tipo] NVARCHAR(20) NOT NULL
  );

  INSERT INTO @AtributoSeed ([Codigo], [Nombre], [Tipo])
  VALUES
    ('COLOR', 'Color', 'LISTA'),
    ('TALLA', 'Talla', 'LISTA');

  MERGE [oms].[Atributo] AS tgt
  USING (
    SELECT
      @EmpresaId AS [EmpresaId],
      s.[Codigo],
      s.[Nombre],
      s.[Tipo]
    FROM @AtributoSeed s
  ) AS src
  ON tgt.[EmpresaId] = src.[EmpresaId]
     AND tgt.[Codigo] = src.[Codigo]
  WHEN MATCHED THEN
    UPDATE SET
      tgt.[Nombre] = src.[Nombre],
      tgt.[Tipo] = src.[Tipo],
      tgt.[UpdatedAt] = SYSUTCDATETIME()
  WHEN NOT MATCHED THEN
    INSERT (
      [EmpresaId],
      [Codigo],
      [Nombre],
      [Tipo],
      [CreatedAt],
      [UpdatedAt]
    )
    VALUES (
      src.[EmpresaId],
      src.[Codigo],
      src.[Nombre],
      src.[Tipo],
      SYSUTCDATETIME(),
      NULL
    );

  DECLARE @AtributoValorSeed TABLE (
    [AtributoCodigo] NVARCHAR(60) NOT NULL,
    [Codigo] NVARCHAR(80) NOT NULL,
    [Valor] NVARCHAR(160) NOT NULL,
    [Orden] INT NOT NULL,
    PRIMARY KEY ([AtributoCodigo], [Valor])
  );

  INSERT INTO @AtributoValorSeed ([AtributoCodigo], [Codigo], [Valor], [Orden])
  VALUES
    ('COLOR', 'COLOR_912', 'KAKY MUY CLARO', 1),
    ('COLOR', 'COLOR_909', 'NEGRO', 2),
    ('COLOR', 'COLOR_101', 'BLANCO', 3),
    ('COLOR', 'COLOR_102', 'GRIS', 4),
    ('COLOR', 'COLOR_302', 'AZUL', 5),
    ('COLOR', 'COLOR_760', 'INDIGO', 6),
    ('COLOR', 'COLOR_001', 'ROJO', 7),
    ('COLOR', 'COLOR_005', 'BLANCO HUESO', 8),
    ('COLOR', 'COLOR_315', 'VERDE OLIVA', 9),
    ('COLOR', 'COLOR_440', 'BEIGE', 10),
    ('TALLA', 'TALLA_XXS', 'XXS', 1),
    ('TALLA', 'TALLA_XS',  'XS', 2),
    ('TALLA', 'TALLA_S',   'S', 3),
    ('TALLA', 'TALLA_M',   'M', 4),
    ('TALLA', 'TALLA_L',   'L', 5),
    ('TALLA', 'TALLA_XL',  'XL', 6),
    ('TALLA', 'TALLA_10',  '10', 7),
    ('TALLA', 'TALLA_30',  '30', 8),
    ('TALLA', 'TALLA_32',  '32', 9),
    ('TALLA', 'TALLA_34',  '34', 10),
    ('TALLA', 'TALLA_38',  '38', 11),
    ('TALLA', 'TALLA_40',  '40', 12);

  MERGE [oms].[AtributoValor] AS tgt
  USING (
    SELECT
      a.[AtributoId],
      s.[Codigo],
      s.[Valor],
      s.[Orden]
    FROM @AtributoValorSeed s
    INNER JOIN [oms].[Atributo] a
      ON a.[EmpresaId] = @EmpresaId
     AND a.[Codigo] = s.[AtributoCodigo]
  ) AS src
  ON tgt.[AtributoId] = src.[AtributoId]
     AND tgt.[Valor] = src.[Valor]
  WHEN MATCHED THEN
    UPDATE SET
      tgt.[Codigo] = src.[Codigo],
      tgt.[Orden] = src.[Orden],
      tgt.[UpdatedAt] = SYSUTCDATETIME()
  WHEN NOT MATCHED THEN
    INSERT (
      [AtributoId],
      [Codigo],
      [Valor],
      [Orden],
      [CreatedAt],
      [UpdatedAt]
    )
    VALUES (
      src.[AtributoId],
      src.[Codigo],
      src.[Valor],
      src.[Orden],
      SYSUTCDATETIME(),
      NULL
    );

  DECLARE @ProductoSeed TABLE (
    [SKUBase] NVARCHAR(80) NOT NULL PRIMARY KEY,
    [Nombre] NVARCHAR(220) NOT NULL,
    [CategoriaExternalId] INT NULL,
    [Marca] NVARCHAR(120) NULL
  );

  INSERT INTO @ProductoSeed ([SKUBase], [Nombre], [CategoriaExternalId], [Marca])
  VALUES
    ('10C205692553', 'CAMISETA KOAJ BLANKS CF 147', 31, 'KOAJ'),
    ('20P118004112', 'PANTALON KOAJ REGULAR', 32, 'KOAJ'),
    ('30J450011321', 'JEAN KOAJ SKINNY', 33, 'KOAJ'),
    ('40B770020400', 'BUZO KOAJ CAPOTA', 34, 'KOAJ'),
    ('50Z990031500', 'ZAPATILLA KOAJ URBANA', 35, 'KOAJ'),
    ('60C310044200', 'CAMISETA KOAJ GRAPHIC', 31, 'KOAJ'),
    ('70P510055100', 'PANTALON KOAJ JOGGER', 32, 'KOAJ'),
    ('80A210066700', 'CHAQUETA KOAJ DENIM', 33, 'KOAJ'),
    ('90S880077900', 'SNEAKER KOAJ STREET', 35, 'KOAJ');

  MERGE [oms].[Producto] AS tgt
  USING (
    SELECT
      @EmpresaId AS [EmpresaId],
      s.[SKUBase],
      s.[Nombre],
      c.[CategoriaId],
      s.[Marca]
    FROM @ProductoSeed s
    LEFT JOIN [oms].[Categoria] c
      ON c.[EmpresaId] = @EmpresaId
     AND c.[ExternalCategoryId] = s.[CategoriaExternalId]
  ) AS src
  ON tgt.[EmpresaId] = src.[EmpresaId]
     AND ISNULL(tgt.[SKUBase], '') = src.[SKUBase]
  WHEN MATCHED THEN
    UPDATE SET
      tgt.[Nombre] = src.[Nombre],
      tgt.[CategoriaId] = src.[CategoriaId],
      tgt.[Marca] = src.[Marca],
      tgt.[Activo] = 1,
      tgt.[UpdatedAt] = SYSUTCDATETIME()
  WHEN NOT MATCHED THEN
    INSERT (
      [EmpresaId],
      [CategoriaId],
      [SKUBase],
      [Nombre],
      [Descripcion],
      [Marca],
      [Activo],
      [CreatedAt],
      [UpdatedAt]
    )
    VALUES (
      src.[EmpresaId],
      src.[CategoriaId],
      src.[SKUBase],
      src.[Nombre],
      CONCAT('Seed realista ', src.[Nombre]),
      src.[Marca],
      1,
      SYSUTCDATETIME(),
      NULL
    );

  DECLARE @VarianteSeed TABLE (
    [SKU] NVARCHAR(100) NOT NULL PRIMARY KEY,
    [SKUBase] NVARCHAR(80) NOT NULL,
    [EAN] NVARCHAR(60) NULL,
    [Nombre] NVARCHAR(220) NOT NULL,
    [PesoKg] DECIMAL(10,3) NULL,
    [LargoCm] DECIMAL(10,2) NULL,
    [AnchoCm] DECIMAL(10,2) NULL,
    [AltoCm] DECIMAL(10,2) NULL,
    [ColorSourceCode] NVARCHAR(60) NOT NULL,
    [TallaSourceCode] NVARCHAR(60) NOT NULL
  );

  INSERT INTO @VarianteSeed (
    [SKU], [SKUBase], [EAN], [Nombre], [PesoKg], [LargoCm], [AnchoCm], [AltoCm], [ColorSourceCode], [TallaSourceCode]
  )
  VALUES
    ('10C205692553-909', '10C205692553', '7702684266736', 'CAMISETA KOAJ BLANKS CF 147 TALLA XXS COLOR NEGRO', 0.250, 30, 25, 2, '909', 'XXS'),
    ('10C205692553-101', '10C205692553', '7702684266737', 'CAMISETA KOAJ BLANKS CF 147 TALLA XS COLOR BLANCO', 0.250, 30, 25, 2, '101', 'XS'),
    ('10C205692553-102', '10C205692553', '7702684266738', 'CAMISETA KOAJ BLANKS CF 147 TALLA S COLOR GRIS', 0.250, 30, 25, 2, '102', 'S'),
    ('20P118004112-909', '20P118004112', '7702685261001', 'PANTALON KOAJ REGULAR TALLA 30 COLOR NEGRO', 0.550, 35, 28, 4, '909', '30'),
    ('20P118004112-302', '20P118004112', '7702685261002', 'PANTALON KOAJ REGULAR TALLA 32 COLOR AZUL', 0.550, 35, 28, 4, '302', '32'),
    ('30J450011321-760', '30J450011321', '7702686262001', 'JEAN KOAJ SKINNY TALLA 10 COLOR INDIGO', 0.600, 36, 29, 4, '760', '10'),
    ('40B770020400-001', '40B770020400', '7702687263001', 'BUZO KOAJ CAPOTA TALLA M COLOR ROJO', 0.700, 33, 30, 6, '001', 'M'),
    ('50Z990031500-005', '50Z990031500', '7702688264001', 'ZAPATILLA KOAJ URBANA TALLA 38 COLOR BLANCO HUESO', 0.800, 32, 21, 12, '005', '38'),
    ('60C310044200-909', '60C310044200', '7702689265001', 'CAMISETA KOAJ GRAPHIC TALLA M COLOR NEGRO', 0.260, 31, 26, 2, '909', 'M'),
    ('60C310044200-101', '60C310044200', '7702689265002', 'CAMISETA KOAJ GRAPHIC TALLA L COLOR BLANCO', 0.260, 31, 26, 2, '101', 'L'),
    ('70P510055100-302', '70P510055100', '7702690266001', 'PANTALON KOAJ JOGGER TALLA 34 COLOR AZUL', 0.580, 36, 29, 4, '302', '34'),
    ('70P510055100-909', '70P510055100', '7702690266002', 'PANTALON KOAJ JOGGER TALLA 32 COLOR NEGRO', 0.580, 36, 29, 4, '909', '32'),
    ('80A210066700-760', '80A210066700', '7702691267001', 'CHAQUETA KOAJ DENIM TALLA L COLOR INDIGO', 0.950, 40, 34, 8, '760', 'L'),
    ('80A210066700-909', '80A210066700', '7702691267002', 'CHAQUETA KOAJ DENIM TALLA XL COLOR NEGRO', 0.950, 40, 34, 8, '909', 'XL'),
    ('90S880077900-005', '90S880077900', '7702692268001', 'SNEAKER KOAJ STREET TALLA 40 COLOR BLANCO HUESO', 0.880, 33, 22, 12, '005', '40'),
    ('90S880077900-440', '90S880077900', '7702692268002', 'SNEAKER KOAJ STREET TALLA 38 COLOR BEIGE', 0.880, 33, 22, 12, '440', '38');

  MERGE [oms].[ProductoVariante] AS tgt
  USING (
    SELECT
      @EmpresaId AS [EmpresaId],
      p.[ProductoId],
      s.[SKU],
      s.[EAN],
      s.[Nombre],
      s.[PesoKg],
      s.[LargoCm],
      s.[AnchoCm],
      s.[AltoCm]
    FROM @VarianteSeed s
    INNER JOIN [oms].[Producto] p
      ON p.[EmpresaId] = @EmpresaId
     AND p.[SKUBase] = s.[SKUBase]
  ) AS src
  ON tgt.[EmpresaId] = src.[EmpresaId]
     AND tgt.[SKU] = src.[SKU]
  WHEN MATCHED THEN
    UPDATE SET
      tgt.[ProductoId] = src.[ProductoId],
      tgt.[EAN] = src.[EAN],
      tgt.[Nombre] = src.[Nombre],
      tgt.[PesoKg] = src.[PesoKg],
      tgt.[LargoCm] = src.[LargoCm],
      tgt.[AnchoCm] = src.[AnchoCm],
      tgt.[AltoCm] = src.[AltoCm],
      tgt.[Activo] = 1,
      tgt.[UpdatedAt] = SYSUTCDATETIME()
  WHEN NOT MATCHED THEN
    INSERT (
      [EmpresaId],
      [ProductoId],
      [SKU],
      [EAN],
      [Nombre],
      [PesoKg],
      [LargoCm],
      [AnchoCm],
      [AltoCm],
      [Activo],
      [CreatedAt],
      [UpdatedAt]
    )
    VALUES (
      src.[EmpresaId],
      src.[ProductoId],
      src.[SKU],
      src.[EAN],
      src.[Nombre],
      src.[PesoKg],
      src.[LargoCm],
      src.[AnchoCm],
      src.[AltoCm],
      1,
      SYSUTCDATETIME(),
      NULL
    );

  ;WITH SeedRows AS (
    SELECT
      v.[VarianteId],
      vs.[ColorSourceCode],
      vs.[TallaSourceCode]
    FROM @VarianteSeed vs
    INNER JOIN [oms].[ProductoVariante] v
      ON v.[EmpresaId] = @EmpresaId
     AND v.[SKU] = vs.[SKU]
  ),
  Resolved AS (
    SELECT
      sr.[VarianteId],
      ac.[AtributoId] AS [AtributoColorId],
      at.[AtributoId] AS [AtributoTallaId],
      avc.[AtributoValorId] AS [ColorValorId],
      avt.[AtributoValorId] AS [TallaValorId]
    FROM SeedRows sr
    INNER JOIN [oms].[Atributo] ac
      ON ac.[EmpresaId] = @EmpresaId
     AND ac.[Codigo] = 'COLOR'
    INNER JOIN [oms].[Atributo] at
      ON at.[EmpresaId] = @EmpresaId
     AND at.[Codigo] = 'TALLA'
    INNER JOIN [oms].[Color] c
      ON c.[EmpresaId] = @EmpresaId
     AND c.[SourceCode] = sr.[ColorSourceCode]
    INNER JOIN [oms].[Talla] t
      ON t.[EmpresaId] = @EmpresaId
     AND t.[SourceCode] = sr.[TallaSourceCode]
    INNER JOIN [oms].[AtributoValor] avc
      ON avc.[AtributoId] = ac.[AtributoId]
     AND avc.[Valor] = c.[Nombre]
    INNER JOIN [oms].[AtributoValor] avt
      ON avt.[AtributoId] = at.[AtributoId]
     AND avt.[Valor] = t.[Nombre]
  ),
  AttributePairs AS (
    SELECT [VarianteId], [AtributoColorId] AS [AtributoId], [ColorValorId] AS [AtributoValorId]
    FROM Resolved
    UNION ALL
    SELECT [VarianteId], [AtributoTallaId] AS [AtributoId], [TallaValorId] AS [AtributoValorId]
    FROM Resolved
  )
  MERGE [oms].[VarianteAtributo] AS tgt
  USING AttributePairs AS src
  ON tgt.[VarianteId] = src.[VarianteId]
     AND tgt.[AtributoId] = src.[AtributoId]
  WHEN MATCHED AND tgt.[AtributoValorId] <> src.[AtributoValorId] THEN
    UPDATE SET tgt.[AtributoValorId] = src.[AtributoValorId]
  WHEN NOT MATCHED THEN
    INSERT (
      [VarianteId],
      [AtributoId],
      [AtributoValorId],
      [CreatedAt]
    )
    VALUES (
      src.[VarianteId],
      src.[AtributoId],
      src.[AtributoValorId],
      SYSUTCDATETIME()
    );

  DECLARE @InventarioSeed TABLE (
    [SKU] NVARCHAR(100) NOT NULL PRIMARY KEY,
    [Stock081] INT NOT NULL,
    [Stock198] INT NOT NULL,
    [StockReservado] INT NOT NULL
  );

  INSERT INTO @InventarioSeed ([SKU], [Stock081], [Stock198], [StockReservado])
  VALUES
    ('10C205692553-909', 35, 10, 0),
    ('10C205692553-101', 20, 5, 0),
    ('10C205692553-102', 18, 3, 0),
    ('20P118004112-909', 12, 8, 0),
    ('20P118004112-302', 15, 6, 0),
    ('30J450011321-760', 9, 9, 0),
    ('40B770020400-001', 14, 2, 0),
    ('50Z990031500-005', 11, 4, 0),
    ('60C310044200-909', 25, 7, 1),
    ('60C310044200-101', 16, 6, 1),
    ('70P510055100-302', 13, 5, 0),
    ('70P510055100-909', 10, 4, 0),
    ('80A210066700-760', 8, 3, 0),
    ('80A210066700-909', 6, 2, 0),
    ('90S880077900-005', 7, 3, 0),
    ('90S880077900-440', 5, 2, 0);

  ;WITH Base AS (
    SELECT
      v.[VarianteId],
      s.[Stock081],
      s.[Stock198],
      s.[StockReservado]
    FROM @InventarioSeed s
    INNER JOIN [oms].[ProductoVariante] v
      ON v.[EmpresaId] = @EmpresaId
     AND v.[SKU] = s.[SKU]
  ),
  Expanded AS (
    SELECT
      @EmpresaId AS [EmpresaId],
      @Bodega081Id AS [BodegaId],
      b.[VarianteId],
      b.[Stock081] AS [StockTotal],
      b.[StockReservado] AS [StockReservado]
    FROM Base b
    UNION ALL
    SELECT
      @EmpresaId AS [EmpresaId],
      @Bodega198Id AS [BodegaId],
      b.[VarianteId],
      b.[Stock198] AS [StockTotal],
      b.[StockReservado] AS [StockReservado]
    FROM Base b
  )
  MERGE [oms].[Inventario] AS tgt
  USING Expanded AS src
  ON tgt.[BodegaId] = src.[BodegaId]
     AND tgt.[VarianteId] = src.[VarianteId]
  WHEN MATCHED THEN
    UPDATE SET
      tgt.[EmpresaId] = src.[EmpresaId],
      tgt.[StockTotal] = src.[StockTotal],
      tgt.[StockReservado] = src.[StockReservado],
      tgt.[UpdatedAt] = SYSUTCDATETIME()
  WHEN NOT MATCHED THEN
    INSERT (
      [EmpresaId],
      [BodegaId],
      [VarianteId],
      [StockTotal],
      [StockReservado],
      [UpdatedAt]
    )
    VALUES (
      src.[EmpresaId],
      src.[BodegaId],
      src.[VarianteId],
      src.[StockTotal],
      src.[StockReservado],
      SYSUTCDATETIME()
    );

  COMMIT TRAN;

  SELECT 'Categoria' AS [Tabla], COUNT(1) AS [Filas] FROM [oms].[Categoria] WHERE [EmpresaId] = @EmpresaId
  UNION ALL SELECT 'Color', COUNT(1) FROM [oms].[Color] WHERE [EmpresaId] = @EmpresaId
  UNION ALL SELECT 'Talla', COUNT(1) FROM [oms].[Talla] WHERE [EmpresaId] = @EmpresaId
  UNION ALL SELECT 'Atributo', COUNT(1) FROM [oms].[Atributo] WHERE [EmpresaId] = @EmpresaId
  UNION ALL SELECT 'AtributoValor', COUNT(1)
    FROM [oms].[AtributoValor] av
    INNER JOIN [oms].[Atributo] a ON a.[AtributoId] = av.[AtributoId]
    WHERE a.[EmpresaId] = @EmpresaId
  UNION ALL SELECT 'Producto', COUNT(1) FROM [oms].[Producto] WHERE [EmpresaId] = @EmpresaId
  UNION ALL SELECT 'ProductoVariante', COUNT(1) FROM [oms].[ProductoVariante] WHERE [EmpresaId] = @EmpresaId
  UNION ALL SELECT 'VarianteAtributo', COUNT(1)
    FROM [oms].[VarianteAtributo] va
    INNER JOIN [oms].[ProductoVariante] v ON v.[VarianteId] = va.[VarianteId]
    WHERE v.[EmpresaId] = @EmpresaId
  UNION ALL SELECT 'Inventario', COUNT(1)
    FROM [oms].[Inventario] i
    INNER JOIN [oms].[ProductoVariante] v ON v.[VarianteId] = i.[VarianteId]
    WHERE v.[EmpresaId] = @EmpresaId;

END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRAN;
  THROW;
END CATCH;

