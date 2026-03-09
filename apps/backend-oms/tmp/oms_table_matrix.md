# OMS Table Matrix (Full)

GeneratedAt: 2026-03-09T20:09:13.273Z
Source: C:\OMS-DETALLE\oms-fronted\apps\backend-oms\tmp\db_schema_snapshot.json
Schema: oms
Tables: 38

## Summary

| Table | Rows | Cols | PK | FK Out | FK In | Indexes |
|---|---:|---:|---|---:|---:|---:|
| Atributo | 2 | 7 | AtributoId | 1 | 2 | 2 |
| AtributoValor | 22 | 7 | AtributoValorId | 1 | 1 | 2 |
| Bodega | 2 | 12 | BodegaId | 4 | 3 | 4 |
| CanalVenta | 25 | 8 | CanalVentaId | 1 | 2 | 3 |
| Categoria | 10 | 15 | CategoriaId | 2 | 2 | 4 |
| Ciudad | 3 | 7 | CiudadId | 1 | 6 | 2 |
| Color | 10 | 13 | ColorId | 1 | 0 | 5 |
| CostoTransporte | 2 | 15 | CostoTransporteId | 4 | 0 | 2 |
| DetallePedido | 0 | 18 | DetallePedidoId | 6 | 1 | 4 |
| Empresa | 5 | 13 | EmpresaId | 3 | 23 | 3 |
| EmpresaCliente | 0 | 12 | EmpresaClienteId | 3 | 1 | 2 |
| Estado | 14 | 9 | EstadoId | 0 | 4 | 3 |
| Integracion | 0 | 9 | IntegracionId | 2 | 0 | 2 |
| Inventario | 32 | 7 | InventarioId | 3 | 0 | 3 |
| InventarioReserva | 0 | 9 | InventarioReservaId | 4 | 0 | 3 |
| ListaPrecio | 0 | 9 | ListaPrecioId | 2 | 1 | 2 |
| Log | 35 | 13 | LogId | 2 | 0 | 4 |
| Moneda | 3 | 7 | MonedaId | 0 | 4 | 2 |
| OfertaPrecio | 0 | 9 | OfertaPrecioId | 1 | 1 | 3 |
| OfertaPrecioDetalle | 0 | 8 | OfertaPrecioDetalleId | 2 | 0 | 3 |
| Pais | 5 | 6 | PaisId | 0 | 7 | 2 |
| PasarelaPago | 0 | 8 | PasarelaPagoId | 1 | 1 | 2 |
| Pedido | 105 | 28 | PedidoId | 10 | 2 | 6 |
| PedidoEstadoHistorial | 37 | 6 | PedidoEstadoHistorialId | 3 | 0 | 2 |
| Perfil | 4 | 5 | PerfilId | 0 | 1 | 2 |
| PrecioVariante | 0 | 9 | PrecioVarianteId | 2 | 0 | 3 |
| Producto | 10 | 10 | ProductoId | 2 | 2 | 3 |
| ProductoTexto | 0 | 11 | ProductoTextoId | 1 | 0 | 4 |
| ProductoVariante | 16 | 13 | VarianteId | 2 | 7 | 3 |
| Talla | 12 | 9 | TallaId | 1 | 0 | 4 |
| TarifaPrecio | 0 | 10 | TarifaPrecioId | 1 | 2 | 2 |
| TarifaPrecioDetalle | 0 | 8 | TarifaPrecioDetalleId | 2 | 0 | 3 |
| Tienda | 2 | 12 | TiendaId | 3 | 2 | 2 |
| Transportadora | 1 | 8 | TransportadoraId | 1 | 2 | 2 |
| Usuario | 5 | 11 | UsuarioId | 2 | 2 | 3 |
| VarianteAtributo | 32 | 4 | VarianteId, AtributoId | 3 | 0 | 2 |
| ZonaCiudad | 3 | 2 | ZonaTransporteId, CiudadId | 2 | 0 | 1 |
| ZonaTransporte | 2 | 8 | ZonaTransporteId | 2 | 2 | 2 |

## [oms].Atributo

- Rows: 2
- Columns: 7
- PK: AtributoId
- FK Out: 1
- FK In: 2
- Indexes: 2

### FK Out
- EmpresaId -> oms.Empresa.EmpresaId (FK_Atr_Empresa)

### FK In
- oms.AtributoValor.AtributoId -> oms.Atributo.AtributoId (FK_AtrVal_Atr)
- oms.VarianteAtributo.AtributoId -> oms.Atributo.AtributoId (FK_VA_Atr)

### Columns

| # | Column | Type | Null | Identity | Default |
|---:|---|---|---|---|---|
| 1 | AtributoId | int | NO | YES | - |
| 2 | EmpresaId | int | NO | NO | - |
| 3 | Codigo | nvarchar(120) | NO | NO | - |
| 4 | Nombre | nvarchar(240) | NO | NO | - |
| 5 | Tipo | nvarchar(40) | NO | NO | ('LISTA') |
| 6 | CreatedAt | datetime2 | NO | NO | (sysutcdatetime()) |
| 7 | UpdatedAt | datetime2 | YES | NO | - |

### Indexes
- PK__Atributo__8AB1659A00B1E3C5 [PK, UQ] (CLUSTERED): AtributoId
- UX_Atr_EmpresaCodigo [UQ] (NONCLUSTERED): EmpresaId, Codigo

## [oms].AtributoValor

- Rows: 22
- Columns: 7
- PK: AtributoValorId
- FK Out: 1
- FK In: 1
- Indexes: 2

### FK Out
- AtributoId -> oms.Atributo.AtributoId (FK_AtrVal_Atr)

### FK In
- oms.VarianteAtributo.AtributoValorId -> oms.AtributoValor.AtributoValorId (FK_VA_Val)

### Columns

| # | Column | Type | Null | Identity | Default |
|---:|---|---|---|---|---|
| 1 | AtributoValorId | int | NO | YES | - |
| 2 | AtributoId | int | NO | NO | - |
| 3 | Codigo | nvarchar(160) | YES | NO | - |
| 4 | Valor | nvarchar(320) | NO | NO | - |
| 5 | Orden | int | NO | NO | ((0)) |
| 6 | CreatedAt | datetime2 | NO | NO | (sysutcdatetime()) |
| 7 | UpdatedAt | datetime2 | YES | NO | - |

### Indexes
- PK__Atributo__F91EB8A3DDB4C49E [PK, UQ] (CLUSTERED): AtributoValorId
- UX_AtrVal_Unico [UQ] (NONCLUSTERED): AtributoId, Valor

## [oms].Bodega

- Rows: 2
- Columns: 12
- PK: BodegaId
- FK Out: 4
- FK In: 3
- Indexes: 4

### FK Out
- CiudadId -> oms.Ciudad.CiudadId (FK_Bod_Ciudad)
- EmpresaId -> oms.Empresa.EmpresaId (FK_Bod_Empresa)
- PaisId -> oms.Pais.PaisId (FK_Bod_Pais)
- TiendaId -> oms.Tienda.TiendaId (FK_Bod_Tienda)

### FK In
- oms.DetallePedido.BodegaFulfillmentId -> oms.Bodega.BodegaId (FK_DP_Bodega)
- oms.Inventario.BodegaId -> oms.Bodega.BodegaId (FK_Inv_Bodega)
- oms.InventarioReserva.BodegaId -> oms.Bodega.BodegaId (FK_Res_Bodega)

### Columns

| # | Column | Type | Null | Identity | Default |
|---:|---|---|---|---|---|
| 1 | BodegaId | int | NO | YES | - |
| 2 | EmpresaId | int | NO | NO | - |
| 3 | Codigo | nvarchar(120) | NO | NO | - |
| 4 | Nombre | nvarchar(360) | NO | NO | - |
| 5 | Tipo | nvarchar(40) | NO | NO | - |
| 6 | TiendaId | int | YES | NO | - |
| 7 | PaisId | int | YES | NO | - |
| 8 | CiudadId | int | YES | NO | - |
| 9 | Direccion | nvarchar(510) | YES | NO | - |
| 10 | Activo | bit | NO | NO | ((1)) |
| 11 | CreatedAt | datetime2 | NO | NO | (sysutcdatetime()) |
| 12 | UpdatedAt | datetime2 | YES | NO | - |

### Indexes
- PK__Bodega__37A29A95A79EEEA2 [PK, UQ] (CLUSTERED): BodegaId
- UX_Bodega_EmpresaCodigo [UQ] (NONCLUSTERED): EmpresaId, Codigo
- IX_Bodega_Tienda  (NONCLUSTERED): TiendaId
- IX_Bodega_Tipo  (NONCLUSTERED): Tipo

## [oms].CanalVenta

