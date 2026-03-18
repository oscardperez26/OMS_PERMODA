export type ProductoListItem = {
  productoId: number;
  empresaId: number;
  categoriaId?: number | null;
  categoriaNombre?: string | null;
  skuBase?: string;
  nombre: string;
  marca?: string | null;
  descripcion?: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt?: string | null;
  ziSyncedAt?: string | null;
};

export type ProductoEmpresaListItem = {
  empresaId: number;
  codigo: string;
  nombre: string;
};

export type ProductoBootstrapData = {
  productos: ProductoListItem[];
  empresas: ProductoEmpresaListItem[];
  categorias: ProductoCategoriaListItem[];
};

export type ProductoCategoriaListItem = {
  categoriaId: number;
  empresaId: number;
  nombre: string;
  activo: boolean;
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
