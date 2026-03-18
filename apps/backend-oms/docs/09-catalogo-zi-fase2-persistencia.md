# 09 - Catalogo ZI Fase 2 Persistencia

## 1) Prerequisitos obligatorios antes de activar

- [ ] Completar `BodegaId` en `scripts/sql/20260318_zi_tienda_mapping_seed.sql`
- [ ] Ejecutar el seed SQL
- [ ] Configurar `ZI_EMPRESA_ID=1` en `.env`
- [ ] Configurar `ZI_SYNC_ENABLED=true` en `.env`
- [ ] Verificar: `SELECT COUNT(*) FROM oms.ZiTiendaMapping > 0`

## 2) Primer sync completo (orden obligatorio)

1. `POST /configuracion-general/catalogo-zi/sync/categorias`
   - Esperar respuesta completa.
2. `POST /configuracion-general/catalogo-zi/sync/producto/4`
   - Probar un producto antes del full sync.
3. `POST /configuracion-general/catalogo-zi/sync/full`
   - Puede tardar varios minutos (hasta 23031 productos).

## 3) Como verificar el sync

```sql
SELECT TOP 10 SKUBase, OrigenDatos, ZiSyncedAt
FROM oms.Producto
WHERE OrigenDatos = 'ZI';

SELECT TOP 10 *
FROM oms.ZiSyncLog
ORDER BY CreatedAt DESC;

SELECT COUNT(*) FROM oms.TarifaPrecio;
SELECT COUNT(*) FROM oms.ProductoTexto;
```

## 4) Variables de entorno nuevas

- `ZI_EMPRESA_ID=1`
- `ZI_SYNC_BATCH_SIZE=100`
- `ZI_SYNC_ENABLED=true`

## 5) Diferencia SKUs sistema antiguo vs ZI

- Antiguo: `10C205692553-909` (referencia-color)
- ZI: `4-2-134` (productoId-tallaId-colorId)
- Coexisten sin colision porque `OrigenDatos` los distingue.

## 6) Manejo de errores del scheduler

- Cada producto del delta sync se procesa en `try/catch` independiente.
- Si falla un producto:
  - Se guarda log de error en `oms.ZiSyncLog`.
  - Se continua con el siguiente producto.
- Un error puntual no detiene el sync completo.

## 7) Pendiente Fase 3

Antes de mapear ZI al catalogo oficial, resolver:

- Que pasa con los 16 productos/variantes existentes del sistema antiguo.
