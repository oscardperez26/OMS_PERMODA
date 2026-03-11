import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '../auth/useAuth';
import { getDefaultBranding, getMyBranding } from './branding.api';
import { BrandingContext, type BrandingContextValue } from './branding-context';
import type { RuntimeBranding } from './branding.types';

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { accessToken, isLoading: authLoading } = useAuth();
  const [branding, setBranding] = useState<RuntimeBranding>(getDefaultBranding());
  const [isLoading, setIsLoading] = useState(true);

  const reloadBranding = useCallback(async () => {
    if (!accessToken) {
      setBranding(getDefaultBranding());
      setIsLoading(false);
      return;
    }

    try {
      const nextBranding = await getMyBranding(accessToken);
      setBranding(nextBranding);
    } catch {
      setBranding(getDefaultBranding());
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    setIsLoading(true);
    void reloadBranding();
  }, [authLoading, reloadBranding]);

  useEffect(() => {
    const faviconUrl = branding.faviconUrl?.trim();
    if (!faviconUrl) {
      return;
    }

    let faviconElement = document.querySelector<HTMLLinkElement>(
      "link[rel~='icon']",
    );
    if (!faviconElement) {
      faviconElement = document.createElement('link');
      faviconElement.rel = 'icon';
      document.head.appendChild(faviconElement);
    }
    faviconElement.href = faviconUrl;
  }, [branding.faviconUrl]);

  const value = useMemo<BrandingContextValue>(
    () => ({
      branding,
      isLoading,
      reloadBranding,
    }),
    [branding, isLoading, reloadBranding],
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}
