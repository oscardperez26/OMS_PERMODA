import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mapZiCategoriaToOms, mapZiProductoToOms, mapZiTarifaToOms } from './mappers/zi-to-oms.mapper';
import { CatalogoZiService } from './catalogo-zi.service';
import { ZiSyncRepository } from './repository/zi-sync.repository';
import type { ZiStockTalla } from './types/zi-api.types';

type PersistProductoResult = {
  productoId: number;
  variantesUpserted: number;
};

type PersistPreciosResult = {
  tarifasUpserted: number;
};

type PersistStockResult = {
  stocksUpserted: number;
};

type PersistCategoriasResult = {
  categoriasUpserted: number;
};

type PersistDeltaResult = {
  total: number;
  productosActualizados: number;
  preciosActualizados: number;
  stockActualizados: number;
  errores: number;
};

@Injectable()
export class ZiPersistService {
  private readonly logger = new Logger(ZiPersistService.name);

  constructor(
    private readonly catalogoZiService: CatalogoZiService,
    readonly repository: ZiSyncRepository,
    private readonly config: ConfigService,
  ) {}

  private get empresaId(): number {
    const raw = this.config.get<string>('ZI_EMPRESA_ID');
    const value = Number(raw);
    if (!Number.isInteger(value) || value <= 0) {
      throw new ServiceUnavailableException('ZI_EMPRESA_ID invalido');
    }
    return value;
  }

  async persistProducto(productoZiId: number): Promise<PersistProductoResult> {
    const productos = await this.catalogoZiService.getProducts(String(productoZiId));
    let lastProductoId = 0;
    let variantesUpserted = 0;

    for (const producto of productos) {
      const mapped = mapZiProductoToOms(producto);
      const categoriaId = await this.repository.resolverCategoriaId(
        this.empresaId,
        producto.catgoria_defecto,
      );

      const productoUpsert = await this.repository.upsertProducto({
        empresaId: this.empresaId,
        skuBase: mapped.producto.SKUBase,
        nombre: mapped.producto.Nombre,
        marca: mapped.producto.Marca,
        activo: mapped.producto.Activo,
        categoriaId,
        origenDatos: mapped.producto.OrigenDatos,
        ziSyncedAt: mapped.producto.ZiSyncedAt,
      });

      lastProductoId = productoUpsert.productoId;

      await this.repository.upsertProductoTexto({
        productoId: productoUpsert.productoId,
        idioma: 'es',
        nombre: mapped.texto.Nombre,
        descripcion: mapped.texto.Descripcion,
        descripcionCorta: mapped.texto.DescripcionCorta,
        metaTitulo: mapped.texto.MetaTitulo,
        metaDescripcion: mapped.texto.MetaDescripcion,
        url: mapped.texto.Url,
      });

      for (const combinacion of producto.combinaciones) {
        const tallaAtributo = combinacion.atributos.find((a) => a.id === 'talla');
        const colorAtributo = combinacion.atributos.find((a) => a.id === 'color');
        const talla = tallaAtributo?.valor ?? '';
        const color = colorAtributo?.valor ?? '';
        // SKU = SKUBase-talla-color (ej: "105101671259-25-155")
        // Si no hay talla/color usa solo el SKUBase para evitar SKUs con guiones vacíos.
        const sku =
          talla && color
            ? `${mapped.producto.SKUBase}-${talla}-${color}`
            : mapped.producto.SKUBase;
        await this.repository.upsertVariante({
          empresaId: this.empresaId,
          productoId: productoUpsert.productoId,
          sku,
          ean: combinacion.ean13,
          activo: mapped.producto.Activo,
          origenDatos: 'ZI',
          ziSyncedAt: new Date(),
          externalTallaId: talla,
          externalColorId: color,
        });
        variantesUpserted += 1;
      }
    }

    if (lastProductoId <= 0) {
      throw new ServiceUnavailableException(
        `ZI no devolvio producto para id=${productoZiId}`,
      );
    }

    return {
      productoId: lastProductoId,
      variantesUpserted,
    };
  }

