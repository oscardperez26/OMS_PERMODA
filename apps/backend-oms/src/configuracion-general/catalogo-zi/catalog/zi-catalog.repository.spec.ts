import { DatabaseService } from '../../../database/database.service';
import { ZiCatalogRepository } from './zi-catalog.repository';

type QueryInvocation = {
  query: string;
  inputs: Record<string, unknown>;
};

function createDbMock() {
  const invocations: QueryInvocation[] = [];
  let responder: (
    query: string,
    inputs: Record<string, unknown>,
  ) => unknown = () => ({ recordset: [] });

  const databaseService = {
    execute: jest.fn(async (operation: (pool: unknown) => Promise<unknown>) => {
      const inputs: Record<string, unknown> = {};
      const request = {
        input: jest.fn((name: string, _type: unknown, value: unknown) => {
          inputs[name] = value;
          return request;
        }),
        query: jest.fn(async (query: string) => {
          invocations.push({ query, inputs: { ...inputs } });
          return responder(query, { ...inputs });
        }),
      };
      const pool = {
        request: () => request,
      };
      return operation(pool);
    }),
  } as unknown as DatabaseService;

  return {
    databaseService,
    invocations,
    setResponder: (
      fn: (query: string, inputs: Record<string, unknown>) => unknown,
    ) => {
      responder = fn;
    },
  };
}

