export type PasarelaPagoListItem = {
  pasarelaPagoId: number;
  empresaId: number;
  codigo: string;
  nombre: string;
  activo: boolean;
  configJson?: string;
  createdAt: string;
  updatedAt?: string | null;
};

export type PasarelaPagoEmpresaListItem = {
  empresaId: number;
  codigo: string;
  nombre: string;
};

export type PasarelaPagoBootstrapData = {
  pasarelasPago: PasarelaPagoListItem[];
  empresas: PasarelaPagoEmpresaListItem[];
};

export type CreatePasarelaPagoInput = {
  empresaId: number;
  codigo: string;
  nombre: string;
  activo: boolean;
  configJson: string | null;
};

export type UpdatePasarelaPagoInput = {
  empresaId: number;
  codigo: string;
  nombre: string;
  activo: boolean;
  configJson: string | null;
};
