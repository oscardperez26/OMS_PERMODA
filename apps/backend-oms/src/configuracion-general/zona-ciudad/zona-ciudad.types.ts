export type ZonaCiudadListItem = {
  id: string;
  zonaTransporteId: number;
  ciudadId: number;
};

export type ZonaCiudadZonaListItem = {
  zonaTransporteId: number;
  empresaId: number;
  codigo: string;
  nombre: string;
};

export type ZonaCiudadCiudadListItem = {
  ciudadId: number;
  paisId: number;
  nombre: string;
};

export type ZonaCiudadBootstrapData = {
  zonasCiudad: ZonaCiudadListItem[];
  zonasTransporte: ZonaCiudadZonaListItem[];
  ciudades: ZonaCiudadCiudadListItem[];
};

export type CreateZonaCiudadInput = {
  zonaTransporteId: number;
  ciudadId: number;
};

export type UpdateZonaCiudadInput = {
  zonaTransporteId: number;
  ciudadId: number;
};
