import { Controller, Get, Req, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { SafeUser } from '../auth/auth.types';
import { BrandingService } from './branding.service';
import type { RuntimeBranding } from './branding.types';

type RequestWithUser = Request & {
  user?: SafeUser;
};
// Controlador para gestionar las operaciones de branding
@Controller('branding')
export class BrandingController {
  constructor(private readonly brandingService: BrandingService) {}

  @Get('me')
  async getMyBranding(
    @Req() req: RequestWithUser,
  ): Promise<{ branding: RuntimeBranding }> {
    if (!req.user) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    const branding = await this.brandingService.getBrandingForUser(req.user);
    return { branding };
  }
}