- Rows: 25
- Columns: 8
- PK: CanalVentaId
- FK Out: 1
- FK In: 2
- Indexes: 3

### FK Out
- EmpresaId -> oms.Empresa.EmpresaId (FK_Canal_Empresa)

### FK In
- oms.Integracion.CanalVentaId -> oms.CanalVenta.CanalVentaId (FK_Int_Canal)
- oms.Pedido.CanalVentaId -> oms.CanalVenta.CanalVentaId (FK_Ped_Canal)

### Columns

| # | Column | Type | Null | Identity | Default |
|---:|---|---|---|---|---|
| 1 | CanalVentaId | int | NO | YES | - |
| 2 | EmpresaId | int | NO | NO | - |
| 3 | Codigo | nvarchar(100) | NO | NO | - |
| 4 | Nombre | nvarchar(240) | NO | NO | - |
| 5 | Tipo | nvarchar(60) | NO | NO | - |
| 6 | Estado | nvarchar(40) | NO | NO | ('ACTIVO') |
| 7 | CreatedAt | datetime2 | NO | NO | (sysutcdatetime()) |
| 8 | UpdatedAt | datetime2 | YES | NO | - |

### Indexes
- PK__CanalVen__5DF055E7F67DE824 [PK, UQ] (CLUSTERED): CanalVentaId
- UX_Canal_EmpresaCodigo [UQ] (NONCLUSTERED): EmpresaId, Codigo
- IX_Canal_Tipo  (NONCLUSTERED): Tipo

## [oms].Categoria

- Rows: 10
- Columns: 15
- PK: CategoriaId
- FK Out: 2
- FK In: 2
- Indexes: 4

### FK Out
- EmpresaId -> oms.Empresa.EmpresaId (FK_Cat_Empresa)
- ParentId -> oms.Categoria.CategoriaId (FK_Cat_Parent)

### FK In
- oms.Categoria.ParentId -> oms.Categoria.CategoriaId (FK_Cat_Parent)
- oms.Producto.CategoriaId -> oms.Categoria.CategoriaId (FK_Prod_Cat)

### Columns

| # | Column | Type | Null | Identity | Default |
|---:|---|---|---|---|---|
| 1 | CategoriaId | int | NO | YES | - |
| 2 | EmpresaId | int | NO | NO | - |
| 3 | ParentId | int | YES | NO | - |
| 4 | Codigo | nvarchar(160) | YES | NO | - |
| 5 | Nombre | nvarchar(360) | NO | NO | - |
| 6 | Activo | bit | NO | NO | ((1)) |
| 7 | CreatedAt | datetime2 | NO | NO | (sysutcdatetime()) |
| 8 | UpdatedAt | datetime2 | YES | NO | - |
| 9 | ExternalCategoryId | int | YES | NO | - |
| 10 | ExternalParentId | int | YES | NO | - |
| 11 | Level | nvarchar(40) | YES | NO | - |
| 12 | SourceTs | datetime2 | YES | NO | - |
| 13 | IsActiveExternal | bit | YES | NO | - |
| 14 | ApiSuccess | bit | YES | NO | - |
| 15 | ApiStatusCode | int | YES | NO | - |

### Indexes
- PK__Categori__F353C1E549540E11 [PK, UQ] (CLUSTERED): CategoriaId
- UX_Categoria_Empresa_ExternalId [UQ] (NONCLUSTERED): EmpresaId, ExternalCategoryId
- IX_Cat_Empresa  (NONCLUSTERED): EmpresaId
- IX_Categoria_Empresa_ExternalParent  (NONCLUSTERED): EmpresaId, ExternalParentId

## [oms].Ciudad

- Rows: 3
- Columns: 7
- PK: CiudadId
- FK Out: 1
- FK In: 6
- Indexes: 2

### FK Out
- PaisId -> oms.Pais.PaisId (FK_Ciudad_Pais)

### FK In
- oms.Bodega.CiudadId -> oms.Ciudad.CiudadId (FK_Bod_Ciudad)
- oms.EmpresaCliente.CiudadId -> oms.Ciudad.CiudadId (FK_EmpCli_Ciudad)
- oms.Empresa.CiudadId -> oms.Ciudad.CiudadId (FK_Empresa_Ciudad)
- oms.Pedido.ShippingCiudadId -> oms.Ciudad.CiudadId (FK_Ped_ShipCiudad)
- oms.Tienda.CiudadId -> oms.Ciudad.CiudadId (FK_Tienda_Ciudad)
- oms.ZonaCiudad.CiudadId -> oms.Ciudad.CiudadId (FK_ZC_Ciudad)

### Columns

| # | Column | Type | Null | Identity | Default |
|---:|---|---|---|---|---|
| 1 | CiudadId | int | NO | YES | - |
| 2 | PaisId | int | NO | NO | - |
| 3 | Nombre | nvarchar(320) | NO | NO | - |
| 4 | Departamento | nvarchar(320) | YES | NO | - |
| 5 | Codigo | nvarchar(100) | YES | NO | - |
| 6 | CreatedAt | datetime2 | NO | NO | (sysutcdatetime()) |
| 7 | UpdatedAt | datetime2 | YES | NO | - |

### Indexes
- PK__Ciudad__E826E7700D26A05B [PK, UQ] (CLUSTERED): CiudadId
- IX_Ciudad_Nombre  (NONCLUSTERED): Nombre

## [oms].Color

- Rows: 10
- Columns: 13
- PK: ColorId
- FK Out: 1
- FK In: 0
- Indexes: 5

### FK Out
- EmpresaId -> oms.Empresa.EmpresaId (FK_Color_Empresa)

### FK In
- None

### Columns

| # | Column | Type | Null | Identity | Default |
|---:|---|---|---|---|---|
| 1 | ColorId | int | NO | YES | - |
| 2 | EmpresaId | int | NO | NO | - |
| 3 | ExternalColorId | int | YES | NO | - |
| 4 | CompanyID | int | YES | NO | - |
| 5 | SourceCode | nvarchar(120) | NO | NO | - |
| 6 | Nombre | nvarchar(400) | NO | NO | - |
| 7 | IsActive | bit | NO | NO | ((1)) |
| 8 | IsMaterial | bit | NO | NO | ((0)) |
| 9 | SourceTs | datetime2 | YES | NO | - |
| 10 | ApiSuccess | bit | YES | NO | - |
| 11 | ApiStatusCode | int | YES | NO | - |
| 12 | CreatedAt | datetime2 | NO | NO | (sysutcdatetime()) |
| 13 | UpdatedAt | datetime2 | YES | NO | - |

### Indexes
- PK__Color__8DA7674D83B5D39C [PK, UQ] (CLUSTERED): ColorId
- UX_Color_Empresa_ExternalId [UQ] (NONCLUSTERED): EmpresaId, ExternalColorId
- UX_Color_Empresa_SourceCode [UQ] (NONCLUSTERED): EmpresaId, SourceCode
- IX_Color_Activo  (NONCLUSTERED): EmpresaId, IsActive
- IX_Color_Nombre  (NONCLUSTERED): Nombre

## [oms].CostoTransporte

- Rows: 2
- Columns: 15
- PK: CostoTransporteId
- FK Out: 4
- FK In: 0
- Indexes: 2

### FK Out
- EmpresaId -> oms.Empresa.EmpresaId (FK_CT_Empresa)
- MonedaId -> oms.Moneda.MonedaId (FK_CT_Moneda)
- TransportadoraId -> oms.Transportadora.TransportadoraId (FK_CT_Transp)
- ZonaTransporteId -> oms.ZonaTransporte.ZonaTransporteId (FK_CT_Zona)

### FK In
- None

### Columns

| # | Column | Type | Null | Identity | Default |
|---:|---|---|---|---|---|
| 1 | CostoTransporteId | bigint | NO | YES | - |
| 2 | EmpresaId | int | NO | NO | - |
| 3 | ZonaTransporteId | int | NO | NO | - |
| 4 | TransportadoraId | int | NO | NO | - |
| 5 | MonedaId | int | NO | NO | - |
| 6 | PesoMinKg | decimal(10,3) | YES | NO | - |
| 7 | PesoMaxKg | decimal(10,3) | YES | NO | - |
| 8 | ValorMin | decimal(18,2) | YES | NO | - |
| 9 | ValorMax | decimal(18,2) | YES | NO | - |
| 10 | Costo | decimal(18,2) | NO | NO | - |
| 11 | DiasMin | int | YES | NO | - |
| 12 | DiasMax | int | YES | NO | - |
| 13 | Activo | bit | NO | NO | ((1)) |
| 14 | CreatedAt | datetime2 | NO | NO | (sysutcdatetime()) |
| 15 | UpdatedAt | datetime2 | YES | NO | - |

