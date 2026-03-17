import type {
  ZiCategoriaResponse,
  ZiProducto,
  ZiStockTalla,
  ZiStockTienda,
  ZiTarifa,
} from '../types/zi-api.types';

export function mapZiProductoToOms(p: ZiProducto) {
  return {
    producto: {
      SKUBase: p.referencia,
      Nombre: p.nombre.es,
      Marca: p.marca,
      Activo: p.activo,
      OrigenDatos: 'ZI' as const,
      ZiSyncedAt: new Date(),
    },
    texto: {
      Idioma: 'es',
      Nombre: p.nombre.es,
      Descripcion: p.descripcion.es,
      DescripcionCorta: p.descripcion_corta.es,
      MetaTitulo: p.meta_titulo.es,
      MetaDescripcion: p['meta_descripción'].es,
      Url: p.url.es,
    },
    categorias: p.categorias,
    combinaciones: p.combinaciones.map((c) => ({
      SKU: c.id,
      EAN: c.ean13,
      idTalla: c.atributos.find((a) => a.id === 'talla')?.valor ?? null,
      idColor: c.atributos.find((a) => a.id === 'color')?.valor ?? null,
      OrigenDatos: 'ZI' as const,
      ZiSyncedAt: new Date(),
    })),
    propiedades: p.propiedades,
  };
}

export function mapZiTarifaToOms(t: ZiTarifa) {
  return {
    tarifa: {
      ComercialChannel: t.comercialChannel,
      ExternalTarifaId: t.id_tarifa,
      MonedaCodigo: t.moneda,
      ImpuestoPct: parseFloat(t.impuesto),
      Activo: true,
      SourceTs: new Date(),
    },
    detalles: t.precio_tallas.map((pt) => ({
      ExternalTallaId: pt.id_talla,
      ExternalColorId: pt.id_color,
      Precio: parseFloat(pt.precio),
    })),
    ofertas: t.ofertas.map((o) => ({
      ExternalOfertaId: o.id_oferta,
      FechaInicio: new Date(o.fecha_inicio.replace(/\//g, '-')),
      FechaFin: new Date(o.fecha_fin.replace(/\//g, '-')),
      PrecioBase: parseFloat(o.precio_base),
      detalles: o.precio_tallas.map((pt) => ({
        ExternalTallaId: pt.id_talla,
        ExternalColorId: pt.id_color,
        Precio: parseFloat(pt.precio),
      })),
    })),
  };
}

export function mapZiStockToOms(
  tiendas: ZiStockTienda[],
  tiendaMapping: Record<string, number>,
): Array<{
  BodegaId: number;
  idTalla: string;
  idColor: string;
  StockTotal: number;
  OrigenDatos: 'ZI';
  ZiSyncedAt: Date;
}> {
  return tiendas.flatMap((tienda) => {
    const bodegaId = tiendaMapping[tienda.id_tienda];
    if (!bodegaId) return [];

    // Bugs ZI:
    // - tallas llega como matriz de matrices.
    // - id de color puede llegar como id_Color o id_color.
    return tienda.tallas.flat().map((talla) => {
      const normalizada = talla as ZiStockTalla & { id_color?: string };
      return {
        BodegaId: bodegaId,
        idTalla: talla.id_talla,
        idColor: normalizada.id_Color ?? normalizada.id_color ?? '',
        StockTotal: parseInt(talla.unidades, 10),
        OrigenDatos: 'ZI' as const,
        ZiSyncedAt: new Date(),
      };
    });
  });
}

export function mapZiCategoriaToOms(c: ZiCategoriaResponse) {
  return {
    ExternalCategoryId: String(c.id),
    ExternalParentId: c.dependOnId === 0 ? null : String(c.dependOnId),
    Nombre: c.name,
    Activo: c.isActive,
    Level: c.level,
    IsActiveExternal: c.isActive,
    SourceTs: new Date(c.ts),
    ApiSuccess: c.success,
    ApiStatusCode: c.statusCode,
  };
}
