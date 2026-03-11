import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { TokenService } from './token.service';
import { UserRepository } from './user.repository';
import { resolveProfileAccess } from './profile-map';
import type { AuthenticatedUser, Portal, SafeUser } from './auth.types';

type SessionData = {
  user: SafeUser;
  expiresAt: number;
};

type LoginResult = {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class AuthService {
  private readonly sessions = new Map<string, SessionData>();
  private readonly refreshSessionDurationMs = 7 * 24 * 60 * 60 * 1000;

  constructor(
    private readonly tokenService: TokenService,
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * `username` se usa como email para mantener compatibilidad temporal
   * con tu DTO/controlador actuales.
   */
  async login(
    username: string,
    password: string,
    portal: Portal,
  ): Promise<LoginResult> {
    const dbUser = await this.userRepository.findByEmail(username);

    if (!dbUser) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!dbUser.isActive) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    const profileAccess = resolveProfileAccess(dbUser.perfilId);
    if (!profileAccess) {
      throw new UnauthorizedException('Perfil no configurado para acceso');
    }

    if (profileAccess.portal !== portal) {
      throw new UnauthorizedException(
        portal === 'panel'
          ? 'Este usuario no puede entrar al panel'
          : 'Este usuario no puede entrar a tienda',
      );
    }

    const passwordOk = await bcrypt.compare(password, dbUser.passwordHash);
    if (!passwordOk) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const safeUser: SafeUser = {
      id: dbUser.id,
      username: dbUser.email,
      role: profileAccess.role,
      permissions: profileAccess.permissions,
      storeId: dbUser.empresaId,
      empresaClienteId: dbUser.empresaClienteId,
    };

    const sessionId = randomUUID();
    this.sessions.set(sessionId, {
      user: safeUser,
      expiresAt: Date.now() + this.refreshSessionDurationMs,
    });

    const authUser: AuthenticatedUser = {
      ...safeUser,
      sessionId,
    };

    return {
      user: safeUser,
      accessToken: this.tokenService.createAccessToken(authUser),
      refreshToken: this.tokenService.createRefreshToken(authUser),
    };
  }

  /**
   * Se usa la sesión en memoria para no ir a DB en cada refresh.
   * Más adelante puedes volverlo transaccional/DB-backed.
   */
  refresh(refreshToken: string): LoginResult {
    const payload = this.tokenService.verifyRefreshToken(refreshToken);

    const session = this.sessions.get(payload.sessionId);
    if (
      !session ||
      session.user.id !== payload.sub ||
      Date.now() >= session.expiresAt
    ) {
      throw new UnauthorizedException('Sesión inválida');
    }

    session.expiresAt = Date.now() + this.refreshSessionDurationMs;
    this.sessions.set(payload.sessionId, session);

    const authUser: AuthenticatedUser = {
      ...session.user,
      sessionId: payload.sessionId,
    };

    return {
      user: session.user,
      accessToken: this.tokenService.createAccessToken(authUser),
      refreshToken: this.tokenService.createRefreshToken(authUser),
    };
  }

  getUserFromAccessToken(accessToken: string): SafeUser {
    const payload = this.tokenService.verifyAccessToken(accessToken);
    const session = this.sessions.get(payload.sessionId);

    if (
      !session ||
      session.user.id !== payload.sub ||
      Date.now() >= session.expiresAt
    ) {
      throw new UnauthorizedException('Sesión no válida');
    }

    return session.user;
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    if (newPassword.length < 8) {
      throw new BadRequestException(
        'La nueva contraseña debe tener al menos 8 caracteres',
      );
    }

    const currentHash =
      await this.userRepository.getPasswordHashByUserId(userId);
    if (!currentHash) {
      throw new BadRequestException('Usuario sin credenciales registradas');
    }

    const passwordOk = await bcrypt.compare(currentPassword, currentHash);
    if (!passwordOk) {
      throw new UnauthorizedException('La contraseña actual no es correcta');
    }

    const nextHash = await bcrypt.hash(newPassword, 10);
    await this.userRepository.updatePasswordHash(userId, nextHash);
  }

  logout(refreshToken?: string): void {
    if (!refreshToken) {
      return;
    }

    try {
      const payload = this.tokenService.verifyRefreshToken(refreshToken);
      this.sessions.delete(payload.sessionId);
    } catch {
      // Si el token ya expiró o es inválido, no hay sesión usable que cerrar.
    }
  }
}
