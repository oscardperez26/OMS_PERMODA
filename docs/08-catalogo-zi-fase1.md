# Catalogo ZI - Fase 1

## 1) Variables de entorno

| Variable | Descripcion | Default |
| --- | --- | --- |
| `ZI_HOST` | Host base de ZI. | `https://ws.permoda.co:9001` |
| `ZI_AUTH_PATH` | Path de login en ZI. | `/api/Users/login` |
| `ZI_ECOMMERCE_PATH` | Prefijo para endpoints Ecommerce ZI. | `/api/Ecommerce` |
| `ZI_AUTH_EMAIL` | Usuario de autenticacion ZI. | `""` |
| `ZI_AUTH_PASSWORD` | Password de autenticacion ZI. | `""` |
| `ZI_TOKEN_REFRESH_SKEW_SEC` | Segundos de margen para renovar token antes del vencimiento. | `60` |
| `ZI_TOKEN_TTL_FALLBACK_SEC` | TTL fallback si ZI no envia `expires_in` ni `exp` JWT. | `600` |
| `ZI_HTTP_TIMEOUT_MS` | Timeout HTTP para login y llamadas Ecommerce. | `10000` |
| `ZI_TLS_REJECT_UNAUTHORIZED` | Validacion TLS estricta. En local puede ir `false`. | `true` |
| `ZI_ALLOW_MANUAL_REFRESH` | Habilita endpoint manual de refresh de token. | `false` |

Seguridad:
- No hardcodear credenciales ni tokens.
- No loggear email, password ni access token.
- No exponer detalle interno de errores ZI al cliente.
- `ZI_TLS_REJECT_UNAUTHORIZED=false` solo en desarrollo local.

## 2) Endpoints internos (backend OMS)

Base: `/configuracion-general/catalogo-zi`

### `GET /change`
- Permiso: `config.read`
- Respuesta ejemplo:

```json
[
  {
    "id": 23031,
    "hash_Product": "2f3a...",
    "hash_Price": "f19b...",
    "hash_Stock": "34cc..."
  }
]
```

### `POST /products`
- Permiso: `config.read`
- Request:

```json
{ "product": "4" }
```

- Respuesta ejemplo:

```json
[
  {
    "id": 4,
    "referencia": "REF-004",
    "marca": "KOAJ",
    "catgoria_defecto": "10"
  }
]
```

### `POST /prices`
- Permiso: `config.read`
- Request:

```json
{ "product": "23031" }
```

- Respuesta ejemplo:

```json
[
  {
    "id": 23031,
    "hash_price": "abc123",
    "tarifas": [
      {
        "comercialChannel": "UNICO",
        "id_tarifa": "T1",
        "precio_base": "229900.00"
      }
    ]
  }
]
```

### `POST /stock`
- Permiso: `config.read`
- Request:

```json
{ "product": "3" }
```

- Respuesta ejemplo:

```json
[
  {
    "id": 3,
    "hash_stock": "def456",
    "stock": [
      {
        "id_tienda": "828",
        "tallas": [
          [{ "id_talla": "M", "id_Color": "1", "unidades": "5" }]
        ]
      }
    ]
  }
]
```

### `GET /categories/:id`
- Permiso: `config.read`
- Respuesta ejemplo:

```json
{
  "id": 1,
  "isActive": true,
  "ts": "2026-03-17T00:00:00Z",
  "name": "HOMBRE",
  "dependOnId": 0,
  "level": "1",
  "success": true,
  "statusCode": 200
}
```

### `POST /auth/refresh`
- Permiso: `config.manage`
- Comportamiento:
  - Si `ZI_ALLOW_MANUAL_REFRESH=false` -> `403`.
  - Si `ZI_ALLOW_MANUAL_REFRESH=true` -> retorna token renovado.

## 3) Bugs conocidos de ZI

1. Campo con typo: `catgoria_defecto` (sin `e`).
2. Campo con acento: `meta_descripción` (usar bracket notation).
3. Inconsistencia color: `id_Color` en `/Stock` vs `id_color` en `/Prices`.
4. Stock tallas llega como matriz anidada: `tallas: ZiStockTalla[][]`.
5. Numeros llegan como string (`"229900.00"`, `"0"`, `"19.00"`).
6. `id_tienda` de ZI no corresponde a `BodegaId` OMS; requiere `oms.ZiTiendaMapping`.
7. `GET /Categories/{id}` puede devolver objeto o array de un elemento; backend OMS normaliza a objeto.

## 4) Mapeo de campos ZI -> OMS

