import type { Permission } from '../auth/auth.types';

export type DashboardOption = {
  id: string;
  label: string;
  description: string;
  frontendPath: string;
  permission: Permission;
  enabled: boolean;
};

export type LogisticaBootstrap = {
  transportadorasTotal: number;
  zonasTransporteTotal: number;
  zonaCiudadRelacionesTotal: number;
  costosTransporteTotal: number;
  lastUpdatedAt: string;
};
