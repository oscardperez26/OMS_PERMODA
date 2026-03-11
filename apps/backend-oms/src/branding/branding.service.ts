import { Injectable } from '@nestjs/common';
import type { SafeUser } from '../auth/auth.types';
import { BrandingRepository } from './branding.repository';
import type { RuntimeBranding } from './branding.types';

const DEFAULT_BRANDING: RuntimeBranding = {
  displayName: 'KOAJ',
  logoUrl: null,
  faviconUrl: null,
  source: 'default',
  empresaClienteId: null,
};

@Injectable()
export class BrandingService {
  constructor(private readonly brandingRepository: BrandingRepository) {}

  async getBrandingForUser(user: SafeUser): Promise<RuntimeBranding> {
    const empresaClienteId = this.parsePositiveInteger(user.empresaClienteId);
    if (!empresaClienteId) {
      return DEFAULT_BRANDING;
    }

    const branding =
      await this.brandingRepository.findEmpresaClienteBrandingById(
        empresaClienteId,
      );
    if (!branding) {
      return DEFAULT_BRANDING;
    }

    return {
      displayName:
        this.normalizeText(branding.displayName) ??
        this.normalizeText(branding.nombre) ??
        DEFAULT_BRANDING.displayName,
      logoUrl: this.normalizeText(branding.logoUrl),
      faviconUrl: this.normalizeText(branding.faviconUrl),
      source: 'empresa-cliente',
      empresaClienteId: branding.empresaClienteId,
    };
  }

  private parsePositiveInteger(rawValue?: string): number | null {
    if (!rawValue?.trim()) {
      return null;
    }

    const parsed = Number(rawValue);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  }

  private normalizeText(value: string | null): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }
}