describe('ZiCatalogRepository', () => {
  it('listProductos sin filtros -> paginado correcto', async () => {
    const db = createDbMock();
    db.setResponder((query) => {
      if (query.includes('COUNT(1) AS [Total]')) {
        return { recordset: [{ Total: 2 }] };
      }
      return {
        recordset: [
          {
            ProductoId: 10,
            SKUBase: '105243',
            Nombre: 'Falda',
            Marca: 'KOAJ',
            Activo: true,
            CategoriaNombre: 'Mujer',
            CategoriaId: 7,
            TotalVariantes: 3,
            PrecioMin: 120000,
            PrecioMax: 229900,
            StockTotal: 55,
            ZiSyncedAt: new Date('2026-03-19T10:00:00.000Z'),
          },
          {
            ProductoId: 11,
            SKUBase: '105244',
            Nombre: 'Camisa',
            Marca: 'KOAJ',
            Activo: true,
            CategoriaNombre: 'Hombre',
            CategoriaId: 8,
            TotalVariantes: 2,
            PrecioMin: 99000,
            PrecioMax: 159900,
            StockTotal: 31,
            ZiSyncedAt: null,
          },
        ],
      };
    });
    const repository = new ZiCatalogRepository(db.databaseService);

    const result = await repository.listProductos(1, {});

    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(50);
    expect(result.totalPages).toBe(1);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].productoId).toBe(10);
  });

  it('listProductos search -> filtra por SKUBase/Nombre/Marca', async () => {
    const db = createDbMock();
    db.setResponder((query) => {
      if (query.includes('COUNT(1) AS [Total]')) {
        return { recordset: [{ Total: 1 }] };
      }
      return { recordset: [] };
    });
    const repository = new ZiCatalogRepository(db.databaseService);

    await repository.listProductos(1, { search: ' KOAJ ' });

    const searchInputs = db.invocations.map((item) => item.inputs.Search);
    expect(searchInputs).toContain('KOAJ');
  });

  it('listProductos categoriaId -> filtra correctamente', async () => {
    const db = createDbMock();
    db.setResponder((query) => {
      if (query.includes('COUNT(1) AS [Total]')) {
        return { recordset: [{ Total: 0 }] };
      }
      return { recordset: [] };
    });
    const repository = new ZiCatalogRepository(db.databaseService);

    await repository.listProductos(1, { categoriaId: '13' });

    const categoriaInputs = db.invocations.map((item) => item.inputs.CategoriaId);
    expect(categoriaInputs).toContain('13');
  });

  it('listProductos soloConStock=true -> excluye sin stock', async () => {
    const db = createDbMock();
    db.setResponder((query) => {
      if (query.includes('COUNT(1) AS [Total]')) {
        return { recordset: [{ Total: 0 }] };
      }
      return { recordset: [] };
    });
    const repository = new ZiCatalogRepository(db.databaseService);

    await repository.listProductos(1, { soloConStock: true });

    const sqlText = db.invocations.map((item) => item.query).join('\n');
    expect(sqlText).toContain('WHERE base.[StockTotal] > 0');
  });

  it('listProductos page=2 -> offset correcto', async () => {
    const db = createDbMock();
    db.setResponder((query) => {
      if (query.includes('COUNT(1) AS [Total]')) {
        return { recordset: [{ Total: 80 }] };
      }
      return { recordset: [] };
    });
    const repository = new ZiCatalogRepository(db.databaseService);

    await repository.listProductos(1, { page: 2, pageSize: 50 });

    const offsets = db.invocations.map((item) => item.inputs.OffsetRows);
    expect(offsets).toContain(50);
  });

  it('listProductos usa CTEs y no infla filas por variantes', async () => {
    const db = createDbMock();
    db.setResponder((query) => {
      if (query.includes('COUNT(1) AS [Total]')) {
        return { recordset: [{ Total: 1 }] };
      }
      return {
        recordset: [
          {
            ProductoId: 25,
            SKUBase: '105999',
            Nombre: 'Producto unico',
            Marca: null,
            Activo: true,
            CategoriaNombre: null,
            CategoriaId: null,
            TotalVariantes: 5,
            PrecioMin: 10000,
            PrecioMax: 20000,
            StockTotal: 10,
            ZiSyncedAt: null,
          },
        ],
      };
    });
    const repository = new ZiCatalogRepository(db.databaseService);

    const result = await repository.listProductos(1, {});
    const sqlText = db.invocations[0].query;

    expect(result.items).toHaveLength(1);
    expect(sqlText).toContain('WITH');
    expect(sqlText).toContain('VariantesCTE');
    expect(sqlText).toContain('StockCTE');
    expect(sqlText).toContain('PrecioCTE');
  });

  it('getProductoDetalle existente -> retorna detalle', async () => {
    const db = createDbMock();
    db.setResponder((query) => {
      if (query.includes('FROM [oms].[Producto] p')) {
        return {
          recordset: [
            {
              ProductoId: 13,
              SKUBase: '105243',
              Nombre: 'Falda',
              Marca: 'KOAJ',
              Activo: true,
              ZiSyncedAt: new Date('2026-03-19T10:00:00.000Z'),
              Descripcion: 'Desc',
              DescripcionCorta: 'Desc corta',
              MetaTitulo: 'Meta',
              MetaDescripcion: 'Meta desc',
              Url: '/falda',
              CategoriaNombre: 'Mujer',
              InstruccionesCuidado: null,
            },
          ],
        };
      }

      if (query.includes('FROM [oms].[ProductoVariante] pv')) {
        return {
          recordset: [
            {
              VarianteId: 100,
              SKU: '13-2-134',
              EAN: '77001',
              TallaId: '2',
              ColorId: '134',
              NombreTalla: 'S',
              NombreColor: 'Negro',
              StockTotal: 5,
              StockDisponible: 4,
            },
          ],
        };
      }

      return {
        recordset: [
          {
            TarifaPrecioId: 1,
            ComercialChannel: 'COLOMBIA',
            MonedaCodigo: 'COP',
            ImpuestoPct: 19,
            PrecioBase: 229900,
            TieneOfertaActiva: 1,
            PrecioOferta: 199900,
          },
        ],
      };
    });
    const repository = new ZiCatalogRepository(db.databaseService);

    const result = await repository.getProductoDetalle(1, 13);

    expect(result).not.toBeNull();
    expect(result?.productoId).toBe(13);
    expect(result?.variantes).toHaveLength(1);
    expect(result?.tarifas).toHaveLength(1);
    expect(result?.tarifas[0].tieneOfertaActiva).toBe(true);
  });

  it('getProductoDetalle sin ProductoTexto -> campos null', async () => {
    const db = createDbMock();
    db.setResponder((query) => {
      if (query.includes('FROM [oms].[Producto] p')) {
        return {
          recordset: [
            {
              ProductoId: 13,
              SKUBase: '105243',
              Nombre: 'Falda',
              Marca: 'KOAJ',
              Activo: true,
              ZiSyncedAt: null,
              Descripcion: null,
              DescripcionCorta: null,
              MetaTitulo: null,
              MetaDescripcion: null,
              Url: null,
              CategoriaNombre: null,
              InstruccionesCuidado: null,
            },
          ],
        };
      }
      return { recordset: [] };
    });
    const repository = new ZiCatalogRepository(db.databaseService);

    const result = await repository.getProductoDetalle(1, 13);

    expect(result?.descripcion).toBeNull();
    expect(result?.metaDescripcion).toBeNull();
    expect(result?.url).toBeNull();
  });

  it('getProductoDetalle inexistente -> retorna null', async () => {
    const db = createDbMock();
    db.setResponder((query) => {
      if (query.includes('FROM [oms].[Producto] p')) {
        return { recordset: [] };
      }
      return { recordset: [] };
    });
    const repository = new ZiCatalogRepository(db.databaseService);

    const result = await repository.getProductoDetalle(1, 99999);

    expect(result).toBeNull();
  });
});
