/**
 * StoreOrdersPage
 * ---------------
 * Vista de pedidos para usuarios TIENDA.
 *
 * Por ahora:
 * - Solo placeholder visual.
 * Próximo:
 * - Consumir GET /orders pero filtrado por tienda (lo hará el backend).
 */
export function StoreOrdersPage() {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 14 }}>
      <h2 style={{ margin: 0 }}>Pedidos (Tienda)</h2>
      <p style={{ opacity: 0.75 }}>
        Aquí la tienda verá únicamente sus pedidos.
      </p>
    </div>
  );
}
