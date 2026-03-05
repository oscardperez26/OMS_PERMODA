export type ProductoListItem = {
  productoId: number;
  empresaId: number;
  skuBase?: string;
  nombre: string;
  activo: boolean;
  createdAt: string;
  updatedAt?: string | null;
};

export type ProductoEmpresaListItem = {
  empresaId: number;
  codigo: string;
  nombre: string;
};

export type ProductoBootstrapData = {
  productos: ProductoListItem[];
  empresas: ProductoEmpresaListItem[];
};

export type CreateProductoInput = {
  empresaId: number;
  skuBase: string | null;
  nombre: string;
  activo: boolean;
};

export type UpdateProductoInput = {
  empresaId: number;
  skuBase: string | null;
  nombre: string;
  activo: boolean;
};
