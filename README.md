# OMS

## Estructura
- `apps/backend-oms`: API NestJS
- `apps/frontend-oms`: Panel React
- `docs`: documentacion funcional y tecnica

## Indice rapido de docs
- `docs/01-vision-y-alcance.md`
- `docs/02-arquitectura.md`
- `docs/03-seguridad.md`
- `docs/04-api-contract.md`
- `docs/05-logistica-transportadora-api-v2.md`
- `docs/06-runbook-sql-econnreset.md`

## Requisitos
- Node `v24.11.0` o `v20`

## Como correr backend
```bash
cd apps/backend-oms
npm i
npm run start:dev
```

Swagger:
- `http://localhost:3000/docs`

## Como correr frontend
```bash
cd apps/frontend-oms
npm i
npm run dev
```

App:
- `http://localhost:5173`

## Usuario de prueba
- `admin/admin` (si ya hiciste auth real) o mock

## Migraciones SQL (manuales)
Ubicacion:
- `apps/backend-oms/scripts/sql`

Orden recomendado:
1. Ejecutar `*.up.sql` de la version requerida.
2. Validar funcionalidad.
3. Ejecutar `*.down.sql` solo para rollback.
