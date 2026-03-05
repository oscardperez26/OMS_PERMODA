export type ProductoVarianteListItem = {
  varianteId: number;
  empresaId: number;
  productoId: number;
  sku: string;
  ean?: string;
  nombre?: string;
  pesoKg?: number;
  largoCm?: number;
  anchoCm?: number;
  altoCm?: number;
  activo: boolean;
  createdAt: string;
  updatedAt?: string | null;
};

export type ProductoVarianteEmpresaListItem = {
  empresaId: number;
  codigo: string;
  nombre: string;
};

export type ProductoVarianteProductoListItem = {
  productoId: number;
  empresaId: number;
  skuBase?: string;
  nombre: string;
  activo: boolean;
};

export type ProductoVarianteBootstrapData = {
  variantes: ProductoVarianteListItem[];
  empresas: ProductoVarianteEmpresaListItem[];
  productos: ProductoVarianteProductoListItem[];
};

export type CreateProductoVarianteInput = {
  empresaId: number;
  productoId: number;
  sku: string;
  ean: string | null;
  nombre: string | null;
  pesoKg: number | null;
  largoCm: number | null;
  anchoCm: number | null;
  altoCm: number | null;
  activo: boolean;
};

export type UpdateProductoVarianteInput = {
  empresaId: number;
  productoId: number;
  sku: string;
  ean: string | null;
  nombre: string | null;
  pesoKg: number | null;
  largoCm: number | null;
  anchoCm: number | null;
  altoCm: number | null;
  activo: boolean;
};
