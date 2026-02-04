# Seguridad - OMS

## Autenticación
- Login con usuario/contraseña (o proveedor corporativo si aplica).
- Emisión de JWT (access token).

## Autorización (RBAC)
Roles:
- ADMIN
- OPERADOR
- CONSULTA

## Matriz endpoint vs rol (inicial)
- GET /orders -> ADMIN, OPERADOR, CONSULTA
- GET /orders/:id -> ADMIN, OPERADOR, CONSULTA
- POST /orders/:id/status -> ADMIN, OPERADOR

## Controles mínimos
- Validación estricta de inputs (DTOs).
- No exponer secretos en código.
- Logs sin tokens ni datos sensibles.
- Rate limiting (pendiente de activar en infra).

## Estado actual (Paso 4)
- Autenticación JWT implementada (Bearer Token).
- Endpoint protegido: GET /orders requiere token.
- Autorización RBAC:
  - PATCH /orders/:id/status -> roles ADMIN u OPERADOR.
- Usuarios temporales en memoria (reemplazable por SQL/IdP):
  - admin/admin -> ADMIN, OPERADOR, CONSULTA
  - operador/operador -> OPERADOR, CONSULTA
  - consulta/consulta -> CONSULTA
