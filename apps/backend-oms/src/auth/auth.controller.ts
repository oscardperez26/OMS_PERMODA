import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from './auth.decorators';
import { LoginDto } from './dto/login.dto';
import type { SafeUser } from './auth.types';

type RequestWithUser = Request & {
  user?: SafeUser;
};

function getCookieValue(req: Request, name: string): string | undefined {
  const rawCookie = req.headers.cookie;
  if (!rawCookie) {
    return undefined;
  }

  const cookies = rawCookie.split(';').map((entry) => entry.trim());
  const found = cookies.find((entry) => entry.startsWith(`${name}=`));
  if (!found) {
    return undefined;
  }

  return decodeURIComponent(found.slice(name.length + 1));
}

/* *
 * Crea una cookie de refresh token con las opciones adecuadas.
 * En producción, la cookie se marca como Secure para solo enviarse por HTTPS.
 */
function createRefreshCookie(refreshToken: string): string {
  const maxAge = 7 * 24 * 60 * 60;
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `refreshToken=${encodeURIComponent(refreshToken)}; HttpOnly; Path=/auth; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}


function clearRefreshCookie(): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `refreshToken=; HttpOnly; Path=/auth; SameSite=Lax; Max-Age=0${secure}`;
}

@Controller('auth')
// No se aplica el guard global aquí para permitir acceso a rutas públicas como login y refresh
// El guard se aplicará a rutas específicas dentro de los métodos usando el decorador @Public
// @UseGuards(JwtAuthGuard) // No se aplica aquí para permitir acceso a rutas públicas
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): { accessToken: string; user: SafeUser } {
    const result = this.authService.login(body.username, body.password, body.portal);
    response.setHeader('Set-Cookie', createRefreshCookie(result.refreshToken));
    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ): { accessToken: string; user: SafeUser } {
    const refreshToken = getCookieValue(req, 'refreshToken');
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token requerido');
    }

    const result = this.authService.refresh(refreshToken);
    response.setHeader('Set-Cookie', createRefreshCookie(result.refreshToken));
    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Get('me')
  me(@Req() req: RequestWithUser): { user: SafeUser } {
    if (!req.user) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return { user: req.user };
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  logout(
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ): { success: true } {
    const refreshToken = getCookieValue(req, 'refreshToken');
    this.authService.logout(refreshToken);
    response.setHeader('Set-Cookie', clearRefreshCookie());
    return { success: true };
  }
}
