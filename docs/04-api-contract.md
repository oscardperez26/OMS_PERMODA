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