### Indexes
- PK__CostoTra__5B833EFF52F879AC [PK, UQ] (CLUSTERED): CostoTransporteId
- IX_CT_Lookup  (NONCLUSTERED): ZonaTransporteId, TransportadoraId, Activo

## [oms].DetallePedido

- Rows: 0
- Columns: 18
- PK: DetallePedidoId
- FK Out: 6
- FK In: 1
- Indexes: 4

### FK Out
- BodegaFulfillmentId -> oms.Bodega.BodegaId (FK_DP_Bodega)
- EmpresaId -> oms.Empresa.EmpresaId (FK_DP_Empresa)
- EstadoId -> oms.Estado.EstadoId (FK_DP_Estado)
- PedidoId -> oms.Pedido.PedidoId (FK_DP_Pedido)
- TransportadoraId -> oms.Transportadora.TransportadoraId (FK_DP_Transp)
- VarianteId -> oms.ProductoVariante.VarianteId (FK_DP_Var)

### FK In
- oms.InventarioReserva.DetallePedidoId -> oms.DetallePedido.DetallePedidoId (FK_Res_Detalle)

### Columns

| # | Column | Type | Null | Identity | Default |
|---:|---|---|---|---|---|
| 1 | DetallePedidoId | bigint | NO | YES | - |
| 2 | PedidoId | bigint | NO | NO | - |
| 3 | EmpresaId | int | NO | NO | - |
| 4 | VarianteId | bigint | NO | NO | - |
| 5 | SKU | nvarchar(200) | NO | NO | - |
| 6 | NombreItem | nvarchar(440) | NO | NO | - |
| 7 | Cantidad | int | NO | NO | - |
| 8 | PrecioUnitario | decimal(18,2) | NO | NO | - |
| 9 | DescuentoUnitario | decimal(18,2) | NO | NO | ((0)) |
| 10 | ImpuestoUnitario | decimal(18,2) | NO | NO | ((0)) |
| 11 | TotalLinea | decimal(18,2) | NO | NO | - |
| 12 | BodegaFulfillmentId | int | YES | NO | - |
| 13 | FulfillmentEstado | nvarchar(40) | NO | NO | ('PENDIENTE') |
| 14 | Guia | nvarchar(240) | YES | NO | - |
| 15 | TransportadoraId | int | YES | NO | - |
| 16 | EstadoId | int | YES | NO | - |
| 17 | CreatedAt | datetime2 | NO | NO | (sysutcdatetime()) |
| 18 | UpdatedAt | datetime2 | YES | NO | - |

### Indexes
- PK__DetalleP__6ED21C21195AB228 [PK, UQ] (CLUSTERED): DetallePedidoId
- IX_DP_FullEstado  (NONCLUSTERED): FulfillmentEstado
- IX_DP_Pedido  (NONCLUSTERED): PedidoId
- IX_DP_Variante  (NONCLUSTERED): VarianteId

## [oms].Empresa

- Rows: 5
- Columns: 13
- PK: EmpresaId
- FK Out: 3
- FK In: 23
- Indexes: 3

### FK Out
- CiudadId -> oms.Ciudad.CiudadId (FK_Empresa_Ciudad)
- MonedaId -> oms.Moneda.MonedaId (FK_Empresa_Moneda)
- PaisId -> oms.Pais.PaisId (FK_Empresa_Pais)

### FK In
- oms.Atributo.EmpresaId -> oms.Empresa.EmpresaId (FK_Atr_Empresa)
- oms.Bodega.EmpresaId -> oms.Empresa.EmpresaId (FK_Bod_Empresa)
- oms.CanalVenta.EmpresaId -> oms.Empresa.EmpresaId (FK_Canal_Empresa)
- oms.Categoria.EmpresaId -> oms.Empresa.EmpresaId (FK_Cat_Empresa)
- oms.Color.EmpresaId -> oms.Empresa.EmpresaId (FK_Color_Empresa)
- oms.CostoTransporte.EmpresaId -> oms.Empresa.EmpresaId (FK_CT_Empresa)
- oms.DetallePedido.EmpresaId -> oms.Empresa.EmpresaId (FK_DP_Empresa)
- oms.EmpresaCliente.EmpresaId -> oms.Empresa.EmpresaId (FK_EmpCli_Empresa)
- oms.Integracion.EmpresaId -> oms.Empresa.EmpresaId (FK_Int_Empresa)
- oms.Inventario.EmpresaId -> oms.Empresa.EmpresaId (FK_Inv_Empresa)
- oms.Log.EmpresaId -> oms.Empresa.EmpresaId (FK_Log_Empresa)
- oms.ListaPrecio.EmpresaId -> oms.Empresa.EmpresaId (FK_LP_Empresa)
- oms.PasarelaPago.EmpresaId -> oms.Empresa.EmpresaId (FK_Pasarela_Empresa)
- oms.Pedido.EmpresaId -> oms.Empresa.EmpresaId (FK_Ped_Empresa)
- oms.Producto.EmpresaId -> oms.Empresa.EmpresaId (FK_Prod_Empresa)
- oms.InventarioReserva.EmpresaId -> oms.Empresa.EmpresaId (FK_Res_Empresa)
- oms.Talla.EmpresaId -> oms.Empresa.EmpresaId (FK_Talla_Empresa)
- oms.TarifaPrecio.EmpresaId -> oms.Empresa.EmpresaId (FK_Tarifa_Empresa)
- oms.Tienda.EmpresaId -> oms.Empresa.EmpresaId (FK_Tienda_Empresa)
- oms.Transportadora.EmpresaId -> oms.Empresa.EmpresaId (FK_Transp_Empresa)
- oms.Usuario.EmpresaId -> oms.Empresa.EmpresaId (FK_Usuario_Empresa)
- oms.ProductoVariante.EmpresaId -> oms.Empresa.EmpresaId (FK_Var_Empresa)
- oms.ZonaTransporte.EmpresaId -> oms.Empresa.EmpresaId (FK_Zona_Empresa)

### Columns

| # | Column | Type | Null | Identity | Default |
|---:|---|---|---|---|---|
| 1 | EmpresaId | int | NO | YES | - |
| 2 | Codigo | nvarchar(60) | NO | NO | - |
| 3 | Nombre | nvarchar(360) | NO | NO | - |
| 4 | Nit | nvarchar(80) | YES | NO | - |
| 5 | Email | nvarchar(360) | YES | NO | - |
| 6 | Telefono | nvarchar(100) | YES | NO | - |
| 7 | PaisId | int | YES | NO | - |
| 8 | CiudadId | int | YES | NO | - |
| 9 | Direccion | nvarchar(510) | YES | NO | - |
| 10 | MonedaId | int | NO | NO | - |
| 11 | Estado | nvarchar(40) | NO | NO | ('ACTIVA') |
| 12 | CreatedAt | datetime2 | NO | NO | (sysutcdatetime()) |
| 13 | UpdatedAt | datetime2 | YES | NO | - |

### Indexes
- PK__Empresa__7B9F21164D516FA0 [PK, UQ] (CLUSTERED): EmpresaId
- UX_Empresa_Codigo [UQ] (NONCLUSTERED): Codigo
- IX_Empresa_Pais  (NONCLUSTERED): PaisId

## [oms].EmpresaCliente

- Rows: 0
- Columns: 12
- PK: EmpresaClienteId
- FK Out: 3
- FK In: 1
- Indexes: 2

### FK Out
- CiudadId -> oms.Ciudad.CiudadId (FK_EmpCli_Ciudad)
- EmpresaId -> oms.Empresa.EmpresaId (FK_EmpCli_Empresa)
- PaisId -> oms.Pais.PaisId (FK_EmpCli_Pais)

### FK In
- oms.Pedido.EmpresaClienteId -> oms.EmpresaCliente.EmpresaClienteId (FK_Ped_EmpCli)

### Columns

| # | Column | Type | Null | Identity | Default |
|---:|---|---|---|---|---|
| 1 | EmpresaClienteId | int | NO | YES | - |
| 2 | EmpresaId | int | NO | NO | - |
| 3 | Nombre | nvarchar(360) | NO | NO | - |
| 4 | Documento | nvarchar(120) | YES | NO | - |
| 5 | Email | nvarchar(360) | YES | NO | - |
| 6 | Telefono | nvarchar(100) | YES | NO | - |
| 7 | PaisId | int | YES | NO | - |
| 8 | CiudadId | int | YES | NO | - |
| 9 | Direccion | nvarchar(510) | YES | NO | - |
| 10 | Estado | nvarchar(40) | NO | NO | ('ACTIVA') |
| 11 | CreatedAt | datetime2 | NO | NO | (sysutcdatetime()) |
| 12 | UpdatedAt | datetime2 | YES | NO | - |

