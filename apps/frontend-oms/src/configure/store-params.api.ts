import {
  getEmpresaClientesBootstrap,
  updateEmpresaCliente,
  type EmpresaClienteBootstrapResponse,
  type EmpresaClienteListItem,
} from '../configuracion-general/empresa-cliente.api';

export type StoreParamsEmpresaClienteItem = Pick<
  EmpresaClienteListItem,
  'empresaClienteId' | 'empresaId' | 'nombre' | 'displayName' | 'logoUrl' | 'faviconUrl' | 'estado'
>;

export type StoreParamsBootstrapResponse = {
  empresaClientes: StoreParamsEmpresaClienteItem[];
  empresas: EmpresaClienteBootstrapResponse['empresas'];
};

export type UpdateStoreParamsRequest = {
  displayName?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
};

export async function getStoreParamsBootstrap(
  accessToken: string,
): Promise<StoreParamsBootstrapResponse> {
  const bootstrap = await getEmpresaClientesBootstrap(accessToken);
  return {
    empresaClientes: bootstrap.empresaClientes.map((empresaCliente) => ({
      empresaClienteId: empresaCliente.empresaClienteId,
      empresaId: empresaCliente.empresaId,
      nombre: empresaCliente.nombre,
      displayName: empresaCliente.displayName,
      logoUrl: empresaCliente.logoUrl,
      faviconUrl: empresaCliente.faviconUrl,
      estado: empresaCliente.estado,
    })),
    empresas: bootstrap.empresas,
  };
}

export async function updateStoreParams(
  accessToken: string,
  empresaClienteId: number,
  request: UpdateStoreParamsRequest,
): Promise<{ success: boolean }> {
  return updateEmpresaCliente(accessToken, empresaClienteId, request);
}
