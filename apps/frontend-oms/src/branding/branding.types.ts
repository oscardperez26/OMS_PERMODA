export type RuntimeBranding = {
  displayName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  source: 'empresa-cliente' | 'default';
  empresaClienteId: number | null;
};
