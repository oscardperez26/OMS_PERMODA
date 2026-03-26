import { DatabaseService } from '../../../database/database.service';
import { ZiSyncRepository } from './zi-sync.repository';

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

describe('ZiSyncRepository', () => {
  it('upsertProducto nuevo -> created=true, retorna productoId', async () => {
    const db = createDbMock();
    db.setResponder(() => ({
      recordset: [{ MergeAction: 'INSERT', ProductoId: 101 }],
    }));
    const repository = new ZiSyncRepository(db.databaseService);

    const result = await repository.upsertProducto({
      empresaId: 1,
      skuBase: '105243691003',
      nombre: 'Producto ZI',
      marca: 'KOAJ',
      activo: true,
      categoriaId: 7,
      origenDatos: 'ZI',
      ziSyncedAt: new Date('2026-03-17T10:00:00.000Z'),
    });

    expect(result).toEqual({ productoId: 101, created: true });
  });

  it('upsertProducto existente -> created=false, actualiza campos', async () => {
    const db = createDbMock();
    db.setResponder(() => ({
      recordset: [{ MergeAction: 'UPDATE', ProductoId: 101 }],
    }));
    const repository = new ZiSyncRepository(db.databaseService);

    const result = await repository.upsertProducto({
      empresaId: 1,
      skuBase: '105243691003',
      nombre: 'Producto ZI actualizado',
      marca: 'KOAJ',
      activo: false,
      categoriaId: null,
      origenDatos: 'ZI',
      ziSyncedAt: new Date('2026-03-17T10:05:00.000Z'),
    });

    expect(result).toEqual({ productoId: 101, created: false });
    expect(db.invocations[0].query).toContain('WHEN MATCHED THEN');
  });

  it('upsertVariante SKU "4-2-134" -> upsert correcto', async () => {
    const db = createDbMock();
    db.setResponder(() => ({
      recordset: [{ MergeAction: 'INSERT', VarianteId: 9001 }],
    }));
    const repository = new ZiSyncRepository(db.databaseService);

    const result = await repository.upsertVariante({
      empresaId: 1,
      productoId: 4,
      sku: '4-2-134',
      ean: '7700000000001',
      activo: true,
      origenDatos: 'ZI',
      ziSyncedAt: new Date(),
      externalTallaId: '2',
      externalColorId: '134',
    });

    expect(result).toEqual({ varianteId: 9001, created: true });
    expect(db.invocations[0].inputs.SKU).toBe('4-2-134');
  });

  it('upsertTarifa usa clave EmpresaId + ComercialChannel (no ExternalTarifaId)', async () => {
    const db = createDbMock();
    db.setResponder(() => ({
      recordset: [{ TarifaPrecioId: 500 }],
    }));
    const repository = new ZiSyncRepository(db.databaseService);

    const result = await repository.upsertTarifa({
      empresaId: 1,
      comercialChannel: 'COLOMBIA',
      externalTarifaId: 'TAR-123',
      monedaCodigo: ' cop ',
      impuestoPct: 19,
    });

    expect(result).toEqual({ tarifaId: 500 });
    expect(db.invocations[0].inputs.ComercialChannel).toBe('COLOMBIA');
    expect(db.invocations[0].inputs.ExternalTarifaId).toBe('TAR-123');
    expect(db.invocations[0].inputs.MonedaCodigo).toBe('COP');

    const sqlText = db.invocations[0].query;
    expect(sqlText).toContain(
      'ON target.[EmpresaId] = source.[EmpresaId]\n             AND target.[ComercialChannel] = source.[ComercialChannel]',
    );
    expect(sqlText).not.toContain(
      'AND target.[ExternalTarifaId] = source.[ExternalTarifaId]',
    );
  });

  it('upsertInventario -> NO modifica StockReservado', async () => {
    const db = createDbMock();
    db.setResponder(() => ({ recordset: [] }));
    const repository = new ZiSyncRepository(db.databaseService);

    await repository.upsertInventario({
      empresaId: 1,
      bodegaId: 1,
      varianteId: 9001,
      stockTotal: 25,
      origenDatos: 'ZI',
      ziSyncedAt: new Date(),
    });

    const sqlText = db.invocations[0].query;
    expect(sqlText).not.toMatch(/StockReservado\s*=/i);
    expect(sqlText).not.toMatch(/\[StockReservado\]/i);
  });

  it('getTiendaMapping -> retorna Record<string,number>', async () => {
    const db = createDbMock();
    db.setResponder(() => ({
      recordset: [
        { ZiTiendaId: '828', BodegaId: 1 },
        { ZiTiendaId: '238', BodegaId: 2 },
      ],
    }));
    const repository = new ZiSyncRepository(db.databaseService);

    const result = await repository.getTiendaMapping();

    expect(result).toEqual({ '238': 2, '828': 1 });
  });

  it('getTiendaMapping segunda llamada en < 1h -> usa cache', async () => {
    const db = createDbMock();
    db.setResponder(() => ({
      recordset: [{ ZiTiendaId: '828', BodegaId: 1 }],
    }));
    const repository = new ZiSyncRepository(db.databaseService);

    const first = await repository.getTiendaMapping();
    const second = await repository.getTiendaMapping();

    expect(first).toEqual({ '828': 1 });
    expect(second).toEqual({ '828': 1 });
    expect(db.databaseService.execute).toHaveBeenCalledTimes(1);
  });

  it('getLastHashes sin registro -> retorna nulls', async () => {
    const db = createDbMock();
    db.setResponder(() => ({ recordset: [] }));
    const repository = new ZiSyncRepository(db.databaseService);

    const result = await repository.getLastHashes(4);

    expect(result).toEqual({
      hashProduct: null,
      hashPrice: null,
      hashStock: null,
    });
  });

  it('getLastHashes con registro -> retorna hashes correctos', async () => {
    const db = createDbMock();
    db.setResponder(() => ({
      recordset: [
        {
          HashProduct: 'HP1',
          HashPrice: 'PR1',
          HashStock: 'ST1',
        },
      ],
    }));
    const repository = new ZiSyncRepository(db.databaseService);

    const result = await repository.getLastHashes(4);

    expect(result).toEqual({
      hashProduct: 'HP1',
      hashPrice: 'PR1',
      hashStock: 'ST1',
    });
  });
});
