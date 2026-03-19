# 10 - Catalogo ZI Fase 3 (Catalogo Panel)

## 1) Prerequisito: limpieza con backup previo

- Hacer backup de BD ANTES de ejecutar.
- Leer y entender el script completo.
- Ejecutar `scripts/sql/20260319_limpieza_datos_prueba_v1.up.sql`.
- Verificar:
  - `SELECT COUNT(*) FROM oms.Producto WHERE OrigenDatos <> 'ZI';` debe retornar `0`.
  - `SELECT COUNT(*) FROM oms.Pedido;` debe retornar `0` para entorno dev/QA limpiado.

## 2) Endpoints nuevos (solo lectura)

Base path: `/configuracion-general/catalogo-zi`

### `GET /catalog`

Query params:

- `search?: string`
- `categoriaId?: string`
- `marca?: string`
- `soloConStock?: boolean`
- `page?: number` (default `1`)
- `pageSize?: number` (default `50`, max `100`)

Response (ejemplo):

```json
{
  "items": [
    {
      "productoId": 13,
      "skuBase": "105243",
      "nombre": "Falda",
      "marca": "KOAJ",
      "activo": true,
      "categoriaNombre": "Mujer",
      "categoriaId": 7,
      "totalVariantes": 4,
      "precioBaseMin": 229900,
      "precioBaseMax": 259900,
      "stockTotal": 80,
      "ziSyncedAt": "2026-03-19T13:20:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 50,
  "totalPages": 1
}
```

### `GET /catalog/filters/marcas`

Response (ejemplo):

```json
["KOAJ", "KOAJ BASIC"]
```

### `GET /catalog/filters/categorias`

Response (ejemplo):

```json
[
  { "categoriaId": 7, "nombre": "Mujer", "total": 320 },
  { "categoriaId": 8, "nombre": "Hombre", "total": 290 }
]
```

### `GET /catalog/:productoId`

Response (ejemplo):

```json
{
  "productoId": 13,
  "skuBase": "105243",
  "nombre": "Falda",
  "marca": "KOAJ",
  "activo": true,
  "descripcion": "Descripcion larga",
  "descripcionCorta": "Descripcion corta",
  "metaTitulo": "Meta title",
  "metaDescripcion": "Meta description",
  "url": "/falda-koaj",
  "categoriaNombre": "Mujer",
  "instruccionesCuidado": null,
  "ziSyncedAt": "2026-03-19T13:20:00.000Z",
  "variantes": [],
  "tarifas": []
}
```

## 3) Query params del listado

El endpoint `/catalog` permite filtrar por:

- texto (`search`) sobre SKU base, nombre y marca,
- categoría (`categoriaId`),
- marca exacta (`marca`),
- solo con stock (`soloConStock=true`),
- y paginación (`page`, `pageSize`).

## 4) Por que CTEs y no JOINs directos

Se usan CTEs separadas para variantes, stock y precios para evitar inflado de filas.
Si se hace join directo entre inventario, variantes y detalle de tarifas en una sola query,
el producto se multiplica por combinaciones y rompe conteos, min/max y paginación.

## 5) Extraccion de talla/color desde SKU ZI

Se asume formato SKU `productoId-tallaId-colorId`.
La extracción se hace en SQL con `CHARINDEX` + `SUBSTRING` de forma defensiva para
evitar fallos cuando el SKU no tiene el formato esperado.

## 6) Evaluacion de ofertas en UTC

La vigencia de oferta se evalúa con:

- `GETUTCDATE() BETWEEN FechaInicio AND FechaFin`

Esto evita inconsistencias por zona horaria local del servidor.

## 7) Pendiente 3B

- Implementación frontend en `/panel/catalog/products`.

## 8) Pendiente Fase 4

- Publicación de productos ZI en marketplace.
- Gestión de canales comerciales.
- Activar/desactivar productos para publicación.
