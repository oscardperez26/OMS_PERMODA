import type {
  ZiCategoriaResponse,
  ZiProducto,
  ZiTarifa,
} from '../types/zi-api.types';
import {
  mapZiCategoriaToOms,
  mapZiProductoToOms,
  mapZiStockToOms,
  mapZiTarifaToOms,
} from './zi-to-oms.mapper';

function buildProducto(): ZiProducto {
  return {
    id: 4,
    nombre: { es: 'Camiseta basica' },
    referencia: 'REF-001',
    activo: true,
    descripcion: { es: 'Descripcion larga' },
    descripcion_corta: { es: 'Descripcion corta' },
    meta_titulo: { es: 'Meta titulo' },
    'meta_descripción': { es: 'Meta descripcion con acento' },
    url: { es: '/camiseta-basica' },
    marca: 'KOAJ',
    catgoria_defecto: '10',
    categorias: ['10', '11'],
    instruccionesCuidado: null,
    instruccionesLavado: null,
    composicion: null,
    ruc: 'RUC1',
    combinaciones: [
      {
        id: 'SKU-COMB-001',
        ean13: '7701234567890',
        atributos: [
          { id: 'talla', valor: 'M' },
          { id: 'color', valor: 'NEGRO' },
        ],
      },
    ],
    propiedades: [{ id: 'material', valor: 'algodon' }],
  };
}

function buildTarifa(): ZiTarifa {
  return {
    comercialChannel: 'UNICO',
    id_tarifa: 'T1',
    moneda: 'COP',
    impuesto: '19.00',
    precio_base: '229900.00',
    precio_tallas: [{ id_talla: 'M', id_color: 'NEGRO', precio: '229900.00' }],
    ofertas: [
      {
        id_oferta: 'OF1',
        fecha_inicio: '2026/03/13',
        fecha_fin: '2026/03/20',
        precio_base: '199900.00',
        precio_tallas: [
          { id_talla: 'M', id_color: 'NEGRO', precio: '199900.00' },
        ],
      },
    ],
  };
}

describe('zi-to-oms.mapper', () => {
  it('mapZiProductoToOms: SKUBase = referencia', () => {
    const mapped = mapZiProductoToOms(buildProducto());
    expect(mapped.producto.SKUBase).toBe('REF-001');
  });

  it("mapZiProductoToOms: usa 'meta_descripción' con acento", () => {
    const mapped = mapZiProductoToOms(buildProducto());
    expect(mapped.texto.MetaDescripcion).toBe('Meta descripcion con acento');
  });

  it('mapZiProductoToOms: combinacion.id queda como SKU', () => {
    const mapped = mapZiProductoToOms(buildProducto());
    expect(mapped.combinaciones[0].SKU).toBe('SKU-COMB-001');
  });

  it('mapZiStockToOms: tallas.flat() aplana correctamente', () => {
    const mapped = mapZiStockToOms(
      [
        {
          id_tienda: '828',
          tallas: [
            [{ id_talla: 'M', id_Color: '1', unidades: '5' }],
            [{ id_talla: 'L', id_Color: '1', unidades: '2' }],
          ],
        },
      ],
      { '828': 100 },
    );

    expect(mapped).toHaveLength(2);
  });

  it('mapZiStockToOms: id_tienda sin mapeo retorna [] sin error', () => {
    const mapped = mapZiStockToOms(
      [
        {
          id_tienda: '999',
          tallas: [[{ id_talla: 'M', id_Color: '1', unidades: '5' }]],
        },
      ],
      {},
    );

    expect(mapped).toEqual([]);
  });

  it('mapZiStockToOms: unidades "5" se convierte con parseInt a 5', () => {
    const mapped = mapZiStockToOms(
      [
        {
          id_tienda: '828',
          tallas: [[{ id_talla: 'M', id_Color: '1', unidades: '5' }]],
        },
      ],
      { '828': 100 },
    );

    expect(mapped[0].StockTotal).toBe(5);
  });

  it('mapZiTarifaToOms: precio "229900.00" se convierte a 229900', () => {
    const mapped = mapZiTarifaToOms(buildTarifa());
    expect(mapped.detalles[0].Precio).toBe(229900);
  });

  it('mapZiTarifaToOms: fecha "2026/03/13" se convierte en Date valido', () => {
    const mapped = mapZiTarifaToOms(buildTarifa());
    expect(Number.isNaN(mapped.ofertas[0].FechaInicio.getTime())).toBe(false);
  });

  it('mapZiCategoriaToOms mapea categoria externa', () => {
    const category: ZiCategoriaResponse = {
      id: 22,
      isActive: true,
      ts: '2026-03-17T00:00:00.000Z',
      name: 'HOMBRE',
      dependOnId: 0,
      level: '1',
      success: true,
      statusCode: 200,
    };
    const mapped = mapZiCategoriaToOms(category);
    expect(mapped.ExternalCategoryId).toBe('22');
  });
});
