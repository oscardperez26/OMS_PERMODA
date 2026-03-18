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

## Producto

Base path: `/configuracion-general/producto`

- `GET /`
  - Soporta query param opcional `search`.
  - Sin `search`: mantiene comportamiento actual de listado.
  - Con `search`: filtra por `SKUBase`, `Nombre` o `Marca`.
