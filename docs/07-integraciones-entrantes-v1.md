# Integraciones Entrantes V1.1 - Guia de Creacion y Roadmap

## Objetivo
Definir como crear y operar un conector de integracion entrante para recibir pedidos confirmados desde un e-commerce hacia OMS.

Esta guia aplica al modulo:
- `/panel/order-manager/configuracion-general/pagos-integraciones/entrantes`

## Alcance V1
- Se configura 1 conector entrante por canal (regla actual).
- Se usa sincronizacion manual con boton `Sincronizar ahora`.
- El flujo ingiere pedidos externos y los persiste en OMS.
- No hay creacion manual de pedidos en este modulo.

## Modelo usado en V1
- Tabla: `oms.Integracion`
- Campo clave:
  - `Codigo`: identificador interno del conector
  - `ConfigJson`: configuracion tecnica del proveedor
  - `Estado`: activo/inactivo de la integracion

## Significado de campos (formulario Entrantes)

### Identidad del conector
- `Empresa`: empresa propietaria del conector.
- `Canal venta`: canal donde se clasifica el pedido entrante.
- `Codigo conector`: id interno unico (ej: `KOAJ_INBOUND`).
- `Nombre`: etiqueta operativa visible en panel.
- `Activo`: habilita o inhabilita ejecucion.

### Proveedor y modo
- `providerCode`: nombre tecnico del proveedor (`KOAJ`, `SHOPIFY`, etc).
- `mode`:
  - `KOAJ_PILOT`: usa el adaptador piloto actual.
  - `GENERIC`: deja estructura preparada para nuevos proveedores.

### Conexion
- `baseUrl`: URL base del API externo.
- `timeoutMs`: tiempo maximo por llamada HTTP.

### Endpoints
- `listConfirmedOrdersEndpoint`: ruta para listar pedidos confirmados.
- `orderDetailEndpoint`: ruta para consultar detalle de pedido.

### Filtro de estados
- `confirmedStatuses`: estados externos que OMS acepta para ingesta.
- Formato: CSV (ej: `CONFIRMED,PAID`).

### Mapping de payload externo
- `externalOrderIdField`: campo unico externo del pedido.
- `externalReferenceField`: referencia comercial visible.
- `customerNameField`: campo para nombre del cliente.
- `totalField`: campo para total del pedido.
- `statusField`: campo de estado externo.

### Validacion y ejecucion
- `validation`: resultado de validar configuracion.
- `lastSync`: ultimo intento de sync con trazabilidad operativa:
  - `runId`, `status`, `message`, `durationMs`, `executedBy`
  - resumen (`recibidos`, `ingestados`, `duplicados`, `fallidos`)
  - `errorCode`, `errorMessage`, `diagnosticsSummary`

## Estados operativos V1.1
- `OK`: ejecucion completada correctamente.
- `BLOCKED`: ejecucion bloqueada por diagnosticos, configuracion invalida o modo no implementado.
- `FAILED`: fallo tecnico en runtime (API/DB/red) durante sync.

Estos estados se exponen en:
- respuesta de `validate`
- respuesta de `sync-now`
- columnas del listado en UI (`Ultimo resultado`, `Duracion`, `Ultimo error`)

## Flujo operativo V1
1. Configurar conector en Entrantes.
2. Ejecutar `Validar`.
3. Si valida OK, ejecutar `Sincronizar ahora`.
4. Revisar resumen de resultado.
5. Confirmar pedidos en `/panel/sell/orders`.

## Guia de creacion (paso a paso)
1. Ir a `Pagos e Integraciones -> Integraciones Entrantes`.
2. Elegir `Plantilla` (si aplica) y `Aplicar plantilla`.
3. Completar identidad: `Empresa`, `Canal`, `Codigo`, `Nombre`.
4. Configurar tecnica: `providerCode`, `mode`, `baseUrl`, `timeoutMs`.
5. Completar endpoints y estados confirmados.
6. Completar mapping minimo:
   - `externalOrderIdField`
   - `statusField`
7. Guardar.
8. Validar.
9. Sincronizar.

