import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { listProfileCatalog } from '../auth/profile-map';
import { UsersRepository } from './users.repository';
import type { UserListItem } from './users.types';

type CreateUserParams = {
  empresaId: number;
  empresaClienteId?: number;
  perfilId: number;
  nombre: string;
  email: string;
  telefono?: string;
  temporaryPassword: string;
};

@Injectable()
export class UsersService {
  private readonly saltRounds = 10;

  constructor(private readonly usersRepository: UsersRepository) {}

  async listUsers(): Promise<UserListItem[]> {
    return this.usersRepository.list();
  }

  listProfiles() {
    return listProfileCatalog();
  }

  async createUser(params: CreateUserParams): Promise<{ userId: string }> {
    const [empresaExists, perfilExists] = await Promise.all([
      this.usersRepository.existsEmpresaById(params.empresaId),
      this.usersRepository.existsPerfilById(params.perfilId),
    ]);

    if (!empresaExists) {
      throw new BadRequestException('EmpresaId no existe en la base de datos');
    }

    if (!perfilExists) {
      throw new BadRequestException('PerfilId no existe en la base de datos');
    }

    if (params.empresaClienteId !== undefined) {
      const empresaClienteValida =
        await this.usersRepository.existsEmpresaClienteByIdAndEmpresaId(
          params.empresaClienteId,
          params.empresaId,
        );
      if (!empresaClienteValida) {
        throw new BadRequestException(
          'EmpresaClienteId no existe o no pertenece a la empresa seleccionada',
        );
      }
    }

    const normalizedEmail = params.email.trim().toLowerCase();
    const exists = await this.usersRepository.existsByEmail(normalizedEmail);

    if (exists) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }

    const passwordHash = await bcrypt.hash(
      params.temporaryPassword,
      this.saltRounds,
    );

    return this.usersRepository.create({
      empresaId: params.empresaId,
      empresaClienteId: params.empresaClienteId,
      perfilId: params.perfilId,
      nombre: params.nombre.trim(),
      email: normalizedEmail,
      telefono: params.telefono?.trim() || undefined,
      passwordHash,
      estado: 1,
    });
  }

  async updateUserStatus(userId: string, estado: 0 | 1): Promise<void> {
    await this.usersRepository.updateStatus(userId, estado);
  }

  async resetPassword(
    userId: string,
    newTemporaryPassword: string,
  ): Promise<void> {
    const passwordHash = await bcrypt.hash(
      newTemporaryPassword,
      this.saltRounds,
    );
    await this.usersRepository.updatePasswordHash(userId, passwordHash);
  }
}
