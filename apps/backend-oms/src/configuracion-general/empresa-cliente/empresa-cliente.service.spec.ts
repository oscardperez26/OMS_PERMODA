import { EmpresaClienteService } from './empresa-cliente.service';
import type { EmpresaClienteRepository } from './empresa-cliente.repository';

describe('EmpresaClienteService (scope)', () => {
  const repository = {
    list: jest.fn(),
    listBootstrapData: jest.fn(),
  } as unknown as EmpresaClienteRepository;

  let service: EmpresaClienteService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EmpresaClienteService(repository);
  });

  it('returns only scoped franquicia in list when empresaClienteId is provided', async () => {
    repository.list = jest.fn().mockResolvedValue([
      {
        empresaClienteId: 10,
        empresaId: 1,
        nombre: 'FRANQUICIA A',
        estado: 'ACTIVA',
        createdAt: '2026-03-01T00:00:00.000Z',
      },
      {
        empresaClienteId: 20,
        empresaId: 2,
        nombre: 'FRANQUICIA B',
        estado: 'ACTIVA',
        createdAt: '2026-03-01T00:00:00.000Z',
      },
    ]);

    const result = await service.listEmpresaClientes(20);
    expect(result).toHaveLength(1);
    expect(result[0].empresaClienteId).toBe(20);
  });

  it('filters bootstrap data by scoped franquicia and keeps only its empresa', async () => {
    repository.listBootstrapData = jest.fn().mockResolvedValue({
      empresaClientes: [
        {
          empresaClienteId: 10,
          empresaId: 1,
          nombre: 'FRANQUICIA A',
          estado: 'ACTIVA',
          createdAt: '2026-03-01T00:00:00.000Z',
        },
        {
          empresaClienteId: 20,
          empresaId: 2,
          nombre: 'FRANQUICIA B',
          estado: 'ACTIVA',
          createdAt: '2026-03-01T00:00:00.000Z',
        },
      ],
      empresas: [
        { empresaId: 1, codigo: 'KOAJ_CO', nombre: 'KOAJ Colombia' },
        { empresaId: 2, codigo: 'KOAJ_PE', nombre: 'KOAJ Peru' },
      ],
      paises: [{ paisId: 1, codigoISO2: 'CO', nombre: 'Colombia' }],
      ciudades: [{ ciudadId: 1, paisId: 1, nombre: 'Bogota' }],
    });

    const result = await service.getBootstrapData(10);

    expect(result.empresaClientes).toHaveLength(1);
    expect(result.empresaClientes[0].empresaClienteId).toBe(10);
    expect(result.empresas).toHaveLength(1);
    expect(result.empresas[0].empresaId).toBe(1);
  });
});
