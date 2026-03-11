import { useContext } from 'react';
import { BrandingContext, type BrandingContextValue } from './branding-context';

export function useBranding(): BrandingContextValue {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding debe usarse dentro de BrandingProvider');
  }
  return context;
}
