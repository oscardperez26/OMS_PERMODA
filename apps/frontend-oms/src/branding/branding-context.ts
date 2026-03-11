import { createContext } from 'react';
import type { RuntimeBranding } from './branding.types';

export type BrandingContextValue = {
  branding: RuntimeBranding;
  isLoading: boolean;
  reloadBranding: () => Promise<void>;
};

export const BrandingContext = createContext<BrandingContextValue | null>(null);