### Indexes
- PK__EmpresaC__C00439F13A04C137 [PK, UQ] (CLUSTERED): EmpresaClienteId
- IX_EmpCli_Empresa  (NONCLUSTERED): EmpresaId

## [oms].Estado

- Rows: 14
- Columns: 9
- PK: EstadoId
- FK Out: 0
- FK In: 4
- Indexes: 3

### FK Out
- None

### FK In
- oms.DetallePedido.EstadoId -> oms.Estado.EstadoId (FK_DP_Estado)
- oms.Pedido.EstadoId -> oms.Estado.EstadoId (FK_Ped_Estado)
- oms.Pedido.PagoEstadoId -> oms.Estado.EstadoId (FK_Ped_PagoEstado)
- oms.PedidoEstadoHistorial.EstadoId -> oms.Estado.EstadoId (FK_PEH_Estado)

### Columns

| # | Column | Type | Null | Identity | Default |
|---:|---|---|---|---|---|
| 1 | EstadoId | int | NO | YES | - |
| 2 | Entidad | nvarchar(60) | NO | NO | - |
| 3 | Codigo | nvarchar(120) | NO | NO | - |
| 4 | Nombre | nvarchar(240) | NO | NO | - |
| 5 | Orden | int | NO | NO | ((0)) |
| 6 | EsFinal | bit | NO | NO | ((0)) |
| 7 | Activo | bit | NO | NO | ((1)) |
| 8 | CreatedAt | datetime2 | NO | NO | (sysutcdatetime()) |
| 9 | UpdatedAt | datetime2 | YES | NO | - |

### Indexes
- PK__Estado__FEF86B0047F30247 [PK, UQ] (CLUSTERED): EstadoId
- UX_Estado_EntidadCodigo [UQ] (NONCLUSTERED): Entidad, Codigo
- IX_Estado_EntidadOrden  (NONCLUSTERED): Entidad, Orden

## [oms].Integracion

- Rows: 0
- Columns: 9
- PK: IntegracionId
- FK Out: 2
- FK In: 0
- Indexes: 2

### FK Out
- CanalVentaId -> oms.CanalVenta.CanalVentaId (FK_Int_Canal)
- EmpresaId -> oms.Empresa.EmpresaId (FK_Int_Empresa)

### FK In
- None

### Columns

| # | Column | Type | Null | Identity | Default |
|---:|---|---|---|---|---|
| 1 | IntegracionId | int | NO | YES | - |
| 2 | EmpresaId | int | NO | NO | - |
| 3 | CanalVentaId | int | NO | NO | - |
| 4 | Codigo | nvarchar(120) | NO | NO | - |
| 5 | Nombre | nvarchar(240) | NO | NO | - |
| 6 | ConfigJson | nvarchar(max) | YES | NO | - |
| 7 | Estado | nvarchar(40) | NO | NO | ('ACTIVO') |
| 8 | CreatedAt | datetime2 | NO | NO | (sysutcdatetime()) |
| 9 | UpdatedAt | datetime2 | YES | NO | - |

### Indexes
- PK__Integrac__15D76D392C4AC223 [PK, UQ] (CLUSTERED): IntegracionId
- UX_Int_EmpresaCodigo [UQ] (NONCLUSTERED): EmpresaId, Codigo

## [oms].Inventario

- Rows: 32
- Columns: 7
- PK: InventarioId
- FK Out: 3
- FK In: 0
- Indexes: 3

### FK Out
- BodegaId -> oms.Bodega.BodegaId (FK_Inv_Bodega)
- EmpresaId -> oms.Empresa.EmpresaId (FK_Inv_Empresa)
- VarianteId -> oms.ProductoVariante.VarianteId (FK_Inv_Variante)

### FK In
- None

### Columns

| # | Column | Type | Null | Identity | Default |
|---:|---|---|---|---|---|
| 1 | InventarioId | bigint | NO | YES | - |
| 2 | EmpresaId | int | NO | NO | - |
| 3 | BodegaId | int | NO | NO | - |
| 4 | VarianteId | bigint | NO | NO | - |
| 5 | StockTotal | int | NO | NO | ((0)) |
| 6 | StockReservado | int | NO | NO | ((0)) |
| 7 | UpdatedAt | datetime2 | NO | NO | (sysutcdatetime()) |

### Indexes
- PK__Inventar__FB8A24D742882112 [PK, UQ] (CLUSTERED): InventarioId
- UX_Inv_BodegaVar [UQ] (NONCLUSTERED): BodegaId, VarianteId
- IX_Inv_Variante  (NONCLUSTERED): VarianteId

## [oms].InventarioReserva

- Rows: 0
- Columns: 9
- PK: InventarioReservaId
- FK Out: 4
- FK In: 0
- Indexes: 3

### FK Out
- BodegaId -> oms.Bodega.BodegaId (FK_Res_Bodega)
- DetallePedidoId -> oms.DetallePedido.DetallePedidoId (FK_Res_Detalle)
- EmpresaId -> oms.Empresa.EmpresaId (FK_Res_Empresa)
- VarianteId -> oms.ProductoVariante.VarianteId (FK_Res_Variante)

### FK In
- None

### Columns

| # | Column | Type | Null | Identity | Default |
|---:|---|---|---|---|---|
| 1 | InventarioReservaId | bigint | NO | YES | - |
| 2 | EmpresaId | int | NO | NO | - |
| 3 | BodegaId | int | NO | NO | - |
| 4 | VarianteId | bigint | NO | NO | - |
| 5 | DetallePedidoId | bigint | NO | NO | - |
| 6 | Cantidad | int | NO | NO | - |
| 7 | Estado | nvarchar(40) | NO | NO | ('ACTIVA') |
| 8 | CreatedAt | datetime2 | NO | NO | (sysutcdatetime()) |
| 9 | UpdatedAt | datetime2 | YES | NO | - |

### Indexes
- PK__Inventar__65170DCC2159334F [PK, UQ] (CLUSTERED): InventarioReservaId
- IX_Res_Detalle  (NONCLUSTERED): DetallePedidoId
- IX_Res_Lookup  (NONCLUSTERED): BodegaId, VarianteId, Estado

## [oms].ListaPrecio

- Rows: 0
- Columns: 9
- PK: ListaPrecioId
- FK Out: 2
- FK In: 1
- Indexes: 2

### FK Out
- EmpresaId -> oms.Empresa.EmpresaId (FK_LP_Empresa)
- MonedaId -> oms.Moneda.MonedaId (FK_LP_Moneda)

### FK In
- oms.PrecioVariante.ListaPrecioId -> oms.ListaPrecio.ListaPrecioId (FK_PV_LP)

### Columns

| # | Column | Type | Null | Identity | Default |
|---:|---|---|---|---|---|
| 1 | ListaPrecioId | int | NO | YES | - |
| 2 | EmpresaId | int | NO | NO | - |
| 3 | Codigo | nvarchar(120) | NO | NO | - |
| 4 | Nombre | nvarchar(240) | NO | NO | - |
| 5 | MonedaId | int | NO | NO | - |
| 6 | IncluyeImpuestos | bit | NO | NO | ((1)) |
| 7 | Activo | bit | NO | NO | ((1)) |
| 8 | CreatedAt | datetime2 | NO | NO | (sysutcdatetime()) |
| 9 | UpdatedAt | datetime2 | YES | NO | - |

### Indexes
- PK__ListaPre__44C04A8FAC79A8FE [PK, UQ] (CLUSTERED): ListaPrecioId
- UX_LP_EmpresaCodigo [UQ] (NONCLUSTERED): EmpresaId, Codigo

## [oms].Log

- Rows: 35
- Columns: 13
- PK: LogId
- FK Out: 2
- FK In: 0
- Indexes: 4

### FK Out
- EmpresaId -> oms.Empresa.EmpresaId (FK_Log_Empresa)
- UsuarioId -> oms.Usuario.UsuarioId (FK_Log_Usuario)

### FK In
- None

### Columns

| # | Column | Type | Null | Identity | Default |
|---:|---|---|---|---|---|
| 1 | LogId | bigint | NO | YES | - |
| 2 | EmpresaId | int | YES | NO | - |
| 3 | UsuarioId | int | YES | NO | - |
| 4 | Nivel | nvarchar(20) | NO | NO | - |
| 5 | Modulo | nvarchar(160) | NO | NO | - |
| 6 | Accion | nvarchar(240) | NO | NO | - |
| 7 | Entidad | nvarchar(160) | YES | NO | - |
| 8 | EntidadId | bigint | YES | NO | - |
| 9 | Mensaje | nvarchar(510) | YES | NO | - |
| 10 | DataJson | nvarchar(max) | YES | NO | - |
| 11 | Ip | nvarchar(90) | YES | NO | - |
| 12 | UserAgent | nvarchar(510) | YES | NO | - |
| 13 | CreatedAt | datetime2 | NO | NO | (sysutcdatetime()) |