| ZI | OMS | Nota |
| --- | --- | --- |
| `producto.referencia` | `Producto.SKUBase` | SKU base del producto |
| `producto.nombre.es` | `Producto.Nombre` | Texto ES |
| `producto.marca` | `Producto.Marca` | Marca |
| `producto.activo` | `Producto.Activo` | Estado |
| `producto.nombre.es` | `ProductoTexto.Nombre` | Texto ES |
| `producto.descripcion.es` | `ProductoTexto.Descripcion` | Texto ES |
| `producto.descripcion_corta.es` | `ProductoTexto.DescripcionCorta` | Texto ES |
| `producto.meta_titulo.es` | `ProductoTexto.MetaTitulo` | SEO |
| `producto['meta_descripción'].es` | `ProductoTexto.MetaDescripcion` | Campo con acento |
| `producto.url.es` | `ProductoTexto.Url` | URL SEO |
| `producto.categorias[]` | `Categoria.ExternalCategoryId` | Match por externo |
| `combinacion.id` | `ProductoVariante.SKU` | SKU variante |
| `combinacion.ean13` | `ProductoVariante.EAN` | EAN |
| `atributo talla` | `Talla.ExternalTallaId` | Match por externo |
| `atributo color` | `Color.ExternalColorId` | Match por externo |
| `tarifa.comercialChannel` | `TarifaPrecio.ComercialChannel` | Canal comercial |
| `tarifa.id_tarifa` | `TarifaPrecio.ExternalTarifaId` | Id externo tarifa |
| `tarifa.moneda` | `TarifaPrecio.MonedaCodigo` | Moneda |
| `tarifa.impuesto` | `TarifaPrecio.ImpuestoPct` | `parseFloat` |
| `precio_tallas.id_talla` | `TarifaPrecioDetalle.ExternalTallaId` | Detalle por talla |
| `precio_tallas.id_color` | `TarifaPrecioDetalle.ExternalColorId` | Detalle por color |
| `precio_tallas.precio` | `TarifaPrecioDetalle.Precio` | `parseFloat` |
| `oferta.id_oferta` | `OfertaPrecio.ExternalOfertaId` | Oferta externa |
| `oferta.fecha_inicio` | `OfertaPrecio.FechaInicio` | Parse date |
| `oferta.fecha_fin` | `OfertaPrecio.FechaFin` | Parse date |
| `oferta.precio_base` | `OfertaPrecio.PrecioBase` | `parseFloat` |
| `stock.id_tienda` | `ZiTiendaMapping.ZiTiendaId` | Requiere mapeo manual |
| `stock.tallas[].id_talla` | `Inventario.VarianteId` (via talla/color->variante) | Resolucion por catalogo |
| `stock.tallas[].id_Color/id_color` | `Inventario.VarianteId` (via talla/color->variante) | Normalizar nombre de campo |
| `stock.tallas[].unidades` | `Inventario.StockTotal` | `parseInt` |
| `category.id` | `Categoria.ExternalCategoryId` | Categoria externa |
| `category.dependOnId` | `Categoria.ExternalParentId` | Parent externo |
| `category.name` | `Categoria.Nombre` | Nombre |
| `category.isActive` | `Categoria.Activo`, `Categoria.IsActiveExternal` | Estado |
| `category.ts` | `Categoria.SourceTs` | Timestamp origen |
| `category.success` | `Categoria.ApiSuccess` | Resultado API |
| `category.statusCode` | `Categoria.ApiStatusCode` | HTTP upstream |

## 5) Tabla de sincronizacion Fase 2

| Dato | Endpoint ZI | Tablas OMS | Frecuencia |
| --- | --- | --- | --- |
| Productos | `/Products` | `Producto`, `ProductoTexto`, `ProductoVariante` | 6h |
| Precios | `/Prices` | `TarifaPrecio`, `TarifaPrecioDetalle`, `OfertaPrecio`, `OfertaPrecioDetalle` | 2h |
| Stock | `/Stock` | `Inventario` via `ZiTiendaMapping` | 20 min |
| Categorias | `/Categories/{id}` | `Categoria` | 24h |

## 6) Algoritmo delta sync (3 hashes independientes)

1. Llamar `GET /Change`.
2. Por cada item `id` comparar hashes con ultimo registro en `oms.ZiSyncLog`.
3. Si cambia `hash_Product`, llamar `POST /Products` para ese `id`.
4. Si cambia `hash_Price`, llamar `POST /Prices` para ese `id`.
5. Si cambia `hash_Stock`, llamar `POST /Stock` para ese `id`.
6. Si no cambia ninguno, no hacer llamadas para ese producto.
7. Persistir nuevos hashes en `oms.ZiSyncLog` con estado y metricas.

## 7) Bloqueante Fase 2

`oms.ZiTiendaMapping` debe poblarse manualmente antes de activar sync de stock.

Accion requerida con negocio:
- Confirmar que `BodegaId` OMS corresponde a cada `id_tienda` ZI.
- Ejemplos de ids ZI reportados: `"828"`, `"238"`, `"395"`.

## 8) Inconsistencia de permisos (pendiente)

Actualmente:
- `producto` usa permiso `orders.read`.
- `inventario` usa permiso `config.read`.

No se corrige en esta fase; queda pendiente de alineacion funcional/seguridad.

## 9) Nota tecnica de dependencias

`mssql` esta declarado fuera de `apps/backend-oms` y queda como pendiente de ordenamiento del monorepo.

## 10) Nota de seguridad operativa

Si credenciales ZI fueron expuestas en cualquier momento, rotarlas de inmediato y auditar logs/historial.
