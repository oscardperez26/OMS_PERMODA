# 11 - Zona de Integracion V1 (ZI + Entrantes)

## 1) Objetivo

Centralizar en Configuracion General una vista operativa para:

- estado de jobs de autosync,
- alertas de configuracion,
- corridas recientes de ZI,
- acciones manuales controladas por permisos.

## 2) Endpoint de estado operativo

Base path: `/configuracion-general/catalogo-zi`

- `GET /ops/status` (`config.read`)
  - Entrega:
    - `jobs.zi` (enabled, cron fijo por tarea, empresa/batch),
    - `jobs.inbound` (enabled, cron, limits),
    - `jobs.ordersLegacy` (enabled, interval/limit),
    - `alerts` (reglas operativas),
    - `healthSummary` (ultimas 24h y ultimo resultado),
    - `ziLastRuns` (top corridas desde `oms.ZiSyncLog`).

Regla destacada:

- Si `INBOUND_SYNC_JOB_ENABLED=true` y `ORDERS_SYNC_FULL_JOB_ENABLED=true`,
  se retorna alerta `WARN` por posible duplicidad de corridas de pedidos entrantes.

## 3) Acciones manuales ZI (existentes, reutilizadas)

- `POST /sync/full` (`config.manage`)
- `POST /sync/categorias` (`config.manage`)
- `POST /sync/producto/:id` (`config.manage`)

## 4) Politica recomendada de operacion

- Mantener un unico orquestador para pedidos entrantes:
  - `INBOUND_SYNC_JOB_ENABLED=true`
  - `ORDERS_SYNC_FULL_JOB_ENABLED=false`
- Mantener ZI autosync activo en ambientes operativos:
  - `ZI_SYNC_ENABLED=true`

## 5) Notas de seguridad y alcance

- `ops/status` no expone credenciales, tokens ni secretos.
- V1 no permite editar cron/variables desde UI.
- Los locks actuales permanecen in-memory (mejora distribuida queda para fase posterior).