### Indexes
- PK__Log__5E548648EECBEC78 [PK, UQ] (CLUSTERED): LogId
- IX_Log_Entidad  (NONCLUSTERED): Entidad, EntidadId
- IX_Log_Fecha  (NONCLUSTERED): CreatedAt
- IX_Log_Modulo  (NONCLUSTERED): Modulo

## [oms].Moneda

- Rows: 3
- Columns: 7
- PK: MonedaId
- FK Out: 0
- FK In: 4
- Indexes: 2

### FK Out
- None

### FK In
- oms.CostoTransporte.MonedaId -> oms.Moneda.MonedaId (FK_CT_Moneda)
- oms.Empresa.MonedaId -> oms.Moneda.MonedaId (FK_Empresa_Moneda)
- oms.ListaPrecio.MonedaId -> oms.Moneda.MonedaId (FK_LP_Moneda)
- oms.Pedido.MonedaId -> oms.Moneda.MonedaId (FK_Ped_Moneda)

### Columns

| # | Column | Type | Null | Identity | Default |
|---:|---|---|---|---|---|
| 1 | MonedaId | int | NO | YES | - |
| 2 | Codigo | char(3) | NO | NO | - |
| 3 | Simbolo | nvarchar(20) | YES | NO | - |
| 4 | Nombre | nvarchar(120) | NO | NO | - |
| 5 | Decimales | tinyint | NO | NO | ((2)) |
| 6 | CreatedAt | datetime2 | NO | NO | (sysutcdatetime()) |
| 7 | UpdatedAt | datetime2 | YES | NO | - |

### Indexes
- PK__Moneda__CEEBACBE0DF0515C [PK, UQ] (CLUSTERED): MonedaId
- UX_Moneda_Codigo [UQ] (NONCLUSTERED): Codigo

## [oms].OfertaPrecio

- Rows: 0
- Columns: 9
- PK: OfertaPrecioId
- FK Out: 1
- FK In: 1
- Indexes: 3

### FK Out
- TarifaPrecioId -> oms.TarifaPrecio.TarifaPrecioId (FK_Oferta_Tarifa)

### FK In
- oms.OfertaPrecioDetalle.OfertaPrecioId -> oms.OfertaPrecio.OfertaPrecioId (FK_OPD_Oferta)

### Columns

| # | Column | Type | Null | Identity | Default |
|---:|---|---|---|---|---|
| 1 | OfertaPrecioId | bigint | NO | YES | - |
| 2 | TarifaPrecioId | bigint | NO | NO | - |
| 3 | ExternalOfertaId | nvarchar(120) | NO | NO | - |
| 4 | FechaInicio | date | NO | NO | - |
| 5 | FechaFin | date | NO | NO | - |
| 6 | PrecioBase | decimal(18,2) | YES | NO | - |
| 7 | Activo | bit | NO | NO | ((1)) |
| 8 | CreatedAt | datetime2 | NO | NO | (sysutcdatetime()) |
| 9 | UpdatedAt | datetime2 | YES | NO | - |

### Indexes
- PK__OfertaPr__E85F92FF29F8A6FE [PK, UQ] (CLUSTERED): OfertaPrecioId
- UX_Oferta_Tarifa_Oferta [UQ] (NONCLUSTERED): TarifaPrecioId, ExternalOfertaId, FechaInicio, FechaFin
- IX_Oferta_Vigencia  (NONCLUSTERED): FechaInicio, FechaFin

## [oms].OfertaPrecioDetalle

- Rows: 0
- Columns: 8
- PK: OfertaPrecioDetalleId
- FK Out: 2
- FK In: 0
- Indexes: 3

### FK Out
- OfertaPrecioId -> oms.OfertaPrecio.OfertaPrecioId (FK_OPD_Oferta)
- VarianteId -> oms.ProductoVariante.VarianteId (FK_OPD_Variante)

### FK In
- None

### Columns

| # | Column | Type | Null | Identity | Default |
|---:|---|---|---|---|---|
| 1 | OfertaPrecioDetalleId | bigint | NO | YES | - |
| 2 | OfertaPrecioId | bigint | NO | NO | - |
| 3 | VarianteId | bigint | YES | NO | - |
| 4 | ExternalTallaId | nvarchar(120) | NO | NO | - |
| 5 | ExternalColorId | nvarchar(120) | NO | NO | - |
| 6 | Precio | decimal(18,2) | NO | NO | - |
| 7 | CreatedAt | datetime2 | NO | NO | (sysutcdatetime()) |
| 8 | UpdatedAt | datetime2 | YES | NO | - |

### Indexes
- PK__OfertaPr__28F95A2BEC479301 [PK, UQ] (CLUSTERED): OfertaPrecioDetalleId
- UX_OPD_Oferta_Talla_Color [UQ] (NONCLUSTERED): OfertaPrecioId, ExternalTallaId, ExternalColorId
- IX_OPD_Variante  (NONCLUSTERED): VarianteId

## [oms].Pais

- Rows: 5
- Columns: 6
- PK: PaisId
- FK Out: 0
- FK In: 7
- Indexes: 2

### FK Out
- None

### FK In
- oms.Bodega.PaisId -> oms.Pais.PaisId (FK_Bod_Pais)
- oms.Ciudad.PaisId -> oms.Pais.PaisId (FK_Ciudad_Pais)
- oms.EmpresaCliente.PaisId -> oms.Pais.PaisId (FK_EmpCli_Pais)
- oms.Empresa.PaisId -> oms.Pais.PaisId (FK_Empresa_Pais)
- oms.Pedido.ShippingPaisId -> oms.Pais.PaisId (FK_Ped_ShipPais)
- oms.Tienda.PaisId -> oms.Pais.PaisId (FK_Tienda_Pais)
- oms.ZonaTransporte.PaisId -> oms.Pais.PaisId (FK_Zona_Pais)

### Columns

| # | Column | Type | Null | Identity | Default |
|---:|---|---|---|---|---|
| 1 | PaisId | int | NO | YES | - |
| 2 | CodigoISO2 | char(2) | NO | NO | - |
| 3 | CodigoISO3 | char(3) | YES | NO | - |
| 4 | Nombre | nvarchar(240) | NO | NO | - |
| 5 | CreatedAt | datetime2 | NO | NO | (sysutcdatetime()) |
| 6 | UpdatedAt | datetime2 | YES | NO | - |

### Indexes
- PK__Pais__B501E185361CFCBD [PK, UQ] (CLUSTERED): PaisId
- UX_Pais_CodigoISO2 [UQ] (NONCLUSTERED): CodigoISO2

## [oms].PasarelaPago

- Rows: 0
- Columns: 8
- PK: PasarelaPagoId
- FK Out: 1
- FK In: 1
- Indexes: 2

### FK Out
- EmpresaId -> oms.Empresa.EmpresaId (FK_Pasarela_Empresa)

### FK In
- oms.Pedido.PasarelaPagoId -> oms.PasarelaPago.PasarelaPagoId (FK_Ped_Pasarela)

### Columns

| # | Column | Type | Null | Identity | Default |
|---:|---|---|---|---|---|
| 1 | PasarelaPagoId | int | NO | YES | - |
| 2 | EmpresaId | int | NO | NO | - |
| 3 | Codigo | nvarchar(120) | NO | NO | - |
| 4 | Nombre | nvarchar(360) | NO | NO | - |
| 5 | Activo | bit | NO | NO | ((1)) |
| 6 | ConfigJson | nvarchar(max) | YES | NO | - |
| 7 | CreatedAt | datetime2 | NO | NO | (sysutcdatetime()) |
| 8 | UpdatedAt | datetime2 | YES | NO | - |

### Indexes
- PK__Pasarela__8B5751E27D9C7893 [PK, UQ] (CLUSTERED): PasarelaPagoId
- UX_Pasarela_EmpresaCodigo [UQ] (NONCLUSTERED): EmpresaId, Codigo

## [oms].Pedido

- Rows: 105
- Columns: 28
- PK: PedidoId
- FK Out: 10
- FK In: 2
- Indexes: 6

