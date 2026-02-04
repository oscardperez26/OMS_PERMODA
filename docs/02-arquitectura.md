# Arquitectura - OMS

## Componentes
- Frontend (React + TS): panel de operación.
- Backend (NestJS + TS): lógica, seguridad, consumo de APIs, acceso a SQL.
- SQL: base de datos alimentada por ETL.
- APIs externas: fuentes/acciones complementarias.

## Flujo de datos
- Lectura principal: SQL (datos cargados por ETL).
- Acciones/tiempo real: APIs externas (cuando aplique).
- El OMS NO ejecuta ETL.

## Decisiones de arquitectura


- Monorepo: front y back versionados juntos.
- Documentación: Swagger + docs en /docs.
- Seguridad: JWT + RBAC + validación DTO.


## Estado actual (Paso 2)
- Backend NestJS creado.
- Swagger disponible en /docs.
- Modo MOCK habilitado por variable MOCK_MODE=true.
- Módulos creados: auth, orders.
- Orders consume archivo src/mocks/orders.mock.json para responder.

## Estado actual (Paso 3)
- Frontend React creado (Vite + TS).
- Rutas: /login y /orders.
- Layout con menú lateral.
- Integración con backend:
  - POST /auth/login
  - GET /orders (con filtros reference, customer, status)

