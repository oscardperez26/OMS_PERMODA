/**
 * orderStatus.ts
 * --------------
 * Estados del pedido (flujo operativo / logístico).
 * Todo pedido entra PAGADO, aquí solo controlamos progreso del envío.
 */

export const ORDER_STATUS = [
  "ASIGNADO",
  "PREPARACION",
  "EMPACADO",
  "DESPACHADO",
  "EN_TRANSITO",
  "ENTREGADO",
  "CON_NOVEDAD",
  "CANCELADO",
] as const;

export type OrderStatus = typeof ORDER_STATUS[number];

/**
 * Reglas de transición permitidas.
 * Evita saltos ilógicos (ej: ASIGNADO -> ENTREGADO).
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  ASIGNADO: ["PREPARACION", "CANCELADO"],
  PREPARACION: ["EMPACADO", "CON_NOVEDAD", "CANCELADO"],
  EMPACADO: ["DESPACHADO", "CON_NOVEDAD"],
  DESPACHADO: ["EN_TRANSITO", "CON_NOVEDAD"],
  EN_TRANSITO: ["ENTREGADO", "CON_NOVEDAD"],
  ENTREGADO: [],
  CON_NOVEDAD: ["PREPARACION", "DESPACHADO", "CANCELADO"],
  CANCELADO: [],
};