### FK Out
- CanalVentaId -> oms.CanalVenta.CanalVentaId (FK_Ped_Canal)
- EmpresaClienteId -> oms.EmpresaCliente.EmpresaClienteId (FK_Ped_EmpCli)
- EmpresaId -> oms.Empresa.EmpresaId (FK_Ped_Empresa)
- EstadoId -> oms.Estado.EstadoId (FK_Ped_Estado)
- MonedaId -> oms.Moneda.MonedaId (FK_Ped_Moneda)
- PagoEstadoId -> oms.Estado.EstadoId (FK_Ped_PagoEstado)
- PasarelaPagoId -> oms.PasarelaPago.PasarelaPagoId (FK_Ped_Pasarela)
- ShippingCiudadId -> oms.Ciudad.CiudadId (FK_Ped_ShipCiudad)
- ShippingPaisId -> oms.Pais.PaisId (FK_Ped_ShipPais)
- TiendaOrigenId -> oms.Tienda.TiendaId (FK_Ped_TiendaOrigen)

### FK In
- oms.DetallePedido.PedidoId -> oms.Pedido.PedidoId (FK_DP_Pedido)
- oms.PedidoEstadoHistorial.PedidoId -> oms.Pedido.PedidoId (FK_PEH_Pedido)

### Columns

| # | Column | Type | Null | Identity | Default |
|---:|---|---|---|---|---|
| 1 | PedidoId | bigint | NO | YES | - |
| 2 | EmpresaId | int | NO | NO | - |
| 3 | EmpresaClienteId | int | YES | NO | - |
| 4 | CanalVentaId | int | NO | NO | - |
| 5 | TiendaOrigenId | int | YES | NO | - |
| 6 | MonedaId | int | NO | NO | - |
| 7 | NumeroPedido | nvarchar(120) | NO | NO | - |
| 8 | NumeroExterno | nvarchar(160) | YES | NO | - |
| 9 | EstadoId | int | NO | NO | - |
| 10 | ClienteNombre | nvarchar(360) | NO | NO | - |
| 11 | ClienteDocumento | nvarchar(120) | YES | NO | - |
| 12 | ClienteEmail | nvarchar(360) | YES | NO | - |
| 13 | ClienteTelefono | nvarchar(100) | YES | NO | - |
| 14 | ShippingPaisId | int | YES | NO | - |
| 15 | ShippingCiudadId | int | YES | NO | - |
| 16 | ShippingDireccion | nvarchar(510) | YES | NO | - |
| 17 | ShippingBarrio | nvarchar(240) | YES | NO | - |
| 18 | ShippingZip | nvarchar(40) | YES | NO | - |
| 19 | Subtotal | decimal(18,2) | NO | NO | ((0)) |
| 20 | Descuento | decimal(18,2) | NO | NO | ((0)) |
| 21 | Impuestos | decimal(18,2) | NO | NO | ((0)) |
| 22 | CostoEnvio | decimal(18,2) | NO | NO | ((0)) |
| 23 | Total | decimal(18,2) | NO | NO | ((0)) |
| 24 | PasarelaPagoId | int | YES | NO | - |
| 25 | PagoReferencia | nvarchar(240) | YES | NO | - |
| 26 | PagoEstadoId | int | YES | NO | - |
| 27 | CreatedAt | datetime2 | NO | NO | (sysutcdatetime()) |
| 28 | UpdatedAt | datetime2 | YES | NO | - |

### Indexes
- PK__Pedido__09BA1430DC479137 [PK, UQ] (CLUSTERED): PedidoId
- UX_Pedido_Numero [UQ] (NONCLUSTERED): NumeroPedido
- IX_Pedido_CanalFecha  (NONCLUSTERED): CanalVentaId, CreatedAt
- IX_Pedido_Email  (NONCLUSTERED): ClienteEmail
- IX_Pedido_EmpresaFecha  (NONCLUSTERED): EmpresaId, CreatedAt
- IX_Pedido_EstadoFecha  (NONCLUSTERED): EstadoId, CreatedAt

## [oms].PedidoEstadoHistorial

- Rows: 37
- Columns: 6
- PK: PedidoEstadoHistorialId
- FK Out: 3
- FK In: 0
- Indexes: 2

### FK Out
- EstadoId -> oms.Estado.EstadoId (FK_PEH_Estado)
- PedidoId -> oms.Pedido.PedidoId (FK_PEH_Pedido)
- UsuarioId -> oms.Usuario.UsuarioId (FK_PEH_Usuario)

### FK In
- None

### Columns

| # | Column | Type | Null | Identity | Default |
|---:|---|---|---|---|---|
| 1 | PedidoEstadoHistorialId | bigint | NO | YES | - |
| 2 | PedidoId | bigint | NO | NO | - |
| 3 | EstadoId | int | NO | NO | - |
| 4 | UsuarioId | int | YES | NO | - |
| 5 | Nota | nvarchar(510) | YES | NO | - |
| 6 | CreatedAt | datetime2 | NO | NO | (sysutcdatetime()) |

### Indexes
- PK__PedidoEs__8B6F2BDE3C75FB8A [PK, UQ] (CLUSTERED): PedidoEstadoHistorialId
- IX_PEH_PedidoFecha  (NONCLUSTERED): PedidoId, CreatedAt

## [oms].Perfil

- Rows: 4
- Columns: 5
- PK: PerfilId
- FK Out: 0
- FK In: 1
- Indexes: 2

### FK Out
- None

### FK In
- oms.Usuario.PerfilId -> oms.Perfil.PerfilId (FK_Usuario_Perfil)

### Columns

| # | Column | Type | Null | Identity | Default |
|---:|---|---|---|---|---|
| 1 | PerfilId | int | NO | YES | - |
| 2 | Nombre | nvarchar(160) | NO | NO | - |
| 3 | Descripcion | nvarchar(510) | YES | NO | - |
| 4 | CreatedAt | datetime2 | NO | NO | (sysutcdatetime()) |
| 5 | UpdatedAt | datetime2 | YES | NO | - |

### Indexes
- PK__Perfil__0C005B06C45BEC06 [PK, UQ] (CLUSTERED): PerfilId
- UX_Perfil_Nombre [UQ] (NONCLUSTERED): Nombre

## [oms].PrecioVariante

- Rows: 0
- Columns: 9
- PK: PrecioVarianteId
- FK Out: 2
- FK In: 0
- Indexes: 3

### FK Out
- ListaPrecioId -> oms.ListaPrecio.ListaPrecioId (FK_PV_LP)
- VarianteId -> oms.ProductoVariante.VarianteId (FK_PV_Var)

### FK In
- None

### Columns

| # | Column | Type | Null | Identity | Default |
|---:|---|---|---|---|---|
| 1 | PrecioVarianteId | bigint | NO | YES | - |
| 2 | ListaPrecioId | int | NO | NO | - |
| 3 | VarianteId | bigint | NO | NO | - |
| 4 | Precio | decimal(18,2) | NO | NO | - |
| 5 | PrecioPromo | decimal(18,2) | YES | NO | - |
| 6 | VigenciaDesde | datetime2 | YES | NO | - |
| 7 | VigenciaHasta | datetime2 | YES | NO | - |
| 8 | CreatedAt | datetime2 | NO | NO | (sysutcdatetime()) |
| 9 | UpdatedAt | datetime2 | YES | NO | - |

### Indexes
- PK__PrecioVa__03B4561E30BC3394 [PK, UQ] (CLUSTERED): PrecioVarianteId
- UX_PV_LPVariante [UQ] (NONCLUSTERED): ListaPrecioId, VarianteId
- IX_PV_Variante  (NONCLUSTERED): VarianteId

## [oms].Producto

- Rows: 10
- Columns: 10
- PK: ProductoId
- FK Out: 2
- FK In: 2
- Indexes: 3

### FK Out
- CategoriaId -> oms.Categoria.CategoriaId (FK_Prod_Cat)
- EmpresaId -> oms.Empresa.EmpresaId (FK_Prod_Empresa)

### FK In
- oms.ProductoTexto.ProductoId -> oms.Producto.ProductoId (FK_ProductoTexto_Producto)
- oms.ProductoVariante.ProductoId -> oms.Producto.ProductoId (FK_Var_Producto)

### Columns

| # | Column | Type | Null | Identity | Default |
|---:|---|---|---|---|---|
| 1 | ProductoId | int | NO | YES | - |
| 2 | EmpresaId | int | NO | NO | - |
| 3 | CategoriaId | int | YES | NO | - |
| 4 | SKUBase | nvarchar(160) | YES | NO | - |
| 5 | Nombre | nvarchar(440) | NO | NO | - |
| 6 | Descripcion | nvarchar(max) | YES | NO | - |
| 7 | Marca | nvarchar(240) | YES | NO | - |
| 8 | Activo | bit | NO | NO | ((1)) |
| 9 | CreatedAt | datetime2 | NO | NO | (sysutcdatetime()) |
| 10 | UpdatedAt | datetime2 | YES | NO | - |

