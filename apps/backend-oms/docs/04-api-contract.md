# 04 - API Contract

## Catalogo ZI

Base path: `/configuracion-general/catalogo-zi`

### Endpoints existentes

- `GET /change`
- `POST /products`
- `POST /prices`
- `POST /stock`
- `GET /categories/:id`
- `POST /auth/refresh`

### Endpoints nuevos Fase 2

- `POST /sync/full`
  - Permission: `config.manage`
  - Ejecuta delta sync completo.

- `POST /sync/producto/:id`
  - Permission: `config.manage`
  - Ejecuta persistencia puntual de producto/precios/stock para un `productoZiId`.

- `POST /sync/categorias`
  - Permission: `config.manage`
  - Ejecuta sync de categorias del rango `1..809`.

### Endpoints nuevos Fase 3A (catalogo panel)

- `GET /catalog`
  - Permission: `config.read`
  - Query params:
    - `search?: string`
    - `categoriaId?: string`
    - `marca?: string`
    - `soloConStock?: boolean`
    - `page?: number` (default `1`)
    - `pageSize?: number` (default `50`, max `100`)
  - Retorna listado paginado de productos ZI con agregados de variantes, stock y precios.
  - Cada item incluye:
    - `precioPrioritario: number | null`
    - `monedaPrioritaria: string | null`
    - `canalPrioritario: string | null`
  - Prioridad:
    - `COLOMBIA` + `COP`
    - `UNICO` + `COP`
    - si no existe ninguno, los 3 campos retornan `null`.

- `GET /catalog/filters/marcas`
  - Permission: `config.read`
  - Retorna `string[]` con marcas disponibles en productos ZI.

- `GET /catalog/filters/categorias`
  - Permission: `config.read`
  - Retorna categorías activas con conteo de productos ZI:
    - `{ categoriaId: number; nombre: string; total: number }[]`

- `GET /catalog/:productoId`
  - Permission: `config.read`
  - Retorna detalle de producto ZI:
    - datos del producto,
    - variantes (talla/color/stock),
    - tarifas activas y oferta vigente en UTC.

- `GET /ops/status`
  - Permission: `config.read`
  - Retorna estado operativo de Zona de Integracion para ZI:
    - `jobs` (ZI autosync, Entrantes autosync, Orders legacy),
    - `alerts` (incluye `WARN` cuando `INBOUND_SYNC_JOB_ENABLED=true` y `ORDERS_SYNC_FULL_JOB_ENABLED=true`),
    - `healthSummary` (corridas 24h + ultimo estado),
    - `ziLastRuns` (ultimas corridas registradas en `oms.ZiSyncLog`).

### Politica operativa recomendada

- Operacion normal: usar un solo orquestador de autosync para pedidos entrantes.
- Recomendado:
  - `INBOUND_SYNC_JOB_ENABLED=true`
  - `ORDERS_SYNC_FULL_JOB_ENABLED=false`

## Producto

Base path: `/configuracion-general/producto`

- `GET /`
  - Soporta query param opcional `search`.
  - Sin `search`: mantiene comportamiento actual de listado.
  - Con `search`: filtra por `SKUBase`, `Nombre` o `Marca`.
