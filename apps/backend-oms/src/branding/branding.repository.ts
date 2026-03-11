import { Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../database/database.service';
import type { EmpresaClienteBrandingData } from './branding.types';

type EmpresaClienteBrandingRow = {
  EmpresaClienteId: number;
  Nombre: string;
  DisplayName: string | null;
  LogoUrl: string | null;
  FaviconUrl: string | null;
};

@Injectable()
export class BrandingRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findEmpresaClienteBrandingById(
    empresaClienteId: number,
  ): Promise<EmpresaClienteBrandingData | null> {
    const result = await this.databaseService.execute<
      sql.IResult<EmpresaClienteBrandingRow>
    >(
      (pool) =>
        pool.request().input('empresaClienteId', sql.Int, empresaClienteId)
          .query<EmpresaClienteBrandingRow>(`
            SELECT TOP 1
              [EmpresaClienteId],
              [Nombre],
              [DisplayName],
              [LogoUrl],
              [FaviconUrl]
            FROM [oms].[EmpresaCliente]
            WHERE [EmpresaClienteId] = @empresaClienteId
          `),
      'branding.findEmpresaClienteBrandingById',
    );

    const row = result.recordset[0];
    if (!row) {
      return null;
    }

    return {
      empresaClienteId: row.EmpresaClienteId,
      nombre: row.Nombre,
      displayName: row.DisplayName,
      logoUrl: row.LogoUrl,
      faviconUrl: row.FaviconUrl,
    };
  }
}
