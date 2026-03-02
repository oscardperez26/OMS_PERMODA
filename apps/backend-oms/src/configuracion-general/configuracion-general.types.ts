import type { Permission } from '../auth/auth.types';

export type DashboardOption = {
  id: string;
  label: string;
  description: string;
  frontendPath: string;
  permission: Permission;
  enabled: boolean;
};
