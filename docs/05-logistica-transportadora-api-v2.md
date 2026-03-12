# Logistica - Transportadora API V2

## Objetivo
Documentar la implementacion V2 de configuracion API por transportadora, con persistencia y manejo seguro de secretos.

## Alcance V2
- Pantalla editable en frontend:
  - `/panel/order-manager/configuracion-general/transportadora/:id/api`
- Persistencia en SQL Server mediante tabla dedicada:
  - `oms.TransportadoraApiConfig`
- Seguridad:
  - El token nunca se devuelve en claro.
  - Rotacion de token por reemplazo.
- Permisos:
  - `config.read`: lectura.
  - `config.manage`: edicion.

## Rutas frontend relacionadas
- Padre logistica:
  - `/panel/order-manager/configuracion-general/logistica`
- Listado transportadoras:
  - `/panel/order-manager/configuracion-general/transportadora`
- Config API por transportadora:
  - `/panel/order-manager/configuracion-general/transportadora/:id/api`

## Endpoints backend
- `GET /configuracion-general/transportadora/:id/api-config`
  - Permiso: `config.read`
  - Responde:
    - `transportadora`
    - `apiConfig`
    - `hasApiKey`
    - `apiKeyLastRotatedAt`
- `PATCH /configuracion-general/transportadora/:id/api-config`
  - Permiso: `config.manage`
  - Upsert de configuracion API.
  - Si llega `apiKeyPlaintext`, rota token.

## Modelo de datos
Tabla: `oms.TransportadoraApiConfig`

Campos principales:
- `TransportadoraId` (PK/FK a `oms.Transportadora`)
- `BaseUrl`
- `AuthType` (solo `API_KEY`)
- `ApiKeyCiphertext`
- `ApiKeyIv`
- `ApiKeyTag`
- `TimeoutMs`
- `CreateShipmentEndpoint`
- `TrackingEndpointTemplate`
- `TrackingNumberField`
- `StatusField`
- `ApiKeyLastRotatedAt`
- `CreatedAt`
- `UpdatedAt`

Restricciones:
- `AuthType` restringido a `API_KEY` por `CHECK`.

## Validaciones de negocio
- `baseUrl` debe ser URL valida con `https`.
- `authType` solo permite `API_KEY`.
- `timeoutMs` en rango `1000..60000`.
- `createShipmentEndpoint` y `trackingEndpointTemplate` deben iniciar con `/`.
- `trackingNumberField` y `statusField` se normalizan como texto opcional no vacio.
- Si no existe registro de configuracion, el `GET` devuelve defaults.

## Seguridad de secretos
- Cifrado backend: `AES-256-GCM`.
- Servicio: `TransportadoraApiCryptoService`.
- Fuente de clave:
  - `TRANSPORTADORA_API_CRYPTO_KEY_BASE64` (recomendado produccion, 32 bytes base64).
  - Fallback dev: derivado de `AUTH_SECRET`.
- Respuesta API:
  - Nunca incluye `apiKeyPlaintext`.
  - Solo expone estado: `hasApiKey`, `apiKeyLastRotatedAt`.

## Flujo funcional
1. Usuario abre `:id/api`.
2. Frontend consulta `GET :id/api-config`.
3. Frontend muestra:
   - Contexto de transportadora.
   - Estado de token (`Si/No`), ultima rotacion.
4. Usuario con `config.manage` edita y guarda.
5. Frontend llama `PATCH :id/api-config`.
6. Backend valida, cifra (si aplica), persiste y responde `success`.

## Migraciones asociadas
- `scripts/sql/20260312_transportadora_api_config_v2.up.sql`
- `scripts/sql/20260312_transportadora_api_config_v2.down.sql`

Orden de ejecucion:
1. Ejecutar `up`.
2. Verificar tabla y FK.
3. Probar frontend/backend.
4. Usar `down` solo si se requiere rollback.

## Checklist tecnico
- [ ] Migracion `up` ejecutada en ambiente correcto.
- [ ] Backend reiniciado con `.env` cargado.
- [ ] Endpoint `GET :id/api-config` responde 200.
- [ ] Endpoint `PATCH :id/api-config` persiste cambios.
- [ ] `apiKeyPlaintext` no aparece en respuestas ni logs.
- [ ] Usuario sin `config.manage` no puede editar.

## Pruebas recomendadas
- Guardar configuracion sin token (no rota secreto).
- Guardar configuracion con token (rota secreto).
- Validar rechazo en:
  - URL sin `https`
  - timeout fuera de rango
  - endpoint sin `/`
- Confirmar que CRUD de transportadora y `:id/configuracion` sigue estable.
