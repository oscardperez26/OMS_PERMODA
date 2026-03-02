export type PaisListItem = {
  paisId: number;
  codigoISO2: string;
  codigoISO3?: string;
  nombre: string;
  createdAt: string;
  updatedAt?: string | null;
};

export type CreatePaisInput = {
  codigoISO2: string;
  codigoISO3: string | null;
  nombre: string;
};

export type UpdatePaisInput = {
  codigoISO2: string;
  codigoISO3: string | null;
  nombre: string;
};