## Errores comunes y causa
- `connection.baseUrl es obligatorio`:
  - falta `baseUrl` para el modo/configuracion actual.
- `endpoint ... debe iniciar con "/"`:
  - endpoint sin slash inicial.
- `confirmedStatuses requiere al menos un estado`:
  - CSV vacio.
- `mapping.externalOrderIdField es obligatorio`:
  - no se definio id externo unico.
- `mapping.statusField es obligatorio`:
  - no se definio campo de estado.

## Codigos de error normalizados (V1.1)
| Codigo | Significado operativo |
|---|---|
| `VALIDATION_ERROR` | La configuracion no cumple reglas de validacion. |
| `CONFIG_CHANGED` | Se modifico configuracion funcional y exige nueva validacion. |
| `CONFIG_INVALID` | Se intento sync con configuracion invalida. |
| `SYNC_NOT_IMPLEMENTED` | Proveedor/modo aun no tiene sync real habilitado. |
| `UPSTREAM_CONNECTION_ERROR` | Fallo temporal de conexion hacia API/DB en sync. |
| `UPSTREAM_TIMEOUT` | Timeout durante sync. |
| `SYNC_RUNTIME_ERROR` | Error tecnico no clasificado durante sync. |

## Lectura de diagnosticos (lastSync.diagnosticsSummary)
- `total`: cantidad total de chequeos ejecutados.
- `ok`: chequeos aprobados.
- `failed`: chequeos fallidos.
- `failedCodes`: codigos de diagnostico fallidos para analisis rapido.

Uso recomendado:
1. Revisar `status`.
2. Revisar `message` y `errorCode`.
3. Revisar `failedCodes`.
4. Corregir configuracion/entorno y reintentar `Validar` + `Sincronizar`.

## Script de seed piloto (KOAJ)
Para cargar o actualizar conector de prueba:
- `apps/backend-oms/scripts/sql/20260312_seed_koaj_inbound_integracion.sql`

Uso:
1. Ejecutar script en SQL Server (DB `OMS`).
2. Reiniciar backend si aplica.
3. Abrir pantalla Entrantes y validar/sincronizar.

## Lo que falta por versiones

### V1.1 (hardening) - implementado
- Observabilidad operativa por conector en `oms.Log` (modulo `INTEGRACIONES_ENTRANTES`).
- Manejo robusto de errores transitorios SQL/API con normalizacion.
- Respuesta estandarizada con `status` y `message`.
- Persistencia de resultado de intento en `lastSync` (exitoso o fallido).

### V2 (automatizacion) - implementado en backend (manual + auto conviven)
- Job automatico de Entrantes habilitable por entorno:
  - `INBOUND_SYNC_JOB_ENABLED`
  - `INBOUND_SYNC_CRON`
  - `INBOUND_SYNC_MAX_CONNECTORS_PER_RUN`
- Ejecucion por lote sobre conectores entrantes activos (sin romper `sync-now` manual).
- Lock por conector para evitar solapamientos (`SYNC_IN_PROGRESS`).
- Se mantiene boton manual mientras termina la transicion operativa.

### V3 (escalamiento multi-proveedor)
- Multiples conectores activos por empresa.
- Versionado de mapping por proveedor.
- Reintentos con politica por tipo de error.

### V4 (integracion saliente completa)
- Encadenar salida a Zona de Integracion.
- Con factura generada, invocar API de transportadora para guia.
- Trazabilidad end-to-end de pedido externo -> pedido interno -> factura -> guia.

## Checklist de aceptacion V1.1
- [ ] Conector creado y visible en listado.
- [ ] Validacion ejecuta y muestra `status`, `message`, `runId`.
- [ ] Sync manual responde `status` y guarda `lastSync` con metadatos.
- [ ] Error tecnico no expone stack crudo en UI.
- [ ] Eventos de `validate/sync-now` quedan registrados en `oms.Log`.
- [ ] Pedidos entrantes aparecen en Orders con origen.
- [ ] No hay creacion manual de pedidos en este modulo.
