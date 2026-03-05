export type InventarioListItem = {
  inventarioId: number;
  empresaId: number;
  bodegaId: number;
  varianteId: number;
  stockTotal: number;
  stockReservado: number;
  stockDisponible: number;
  updatedAt: string;
};

export type InventarioEmpresaListItem = {
  empresaId: number;
  codigo: string;
  nombre: string;
};

export type InventarioBodegaListItem = {
  bodegaId: number;
  empresaId: number;
  codigo: string;
  nombre: string;
  activo: boolean;
};

export type InventarioVarianteListItem = {
  varianteId: number;
  empresaId: number;
  productoId: number;
  productoNombre?: string;
  productoSkuBase?: string;
  sku: string;
  nombre?: string;
  activo: boolean;
};

export type InventarioBootstrapData = {
  inventarios: InventarioListItem[];
  empresas: InventarioEmpresaListItem[];
  bodegas: InventarioBodegaListItem[];
  variantes: InventarioVarianteListItem[];
};

export type CreateInventarioInput = {
  empresaId: number;
  bodegaId: number;
  varianteId: number;
  stockTotal: number;
  stockReservado: number;
};

export type UpdateInventarioInput = {
  empresaId: number;
  bodegaId: number;
  varianteId: number;
  stockTotal: number;
  stockReservado: number;
};
