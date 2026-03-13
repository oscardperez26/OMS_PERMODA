# backend-oms

API OMS construida con NestJS.

## Comandos
```bash
npm i
npm run start:dev
```

## Build y pruebas
```bash
npm run build
npm run test -- --runInBand
```

## Swagger
- `http://localhost:3000/docs`

## Variables de entorno principales
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_ENCRYPT`
- `DB_TRUST_CERT`
- `DB_CONNECTION_TIMEOUT_MS`
- `DB_REQUEST_TIMEOUT_MS`
- `DB_POOL_MIN`
- `DB_POOL_MAX`
- `DB_POOL_IDLE_MS`
- `DB_RETRY_ATTEMPTS` (default `5`)
- `DB_RETRY_BASE_DELAY_MS` (default `200`)
- `DB_RETRY_MAX_DELAY_MS` (default `2000`)
- `AUTH_SECRET`
- `TRANSPORTADORA_API_CRYPTO_KEY_BASE64` (32 bytes base64, recomendado produccion)
- `INBOUND_SYNC_JOB_ENABLED` (default `false`)
- `INBOUND_SYNC_CRON` (default `*/5 * * * *`)
- `INBOUND_SYNC_MAX_CONNECTORS_PER_RUN` (default `10`)
- `INBOUND_SYNC_JOB_LIMIT` (default `200`)
- `INBOUND_SYNC_JOB_INITIAL_DELAY_MS` (default `15000`)

## Modulo Transportadora API Config V2
- Endpoints:
  - `GET /configuracion-general/transportadora/:id/api-config`
  - `PATCH /configuracion-general/transportadora/:id/api-config`
- Seguridad:
  - Permisos `config.read` / `config.manage`
  - Token API nunca se retorna en claro
  - Rotacion de token por `apiKeyPlaintext`

## Migraciones SQL
Scripts en:
- `scripts/sql`

V2 transportadora API config:
- `20260312_transportadora_api_config_v2.up.sql`
- `20260312_transportadora_api_config_v2.down.sql`

V3 integraciones entrantes multi-proveedor:
- `20260312_integraciones_inbound_multi_provider_v3.up.sql`
- `20260312_integraciones_inbound_multi_provider_v3.down.sql`

## Documentacion extendida
Ver en raiz del repo:
- `../docs/04-api-contract.md`
- `../docs/05-logistica-transportadora-api-v2.md`
- `../docs/06-runbook-sql-econnreset.md`
- `../docs/07-integraciones-entrantes-v1.md`
