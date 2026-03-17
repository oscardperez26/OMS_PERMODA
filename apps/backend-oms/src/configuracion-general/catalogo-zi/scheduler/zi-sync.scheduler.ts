import { Injectable } from '@nestjs/common';

@Injectable()
export class ZiSyncSchedulerService {
  // FASE 2: activar @Cron y conectar repositorio.
  //
  // Frecuencias objetivo:
  // @Cron('*/20 * * * *') syncStock()      -> cada 20 min
  // @Cron('0 */2 * * *')  syncPrecios()    -> cada 2h
  // @Cron('0 */6 * * *')  syncProductos()  -> cada 6h
  // @Cron('0 0 * * *')    syncCategorias() -> cada 24h
  //
  // ALGORITMO DELTA SYNC con /Change:
  // 1) GET /Change -> lista { id, hash_Product, hash_Price, hash_Stock }.
  // 2) Para cada item, comparar con oms.ZiSyncLog ultimo registro:
  //    - hash_Product cambio -> POST /Products -> upsert Producto+Variante.
  //    - hash_Price cambio   -> POST /Prices   -> upsert TarifaPrecio+Detalle+Oferta.
  //    - hash_Stock cambio   -> POST /Stock    -> upsert Inventario por tienda.
  //    - sin cambios         -> saltar (0 llamadas).
  // 3) Guardar nuevos hashes en oms.ZiSyncLog.
  //
  // MAPEO TIENDAS: id_tienda de ZI -> BodegaId de OMS.
  //   Requiere tabla oms.ZiTiendaMapping poblada manualmente.
  //   Si id_tienda no tiene mapeo: loggear y saltar (no lanzar error).
  //
  // VOLUMEN: hasta 23031 productos, 809 categorias.
  //   Procesar en lotes de 100 para no saturar ZI ni BD.
}