### Indexes
- PK__Producto__A430AEA31F9C8620 [PK, UQ] (CLUSTERED): ProductoId
- IX_Prod_Categoria  (NONCLUSTERED): CategoriaId
- IX_Prod_Empresa  (NONCLUSTERED): EmpresaId

## [oms].ProductoTexto

- Rows: 0
- Columns: 11
- PK: ProductoTextoId
- FK Out: 1
- FK In: 0
- Indexes: 4

### FK Out
- ProductoId -> oms.Producto.ProductoId (FK_ProductoTexto_Producto)

### FK In
- None

### Columns

| # | Column | Type | Null | Identity | Default |
|---:|---|---|---|---|---|
| 1 | ProductoTextoId | bigint | NO | YES | - |
| 2 | ProductoId | int | NO | NO | - |
| 3 | Idioma | nvarchar(20) | NO | NO | - |
| 4 | Nombre | nvarchar(800) | YES | NO | - |
| 5 | Descripcion | nvarchar(max) | YES | NO | - |
| 6 | DescripcionCorta | nvarchar(max) | YES | NO | - |
| 7 | MetaTitulo | nvarchar(800) | YES | NO | - |
| 8 | MetaDescripcion | nvarchar(max) | YES | NO | - |
| 9 | Url | nvarchar(600) | YES | NO | - |
| 10 | CreatedAt | datetime2 | NO | NO | (sysutcdatetime()) |
| 11 | UpdatedAt | datetime2 | YES | NO | - |

### Indexes
- PK__Producto__084ED453757C9A2B [PK, UQ] (CLUSTERED): ProductoTextoId
- UX_ProductoTexto_ProductoIdioma [UQ] (NONCLUSTERED): ProductoId, Idioma
- IX_ProductoTexto_Idioma  (NONCLUSTERED): Idioma
- IX_ProductoTexto_Nombre  (NONCLUSTERED): Nombre

## [oms].ProductoVariante

- Rows: 16
- Columns: 13
- PK: VarianteId
- FK Out: 2
- FK In: 7
- Indexes: 3

### FK Out
- EmpresaId -> oms.Empresa.EmpresaId (FK_Var_Empresa)
- ProductoId -> oms.Producto.ProductoId (FK_Var_Producto)

### FK In
- oms.DetallePedido.VarianteId -> oms.ProductoVariante.VarianteId (FK_DP_Var)
- oms.Inventario.VarianteId -> oms.ProductoVariante.VarianteId (FK_Inv_Variante)
- oms.OfertaPrecioDetalle.VarianteId -> oms.ProductoVariante.VarianteId (FK_OPD_Variante)
- oms.PrecioVariante.VarianteId -> oms.ProductoVariante.VarianteId (FK_PV_Var)
- oms.InventarioReserva.VarianteId -> oms.ProductoVariante.VarianteId (FK_Res_Variante)
- oms.TarifaPrecioDetalle.VarianteId -> oms.ProductoVariante.VarianteId (FK_TPD_Variante)
- oms.VarianteAtributo.VarianteId -> oms.ProductoVariante.VarianteId (FK_VA_Var)

### Columns

| # | Column | Type | Null | Identity | Default |
|---:|---|---|---|---|---|
| 1 | VarianteId | bigint | NO | YES | - |
| 2 | EmpresaId | int | NO | NO | - |
| 3 | ProductoId | int | NO | NO | - |
| 4 | SKU | nvarchar(200) | NO | NO | - |
| 5 | EAN | nvarchar(120) | YES | NO | - |
| 6 | Nombre | nvarchar(440) | YES | NO | - |
| 7 | PesoKg | decimal(10,3) | YES | NO | - |
| 8 | LargoCm | decimal(10,2) | YES | NO | - |
| 9 | AnchoCm | decimal(10,2) | YES | NO | - |
| 10 | AltoCm | decimal(10,2) | YES | NO | - |
| 11 | Activo | bit | NO | NO | ((1)) |
| 12 | CreatedAt | datetime2 | NO | NO | (sysutcdatetime()) |
| 13 | UpdatedAt | datetime2 | YES | NO | - |

### Indexes
- PK__Producto__FE18F98BE70FD33B [PK, UQ] (CLUSTERED): VarianteId
- UX_Var_EmpresaSKU [UQ] (NONCLUSTERED): EmpresaId, SKU
- IX_Var_Producto  (NONCLUSTERED): ProductoId

## [oms].Talla

- Rows: 12
- Columns: 9
- PK: TallaId
- FK Out: 1
- FK In: 0
- Indexes: 4

### FK Out
- EmpresaId -> oms.Empresa.EmpresaId (FK_Talla_Empresa)

### FK In
- None

### Columns

| # | Column | Type | Null | Identity | Default |
|---:|---|---|---|---|---|
| 1 | TallaId | int | NO | YES | - |
| 2 | EmpresaId | int | NO | NO | - |
| 3 | ExternalTallaId | int | YES | NO | - |
| 4 | SourceCode | nvarchar(120) | NO | NO | - |
| 5 | Nombre | nvarchar(400) | YES | NO | - |
| 6 | IsActive | bit | NO | NO | ((1)) |
| 7 | SourceTs | datetime2 | YES | NO | - |
| 8 | CreatedAt | datetime2 | NO | NO | (sysutcdatetime()) |
| 9 | UpdatedAt | datetime2 | YES | NO | - |

### Indexes
- PK__Talla__9BF1376D6FF86DC0 [PK, UQ] (CLUSTERED): TallaId
- UX_Talla_Empresa_ExternalId [UQ] (NONCLUSTERED): EmpresaId, ExternalTallaId
- UX_Talla_Empresa_SourceCode [UQ] (NONCLUSTERED): EmpresaId, SourceCode
- IX_Talla_Activo  (NONCLUSTERED): EmpresaId, IsActive

## [oms].TarifaPrecio

- Rows: 0
- Columns: 10
- PK: TarifaPrecioId
- FK Out: 1
- FK In: 2
- Indexes: 2

### FK Out
- EmpresaId -> oms.Empresa.EmpresaId (FK_Tarifa_Empresa)

### FK In
- oms.OfertaPrecio.TarifaPrecioId -> oms.TarifaPrecio.TarifaPrecioId (FK_Oferta_Tarifa)
- oms.TarifaPrecioDetalle.TarifaPrecioId -> oms.TarifaPrecio.TarifaPrecioId (FK_TPD_Tarifa)

### Columns

| # | Column | Type | Null | Identity | Default |
|---:|---|---|---|---|---|
| 1 | TarifaPrecioId | bigint | NO | YES | - |
| 2 | EmpresaId | int | NO | NO | - |
| 3 | ComercialChannel | nvarchar(160) | NO | NO | - |
| 4 | ExternalTarifaId | nvarchar(120) | NO | NO | - |
| 5 | MonedaCodigo | char(3) | NO | NO | - |
| 6 | ImpuestoPct | decimal(5,2) | YES | NO | - |
| 7 | Activo | bit | NO | NO | ((1)) |
| 8 | SourceTs | datetime2 | YES | NO | - |
| 9 | CreatedAt | datetime2 | NO | NO | (sysutcdatetime()) |
| 10 | UpdatedAt | datetime2 | YES | NO | - |

### Indexes
- PK__TarifaPr__83455BC827D8095B [PK, UQ] (CLUSTERED): TarifaPrecioId
- UX_Tarifa_Empresa_Tarifa [UQ] (NONCLUSTERED): EmpresaId, ExternalTarifaId

## [oms].TarifaPrecioDetalle

- Rows: 0
- Columns: 8
- PK: TarifaPrecioDetalleId
- FK Out: 2
- FK In: 0
- Indexes: 3

### FK Out
- TarifaPrecioId -> oms.TarifaPrecio.TarifaPrecioId (FK_TPD_Tarifa)
- VarianteId -> oms.ProductoVariante.VarianteId (FK_TPD_Variante)

### FK In
- None

### Columns

| # | Column | Type | Null | Identity | Default |
|---:|---|---|---|---|---|
| 1 | TarifaPrecioDetalleId | bigint | NO | YES | - |
| 2 | TarifaPrecioId | bigint | NO | NO | - |
| 3 | VarianteId | bigint | YES | NO | - |
| 4 | ExternalTallaId | nvarchar(120) | NO | NO | - |
| 5 | ExternalColorId | nvarchar(120) | NO | NO | - |
| 6 | Precio | decimal(18,2) | NO | NO | - |
| 7 | CreatedAt | datetime2 | NO | NO | (sysutcdatetime()) |
| 8 | UpdatedAt | datetime2 | YES | NO | - |

