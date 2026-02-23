import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { MOCK_USERS } from './mock-users';
import { TokenService } from './token.service';
import type { AuthenticatedUser, Portal, SafeUser } from './auth.types';

type SessionData = {
  userId: string;
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

  constructor(private readonly tokenService: TokenService) {}
 // TODO: En un sistema real, las funciones de login y refresh deberían ser atómicas para evitar condiciones de carrera en la actualización de sesiones. Esto se puede lograr con bloqueos o usando una base de datos transaccional.
 // Además, en producción, las sesiones y usuarios no deberían almacenarse en memoria sino en una base de datos o sistema de cache compartido para soportar múltiples instancias del backend.
  login(username: string, password: string, portal: Portal): LoginResult {
    const userRecord = MOCK_USERS.find(
      (candidate) =>
        candidate.username.toLowerCase() === username.toLowerCase() &&
        candidate.password === password,
    );

    if (!userRecord) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPanelUser = userRecord.role === 'ADMIN';
    if (portal === 'panel' && !isPanelUser) {
      throw new UnauthorizedException('Este usuario no puede entrar al panel');
    }

    if (portal === 'tienda' && isPanelUser) {
      throw new UnauthorizedException('Este usuario no puede entrar a tienda');
    }

    const sessionId = randomUUID();
    this.sessions.set(sessionId, {
      userId: userRecord.id,
      expiresAt: Date.now() + this.refreshSessionDurationMs,
    });

    const authUser: AuthenticatedUser = {
      id: userRecord.id,
      username: userRecord.username,
      role: userRecord.role,
      permissions: userRecord.permissions,
      storeId: userRecord.storeId,
      sessionId,
    };

    return {
      user: this.toSafeUser(authUser),
      accessToken: this.tokenService.createAccessToken(authUser),
      refreshToken: this.tokenService.createRefreshToken(authUser),
    };
  }
  // TODO: La función de refresh debería validar que el usuario aún tiene permisos para acceder al portal solicitado, en caso de que los permisos hayan cambiado desde el login inicial. Esto se puede hacer agregando el portal al payload del refresh token y validándolo aquí.
  refresh(refreshToken: string): LoginResult {
    const payload = this.tokenService.verifyRefreshToken(refreshToken);

    const session = this.sessions.get(payload.sessionId);
    if (!session || session.userId !== payload.sub || Date.now() >= session.expiresAt) {
      throw new UnauthorizedException('Sesión inválida');
    }

    const userRecord = MOCK_USERS.find((candidate) => candidate.id === payload.sub);
    if (!userRecord) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    session.expiresAt = Date.now() + this.refreshSessionDurationMs;
    this.sessions.set(payload.sessionId, session);

    const authUser: AuthenticatedUser = {
      id: userRecord.id,
      username: userRecord.username,
      role: userRecord.role,
      permissions: userRecord.permissions,
      storeId: userRecord.storeId,
      sessionId: payload.sessionId,
    };

    return {
      user: this.toSafeUser(authUser),
      accessToken: this.tokenService.createAccessToken(authUser),
      refreshToken: this.tokenService.createRefreshToken(authUser),
    };
  }
  // Esta función se puede usar para obtener la información del usuario a partir de un access token, por ejemplo, en un guard de autenticación.
  getUserFromAccessToken(accessToken: string): SafeUser {
    const payload = this.tokenService.verifyAccessToken(accessToken);
    const session = this.sessions.get(payload.sessionId);

    if (!session || session.userId !== payload.sub || Date.now() >= session.expiresAt) {
      throw new UnauthorizedException('Sesión no válida');
    }

    const userRecord = MOCK_USERS.find((candidate) => candidate.id === payload.sub);
    if (!userRecord) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return {
      id: userRecord.id,
      username: userRecord.username,
      role: userRecord.role,
      permissions: userRecord.permissions,
      storeId: userRecord.storeId,
    };
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

  private toSafeUser(user: AuthenticatedUser): SafeUser {
    const { sessionId: _sessionId, ...safeUser } = user;
    return safeUser;
  }
}
