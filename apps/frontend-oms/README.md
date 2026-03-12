# frontend-oms

Panel OMS construido con React + TypeScript + Vite.

## Comandos
```bash
npm i
npm run dev
```

## Build y lint
```bash
npm run build
npm run lint
```

## URL local
- `http://localhost:5173`

## Modulos relevantes (logistica)
- Dashboard padre:
  - `/panel/order-manager/configuracion-general/logistica`
- Transportadoras:
  - `/panel/order-manager/configuracion-general/transportadora`
- API por transportadora:
  - `/panel/order-manager/configuracion-general/transportadora/:id/api`

## Reglas de permisos UI
- `config.read`: puede ver.
- `config.manage`: puede editar y guardar.

## Documentacion extendida
Ver en raiz del repo:
- `../docs/04-api-contract.md`
- `../docs/05-logistica-transportadora-api-v2.md`
- `../docs/06-runbook-sql-econnreset.md`