### Indexes
- PK__TarifaPr__30645A2E31BC2D9C [PK, UQ] (CLUSTERED): TarifaPrecioDetalleId
- UX_TPD_Tarifa_Talla_Color [UQ] (NONCLUSTERED): TarifaPrecioId, ExternalTallaId, ExternalColorId
- IX_TPD_Variante  (NONCLUSTERED): VarianteId

## [oms].Tienda

- Rows: 2
- Columns: 12
- PK: TiendaId
- FK Out: 3
- FK In: 2
- Indexes: 2

### FK Out
- CiudadId -> oms.Ciudad.CiudadId (FK_Tienda_Ciudad)
- EmpresaId -> oms.Empresa.EmpresaId (FK_Tienda_Empresa)
- PaisId -> oms.Pais.PaisId (FK_Tienda_Pais)

### FK In
- oms.Bodega.TiendaId -> oms.Tienda.TiendaId (FK_Bod_Tienda)
- oms.Pedido.TiendaOrigenId -> oms.Tienda.TiendaId (FK_Ped_TiendaOrigen)

### Columns

| # | Column | Type | Null | Identity | Default |
|---:|---|---|---|---|---|
| 1 | TiendaId | int | NO | YES | - |
| 2 | EmpresaId | int | NO | NO | - |
| 3 | Codigo | nvarchar(120) | NO | NO | - |
| 4 | Nombre | nvarchar(360) | NO | NO | - |
| 5 | PaisId | int | YES | NO | - |
| 6 | CiudadId | int | YES | NO | - |
| 7 | Direccion | nvarchar(510) | YES | NO | - |
| 8 | Telefono | nvarchar(100) | YES | NO | - |
| 9 | FulfillmentHabilitado | bit | NO | NO | ((1)) |
| 10 | Activo | bit | NO | NO | ((1)) |
| 11 | CreatedAt | datetime2 | NO | NO | (sysutcdatetime()) |
| 12 | UpdatedAt | datetime2 | YES | NO | - |

### Indexes
- PK__Tienda__FC84C5CC27E94979 [PK, UQ] (CLUSTERED): TiendaId
- UX_Tienda_EmpresaCodigo [UQ] (NONCLUSTERED): EmpresaId, Codigo

## [oms].Transportadora

- Rows: 1
- Columns: 8
- PK: TransportadoraId
- FK Out: 1
- FK In: 2
- Indexes: 2

### FK Out
- EmpresaId -> oms.Empresa.EmpresaId (FK_Transp_Empresa)

### FK In
- oms.CostoTransporte.TransportadoraId -> oms.Transportadora.TransportadoraId (FK_CT_Transp)
- oms.DetallePedido.TransportadoraId -> oms.Transportadora.TransportadoraId (FK_DP_Transp)

### Columns

| # | Column | Type | Null | Identity | Default |
|---:|---|---|---|---|---|
| 1 | TransportadoraId | int | NO | YES | - |
| 2 | EmpresaId | int | NO | NO | - |
| 3 | Codigo | nvarchar(120) | NO | NO | - |
| 4 | Nombre | nvarchar(360) | NO | NO | - |
| 5 | TrackingUrlTemplate | nvarchar(510) | YES | NO | - |
| 6 | Activo | bit | NO | NO | ((1)) |
| 7 | CreatedAt | datetime2 | NO | NO | (sysutcdatetime()) |
| 8 | UpdatedAt | datetime2 | YES | NO | - |

### Indexes
- PK__Transpor__5A95DE876E9E449A [PK, UQ] (CLUSTERED): TransportadoraId
- UX_Transp_EmpresaCodigo [UQ] (NONCLUSTERED): EmpresaId, Codigo

## [oms].Usuario

- Rows: 5
- Columns: 11
- PK: UsuarioId
- FK Out: 2
- FK In: 2
- Indexes: 3

### FK Out
- EmpresaId -> oms.Empresa.EmpresaId (FK_Usuario_Empresa)
- PerfilId -> oms.Perfil.PerfilId (FK_Usuario_Perfil)

### FK In
- oms.Log.UsuarioId -> oms.Usuario.UsuarioId (FK_Log_Usuario)
- oms.PedidoEstadoHistorial.UsuarioId -> oms.Usuario.UsuarioId (FK_PEH_Usuario)

### Columns

| # | Column | Type | Null | Identity | Default |
|---:|---|---|---|---|---|
| 1 | UsuarioId | int | NO | YES | - |
| 2 | EmpresaId | int | NO | NO | - |
| 3 | PerfilId | int | NO | NO | - |
| 4 | Nombre | nvarchar(280) | NO | NO | - |
| 5 | Email | nvarchar(360) | NO | NO | - |
| 6 | Telefono | nvarchar(100) | YES | NO | - |
| 7 | PasswordHash | nvarchar(510) | NO | NO | - |
| 8 | Estado | nvarchar(40) | NO | NO | ('ACTIVO') |
| 9 | LastLoginAt | datetime2 | YES | NO | - |
| 10 | CreatedAt | datetime2 | NO | NO | (sysutcdatetime()) |
| 11 | UpdatedAt | datetime2 | YES | NO | - |

### Indexes
- PK__Usuario__2B3DE7B8C82C7E7C [PK, UQ] (CLUSTERED): UsuarioId
- UX_Usuario_Email [UQ] (NONCLUSTERED): Email
- IX_Usuario_Empresa  (NONCLUSTERED): EmpresaId

## [oms].VarianteAtributo

- Rows: 32
- Columns: 4
- PK: VarianteId, AtributoId
- FK Out: 3
- FK In: 0
- Indexes: 2

### FK Out
- AtributoId -> oms.Atributo.AtributoId (FK_VA_Atr)
- AtributoValorId -> oms.AtributoValor.AtributoValorId (FK_VA_Val)
- VarianteId -> oms.ProductoVariante.VarianteId (FK_VA_Var)

### FK In
- None

### Columns

| # | Column | Type | Null | Identity | Default |
|---:|---|---|---|---|---|
| 1 | VarianteId | bigint | NO | NO | - |
| 2 | AtributoId | int | NO | NO | - |
| 3 | AtributoValorId | int | NO | NO | - |
| 4 | CreatedAt | datetime2 | NO | NO | (sysutcdatetime()) |

### Indexes
- PK_VarianteAtributo [PK, UQ] (CLUSTERED): VarianteId, AtributoId
- IX_VA_Valor  (NONCLUSTERED): AtributoValorId

## [oms].ZonaCiudad

- Rows: 3
- Columns: 2
- PK: ZonaTransporteId, CiudadId
- FK Out: 2
- FK In: 0
- Indexes: 1

### FK Out
- CiudadId -> oms.Ciudad.CiudadId (FK_ZC_Ciudad)
- ZonaTransporteId -> oms.ZonaTransporte.ZonaTransporteId (FK_ZC_Zona)

### FK In
- None

### Columns

| # | Column | Type | Null | Identity | Default |
|---:|---|---|---|---|---|
| 1 | ZonaTransporteId | int | NO | NO | - |
| 2 | CiudadId | int | NO | NO | - |

### Indexes
- PK_ZonaCiudad [PK, UQ] (CLUSTERED): ZonaTransporteId, CiudadId

## [oms].ZonaTransporte

- Rows: 2
- Columns: 8
- PK: ZonaTransporteId
- FK Out: 2
- FK In: 2
- Indexes: 2

### FK Out
- EmpresaId -> oms.Empresa.EmpresaId (FK_Zona_Empresa)
- PaisId -> oms.Pais.PaisId (FK_Zona_Pais)

### FK In
- oms.CostoTransporte.ZonaTransporteId -> oms.ZonaTransporte.ZonaTransporteId (FK_CT_Zona)
- oms.ZonaCiudad.ZonaTransporteId -> oms.ZonaTransporte.ZonaTransporteId (FK_ZC_Zona)

### Columns

| # | Column | Type | Null | Identity | Default |
|---:|---|---|---|---|---|
| 1 | ZonaTransporteId | int | NO | YES | - |
| 2 | EmpresaId | int | NO | NO | - |
| 3 | Codigo | nvarchar(120) | NO | NO | - |
| 4 | Nombre | nvarchar(360) | NO | NO | - |
| 5 | PaisId | int | YES | NO | - |
| 6 | Activo | bit | NO | NO | ((1)) |
| 7 | CreatedAt | datetime2 | NO | NO | (sysutcdatetime()) |
| 8 | UpdatedAt | datetime2 | YES | NO | - |

### Indexes
- PK__ZonaTran__6E3753FF5AB67B49 [PK, UQ] (CLUSTERED): ZonaTransporteId
- UX_Zona_EmpresaCodigo [UQ] (NONCLUSTERED): EmpresaId, Codigo