export type KoajPendingOrderClient = {
  NOMBRE?: string;
  APELLIDO?: string;
  CIUDAD?: string;
  DEPARTAMENTO?: string;
  PAIS?: string;
};

export type KoajPendingOrder = {
  ID_PEDIDO: number;
  ALIAS: string;
  ORIGEN: number;
  REFERENCIA?: string;
  REF_ORIGINAL?: string;
  FECHA?: string;
  CLIENTE?: KoajPendingOrderClient;
};

export type KoajPendingResponse = {
  Pedidos?: KoajPendingOrder[];
};

export type OrderListItem = {
  id: string;
  reference: string;
  newCustomer: string;
  delivery: string;
  customer: string;
  total: string;
  payment: string;
  status: string;
  date: string;
  alias: string;
  koajOrderId: number;
  origen: number;
};
