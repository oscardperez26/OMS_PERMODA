export type ZiAtributo = {
  id: 'talla' | 'color' | string;
  valor: string;
};

export type ZiCombinacion = {
  id: string;
  atributos: ZiAtributo[];
  ean13: string;
};

export type ZiPropiedad = {
  id: string;
  valor: string | null;
};

export type ZiTextoIdioma = {
  es: string;
};

export type ZiProducto = {
  id: number;
  nombre: ZiTextoIdioma;
  referencia: string;
  activo: boolean;
  descripcion: ZiTextoIdioma;
  descripcion_corta: ZiTextoIdioma;
  meta_titulo: ZiTextoIdioma;
  // Bug ZI: el campo llega con acento y debe consumirse tal cual.
  'meta_descripción': ZiTextoIdioma;
  url: ZiTextoIdioma;
  marca: string;
  // Bug ZI: typo oficial en contrato externo (catgoria_defecto).
  catgoria_defecto: string;
  categorias: string[];
  instruccionesCuidado: string | null;
  instruccionesLavado: string | null;
  composicion: string | null;
  ruc: string;
  combinaciones: ZiCombinacion[];
  propiedades: ZiPropiedad[];
};

export type ZiProductosResponse = ZiProducto[];

export type ZiPrecioTalla = {
  id_talla: string;
  id_color: string;
  precio: string;
};

export type ZiOferta = {
  id_oferta: string;
  fecha_inicio: string;
  fecha_fin: string;
  precio_base: string;
  precio_tallas: ZiPrecioTalla[];
};

export type ZiTarifa = {
  comercialChannel: string;
  id_tarifa: string;
  moneda: string;
  impuesto: string;
  precio_base: string;
  precio_tallas: ZiPrecioTalla[];
  ofertas: ZiOferta[];
};

export type ZiPreciosResponseItem = {
  id: number;
  hash_price: string;
  tarifas: ZiTarifa[];
};

export type ZiPreciosResponse = ZiPreciosResponseItem[];

export type ZiStockTalla = {
  id_talla: string;
  id_Color: string;
  unidades: string;
};

export type ZiStockTienda = {
  id_tienda: string;
  tallas: ZiStockTalla[][];
};

export type ZiStockResponseItem = {
  id: number;
  hash_stock: string;
  stock: ZiStockTienda[];
};

export type ZiStockResponse = ZiStockResponseItem[];

export type ZiChangeItem = {
  id: number;
  hash_Product: string;
  hash_Price: string;
  hash_Stock: string;
};

export type ZiChangeResponse = ZiChangeItem[];

export type ZiCategoriaResponse = {
  id: number;
  isActive: boolean;
  ts: string;
  name: string;
  dependOnId: number;
  level: string;
  success: boolean;
  statusCode: number;
};
