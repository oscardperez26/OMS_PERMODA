import type { OrderRow } from "./OrdersTable";

export const MOCK_ORDERS: OrderRow[] = [
    {
        pedidoId: 21829,
        id: "21829",
        reference: "ZSPTHAYRG",
        newCustomer: "No",
        delivery: "Colombia",
        customer: "Paula Tadino",
        total: "96.900,00 $",
        payment: "Pago en caja",
        status: "Asignado",
        date: "2026-01-30 16:53:06",
        detail: {
            shippingCarrier: "Recogida en tienda",
            trackingNumber: "-",
            shippingAddress:
                "Paula Tadino\nCarrera 35 número 36-37\nApt. 601. Edificio Jan Lui\nBUCARAMANGA\nColombia",
            billingEmail: "tadinopaula@gmail.com",
            billingName: "Paula Tadino",
            billingAddress:
                "Carrera 35 número 36-37\nApt. 601. Edificio Jan Lui\nBUCARAMANGA\nColombia",
            items: [
                { name: "Camiseta gris intensa con manga corta y diseño de Popeye", reference: "105105691390-908", quantity: 1, total: "25.900,00 $" },
                { name: "Camiseta crema clara con diseños de Snoopy y manga corta", reference: "105105714478-910", quantity: 1, total: "25.900,00 $" },
            ],
        },
    },
    {
        pedidoId: 21820,
        id: "21820",
        reference: "HPPZPFSHE",
        newCustomer: "No",
        delivery: "Colombia",
        customer: "E. Míguez",
        total: "114.880,00 $",
        payment: "Pago mediante efecty",
        status: "Preparación en curso",
        date: "2026-01-30 04:23:40",
        detail: {
            shippingCarrier: "Recogida en tienda",
            trackingNumber: "-",
            shippingAddress:
                "E. Míguez\nCalle Falsa 123\nBogotá\nColombia",
            billingEmail: "emiguez@example.com",
            billingName: "E. Míguez",
            billingAddress:
                "Calle Falsa 123\nBogotá\nColombia",
            items: [
                { name: "Camiseta gris interna con manga corta...", reference: "105105691390-908", quantity: 1, total: "25.900,00 $" },
            ],
        },
    },
    {
        pedidoId: 21806,
        id: "21806",
        reference: "OSEFORRAV",
        newCustomer: "Sí",
        delivery: "Colombia",
        customer: "Cliente Nuevo",
        total: "106.800,00 $",
        payment: "Pago en caja",
        status: "Entregado",
        date: "2026-01-28 08:58:47",
        detail: {
            shippingCarrier: "Recogida en tienda",
            trackingNumber: "-",
            shippingAddress:
                "Avenida Siempre Viva 742\nMedellín\nColombia",
            billingEmail: "nuevo@example.com",
            billingName: "Cliente Nuevo",
            billingAddress:
                "Avenida Siempre Viva 742\nMedellín\nColombia",
            items: [
                { name: "Camiseta crema clara con diseños de Snoopy...", reference: "105105714478-910", quantity: 1, total: "25.900,00 $" },
            ],
        },
    },
];
