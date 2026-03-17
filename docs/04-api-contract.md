# Contrato de API - OMS

## Convenciones
- Todas las respuestas incluyen:
  - data: contenido
  - meta: paginación/extra
  - error: estándar si falla

## Endpoints MVP

### Auth
- POST /auth/login
- GET /auth/me


### Orders
- GET /orders
  - filtros: reference, customer, status
  - retorno: data[] + meta
- GET /orders/:id
- PATCH /orders/:id/status

### GET /orders
Ejemplo:
GET /orders?reference=PO&status=ASIGNADO

/orders requiere Authorization Bearer Token

## Configuracion General - Logistica

### Dashboard logistica
- `GET /configuracion-general/logistica/bootstrap`
  - Permiso: `config.read`
  - Retorna:
    - `transportadorasTotal`
    - `zonasTransporteTotal`
    - `zonaCiudadRelacionesTotal`
    - `costosTransporteTotal`
    - `lastUpdatedAt`

### Transportadora API config (V2)
- `GET /configuracion-general/transportadora/:id/api-config`
  - Permiso: `config.read`
  - Devuelve transportadora + apiConfig.
  - Nunca devuelve token en claro.
- `PATCH /configuracion-general/transportadora/:id/api-config`
  - Permiso: `config.manage`
  - Permite editar:
    - `baseUrl`
    - `authType` (solo `API_KEY`)
    - `timeoutMs`
    - `createShipmentEndpoint`
    - `trackingEndpointTemplate`
    - `trackingNumberField`
    - `statusField`
    - `apiKeyPlaintext` (opcional para rotacion)

Ejemplo GET:

```json
{
  "transportadora": {
    "transportadoraId": 1,
    "empresaId": 1,
    "codigo": "SERVIENTREGA",
    "nombre": "Servientrega",
    "activo": true
  },
  "apiConfig": {
    "baseUrl": "https://api.proveedor.com",
    "authType": "API_KEY",
    "timeoutMs": 15000,
    "createShipmentEndpoint": "/shipments",
    "trackingEndpointTemplate": "/track/{trackingNumber}",
    "trackingNumberField": "tracking_number",
    "statusField": "status",
    "hasApiKey": true,
    "apiKeyLastRotatedAt": "2026-03-12T20:00:00.000Z",
    "updatedAt": "2026-03-12T20:00:00.000Z"
  }
}
```

Ejemplo PATCH:

```json
{
  "baseUrl": "https://api.proveedor.com",
  "authType": "API_KEY",
  "timeoutMs": 15000,
  "createShipmentEndpoint": "/shipments",
  "trackingEndpointTemplate": "/track/{trackingNumber}",
  "trackingNumberField": "tracking_number",
  "statusField": "status",
  "apiKeyPlaintext": "nuevo-token-opcional"
}
```

## Configuracion General - Catalogo ZI (Fase 1)

Base: `/configuracion-general/catalogo-zi`

- `GET /configuracion-general/catalogo-zi/change`
  - Permiso: `config.read`
- `POST /configuracion-general/catalogo-zi/products`
  - Permiso: `config.read`
  - Body: `{ "product": "4" }`
- `POST /configuracion-general/catalogo-zi/prices`
  - Permiso: `config.read`
  - Body: `{ "product": "23031" }`
- `POST /configuracion-general/catalogo-zi/stock`
  - Permiso: `config.read`
  - Body: `{ "product": "3" }`
- `GET /configuracion-general/catalogo-zi/categories/:id`
  - Permiso: `config.read`
- `POST /configuracion-general/catalogo-zi/auth/refresh`
  - Permiso: `config.manage`
  - Requiere `ZI_ALLOW_MANUAL_REFRESH=true`, si no responde `403`.
