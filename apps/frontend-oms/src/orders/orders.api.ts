const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export type OrdersListItem = {
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

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | { message?: string | string[] }
    | null;

  if (!response.ok) {
    const fallback = 'No se pudo completar la operacion';
    const message = Array.isArray(payload?.message)
      ? payload.message.join(', ')
      : payload?.message ?? fallback;
    throw new Error(message);
  }

  return payload as T;
}

export async function listOrders(accessToken: string): Promise<OrdersListItem[]> {
  const response = await fetch(`${API_URL}/orders`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = await parseJsonResponse<{ orders: OrdersListItem[] }>(response);
  return payload.orders;
}
