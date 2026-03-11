export type RuntimeBranding = {
  displayName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  source: 'empresa-cliente' | 'default';
  empresaClienteId: number | null;
};

export type EmpresaClienteBrandingData = {
  empresaClienteId: number;
  nombre: string;
  displayName: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
};
