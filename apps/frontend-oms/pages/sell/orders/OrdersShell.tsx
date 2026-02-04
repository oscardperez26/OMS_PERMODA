import "./orders-shell.css";

/**
 * OrdersShell
 * -----------
 * Este componente es la "caja blanca" (card) que envuelve toda la pantalla de Pedidos,
 * igual al sistema anterior.
 *
 * Contiene:
 * - Header del módulo: "Pedidos (N)" + botón de configuración (⚙)
 * - Un área interna (children) donde luego meteremos la tabla y filtros.
 *
 * ¿Por qué existe este componente?
 * - Para separar estructura (UI) de la lógica (tabla, filtros, paginación).
 * - Para reutilizar el mismo patrón en Facturas/Remisiones si se quiere.
 */
export function OrdersShell({
  title,
  total,
  onOpenSettings,
  children,
}: {
  /** Texto principal del módulo. Ej: "Pedidos" */
  title: string;

  /** Total de registros. Ej: 21789 */
  total: number;

  /** Acción para abrir configuración (por ahora puede ser un alert) */
  onOpenSettings: () => void;

  /** Contenido interno: tabla, filtros, paginación, etc */
  children: React.ReactNode;
}) {
  return (
    <div className="orders-shell">
      <div className="orders-card">
        {/* =======================
            HEADER DEL MÓDULO
            =======================
            - Muestra el título + el contador.
            - Botón de configuración (⚙) a la derecha.
        */}
        <div className="orders-card-header">
          <div className="orders-title">
            {title} ({total})
          </div>

          <button
            className="orders-gear"
            type="button"
            title="Configuración"
            aria-label="Configuración"
            onClick={onOpenSettings}
          >
            ⚙
          </button>
        </div>

        {/* =======================
            CUERPO DEL MÓDULO
            =======================
            Aquí vamos a montar:
            - Tabla
            - Filtros por columna
            - Paginación
            - Acciones por fila ()
        */}
        <div className="orders-card-body">{children}</div>
      </div>
    </div>
  );
}