  async persistPrecios(productoZiId: number): Promise<PersistPreciosResult> {
    const precios = await this.catalogoZiService.getPrices(String(productoZiId));
    let tarifasUpserted = 0;

    for (const item of precios) {
      for (const tarifa of item.tarifas) {
        const mappedTarifa = mapZiTarifaToOms(tarifa);
        const tarifaUpsert = await this.repository.upsertTarifa({
          empresaId: this.empresaId,
          comercialChannel: mappedTarifa.tarifa.ComercialChannel,
          externalTarifaId: mappedTarifa.tarifa.ExternalTarifaId,
          monedaCodigo: mappedTarifa.tarifa.MonedaCodigo,
          impuestoPct: mappedTarifa.tarifa.ImpuestoPct,
        });
        tarifasUpserted += 1;

        for (const detalle of mappedTarifa.detalles) {
          const varianteId = await this.repository.resolverVarianteIdPorTallaColor(
            this.empresaId,
            productoZiId,
            detalle.ExternalTallaId,
            detalle.ExternalColorId,
          );

          if (!varianteId) {
            this.logger.warn(
              `Precio omitido: variante no encontrada producto=${productoZiId}, talla=${detalle.ExternalTallaId}, color=${detalle.ExternalColorId}`,
            );
            continue;
          }

          await this.repository.upsertTarifaDetalle({
            tarifaId: tarifaUpsert.tarifaId,
            varianteId,
            externalTallaId: detalle.ExternalTallaId,
            externalColorId: detalle.ExternalColorId,
            precio: detalle.Precio,
          });
        }

        for (const oferta of mappedTarifa.ofertas) {
          const ofertaUpsert = await this.repository.upsertOferta({
            tarifaId: tarifaUpsert.tarifaId,
            externalOfertaId: oferta.ExternalOfertaId,
            fechaInicio: oferta.FechaInicio,
            fechaFin: oferta.FechaFin,
            precioBase: oferta.PrecioBase,
            activo: true,
          });

          for (const detalleOferta of oferta.detalles) {
            const varianteId = await this.repository.resolverVarianteIdPorTallaColor(
              this.empresaId,
              productoZiId,
              detalleOferta.ExternalTallaId,
              detalleOferta.ExternalColorId,
            );

            if (!varianteId) {
              this.logger.warn(
                `Oferta omitida: variante no encontrada producto=${productoZiId}, talla=${detalleOferta.ExternalTallaId}, color=${detalleOferta.ExternalColorId}`,
              );
              continue;
            }

            await this.repository.upsertOfertaDetalle({
              ofertaId: ofertaUpsert.ofertaId,
              varianteId,
              externalTallaId: detalleOferta.ExternalTallaId,
              externalColorId: detalleOferta.ExternalColorId,
              precio: detalleOferta.Precio,
            });
          }
        }
      }
    }

    return { tarifasUpserted };
  }

  async persistStock(productoZiId: number): Promise<PersistStockResult> {
    const stockItems = await this.catalogoZiService.getStock(String(productoZiId));
    const tiendaMapping = await this.repository.getTiendaMapping();
    let stocksUpserted = 0;

    for (const item of stockItems) {
      for (const tienda of item.stock) {
        const bodegaId = tiendaMapping[tienda.id_tienda];
        if (!bodegaId) {
          this.logger.warn(`id_tienda ${tienda.id_tienda} sin mapeo`);
          continue;
        }

        for (const talla of tienda.tallas.flat()) {
          const normalized = talla as ZiStockTalla & { id_color?: string };
          const externalColorId = normalized.id_Color ?? normalized.id_color;
          if (!externalColorId) {
            this.logger.warn(
              `Stock omitido: color faltante producto=${productoZiId}, tienda=${tienda.id_tienda}, talla=${talla.id_talla}`,
            );
            continue;
          }

          const varianteId = await this.repository.resolverVarianteIdPorTallaColor(
            this.empresaId,
            productoZiId,
            talla.id_talla,
            externalColorId,
          );

          if (!varianteId) {
            this.logger.warn(
              `Stock omitido: variante no encontrada producto=${productoZiId}, talla=${talla.id_talla}, color=${externalColorId}`,
            );
            continue;
          }

          await this.repository.upsertInventario({
            empresaId: this.empresaId,
            bodegaId,
            varianteId,
            stockTotal: Number.parseInt(talla.unidades, 10),
            origenDatos: 'ZI',
            ziSyncedAt: new Date(),
          });
          stocksUpserted += 1;
        }
      }
    }

    return { stocksUpserted };
  }

