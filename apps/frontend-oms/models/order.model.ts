export interface OrderItem {
  id: number
  image: string
  name: string
  color: string
  size: string
  sku: string
  reference: string
}

export interface Order {
  id: number
  assignment: string
  orderId: number
  reference: string
  customer: string
  store: string
  date: string
  originCode: string
  originLabel: string
  service: string
  transporterCode: string
  transporterLabel: string
  statusCode: string
  statusLabel: string
  items: OrderItem[]
}

