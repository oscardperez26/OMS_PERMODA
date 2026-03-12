# Runbook - SQL ECONNRESET / Pool aborted

## Objetivo
Estandarizar el diagnostico cuando el backend NestJS reporta:
- `ConnectionError: Connection lost - read ECONNRESET`
- `Error: aborted` en `tarn` pool

## Sintomas comunes
- Frontend muestra `Internal server error`.
- Algunas pantallas cargan parcialmente y luego fallan.
- En logs aparece:
  - `Fallo transitorio ... Reintentando`
  - `Conexion SQL inestable detectada. Se recrea el pool`

## Causa real
No es error de datos funcionales. Es corte de conexion entre API y SQL Server (socket reset).

## Verificaciones rapidas
1. Health DB:
   - `GET http://localhost:3000/health/db`
2. Confirmar que SQL Server esta arriba y estable.
3. Confirmar puerto configurado:
   - `.env`: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`.
4. Confirmar que no hay reinicios del servicio SQL ni cambios de puerto dinamico.

## Comandos utiles (PowerShell)
Prueba repetida de salud DB:

```powershell
1..20 | % {
  try {
    (Invoke-WebRequest http://localhost:3000/health/db -UseBasicParsing -TimeoutSec 5).StatusCode
  } catch {
    $_.Exception.Message
  }
  Start-Sleep -Milliseconds 500
}
```

## Ajustes recomendados en `.env`
Para mejorar tolerancia en local:

```env
DB_POOL_MIN=0
DB_POOL_MAX=5
DB_CONNECTION_TIMEOUT_MS=30000
DB_REQUEST_TIMEOUT_MS=60000
DB_POOL_IDLE_MS=60000
```

Notas:
- `DB_POOL_MIN=0` evita mantener conexiones ociosas inestables.
- Reducir `DB_POOL_MAX` limita presion al servidor local.
- Timeouts mas amplios reducen falsos positivos en ambientes lentos.

## Diagnostico SQL Server
- Revisar estado del servicio SQL Server.
- Revisar eventos de red y reinicios del servicio.
- Si usas puerto dinamico, fijar puerto TCP estable para desarrollo.
- Verificar firewall o antivirus que cierre sockets inactivos.

## Pasos de recuperacion
1. Ajustar `.env` con valores recomendados.
2. Reiniciar backend (`npm run start:dev`).
3. Reintentar `health/db` en loop.
4. Reprobar pantalla funcional.
5. Si persiste, validar SQL logs y red local.

## Prevencion
- Usar instancia SQL local con puerto fijo.
- Evitar suspender/hibernar equipo con backend activo por largos periodos.
- Mantener version estable de SQL Server y driver.
- Monitorear tasa de reconexion en logs del backend.