  async persistCategorias(
    desde: number,
    hasta: number,
  ): Promise<PersistCategoriasResult> {
    const batchSize = this.getBatchSize();
    let categoriasUpserted = 0;

    const ids: number[] = [];
    for (let id = desde; id <= hasta; id += 1) {
      ids.push(id);
    }

    for (let offset = 0; offset < ids.length; offset += batchSize) {
      const batch = ids.slice(offset, offset + batchSize);

      for (const categoryId of batch) {
        try {
          const categoria = await this.catalogoZiService.getCategory(
            String(categoryId),
          );
          if (!categoria.success) {
            this.logger.warn(
              `Categoria omitida: ZI respondio success=false para id=${categoryId}`,
            );
            continue;
          }

          const mapped = mapZiCategoriaToOms(categoria);
          await this.repository.upsertCategoria({
            empresaId: this.empresaId,
            externalCategoryId: mapped.ExternalCategoryId,
            externalParentId: mapped.ExternalParentId,
            nombre: mapped.Nombre,
            activo: mapped.Activo,
            level: mapped.Level,
            sourceTs: mapped.SourceTs,
            apiSuccess: mapped.ApiSuccess,
            apiStatusCode: mapped.ApiStatusCode,
          });
          categoriasUpserted += 1;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Error desconocido';
          this.logger.warn(
            `Categoria omitida por error id=${categoryId}: ${message}`,
          );
        }
      }

      if (offset + batchSize < ids.length) {
        await this.sleep(200);
      }
    }

    return { categoriasUpserted };
  }

  async persistDeltaSync(): Promise<PersistDeltaResult> {
    const change = await this.catalogoZiService.getChange();
    let productosActualizados = 0;
    let preciosActualizados = 0;
    let stockActualizados = 0;
    let errores = 0;

    for (const item of change) {
      const startedAt = new Date();
      let recordsUpdated = 0;

      try {
        const lastHashes = await this.repository.getLastHashes(item.id);

        if (item.hash_Product !== lastHashes.hashProduct) {
          await this.persistProducto(item.id);
          productosActualizados += 1;
          recordsUpdated += 1;
        }

        if (item.hash_Price !== lastHashes.hashPrice) {
          await this.persistPrecios(item.id);
          preciosActualizados += 1;
          recordsUpdated += 1;
        }

        if (item.hash_Stock !== lastHashes.hashStock) {
          await this.persistStock(item.id);
          stockActualizados += 1;
          recordsUpdated += 1;
        }

        if (recordsUpdated > 0) {
          await this.repository.saveLog({
            entity: 'producto',
            productoZiId: item.id,
            hashProduct: item.hash_Product,
            hashPrice: item.hash_Price,
            hashStock: item.hash_Stock,
            startedAt,
            finishedAt: new Date(),
            recordsUpdated,
            status: 'ok',
          });
        }
      } catch (error) {
        errores += 1;
        const message = error instanceof Error ? error.message : String(error);

        this.logger.error(
          `Delta sync fallo para productoZiId=${item.id}: ${message}`,
        );

        await this.repository.saveLog({
          entity: 'producto',
          productoZiId: item.id,
          hashProduct: item.hash_Product,
          hashPrice: item.hash_Price,
          hashStock: item.hash_Stock,
          startedAt,
          finishedAt: new Date(),
          recordsUpdated,
          status: 'error',
          error: message,
        });
      }
    }

    return {
      total: change.length,
      productosActualizados,
      preciosActualizados,
      stockActualizados,
      errores,
    };
  }

  private getBatchSize(): number {
    const raw = this.config.get<string>('ZI_SYNC_BATCH_SIZE');
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) {
      return 100;
    }
    return Math.floor(value);
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
