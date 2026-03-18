SET NOCOUNT ON;

-- El dev debe completar BodegaId con 1 o 2
-- segun que tienda ZI corresponde a que bodega OMS
-- BodegaId 1 = BOD-081 (Tienda 081)
-- BodegaId 2 = BOD-198 (Tienda 198)

INSERT INTO [oms].[ZiTiendaMapping]
  ([ZiTiendaId], [BodegaId], [Activo])
VALUES
  ('828',1, 1),
  ('238', 1, 1),
  ('395', 1, 1),
  ('041', 1, 1),
  ('929', 1, 1),
  ('178', 1, 1),
  ('097', 1, 1),
  ('917', 1, 1),
  ('223', 1, 1),
  ('199', 1, 1),
  ('820', 1, 1),
  ('256', 2, 1),
  ('237', 2, 1),
  ('250', 2, 1),
  ('257', 2, 1),
  ('922', 2, 1),
  ('242', 2, 1),
  ('342', 2, 1),
  ('935', 2, 1),
  ('928', 2, 1);

-- Si ZI devuelve otros id_tienda no listados aqui:
-- el sync los loggea como warning y los salta.
-- Agregar mas filas segun sea necesario.
