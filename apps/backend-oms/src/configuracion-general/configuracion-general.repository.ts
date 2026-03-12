import { Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../database/database.service';
import type { LogisticaBootstrap } from './configuracion-general.types';

type LogisticaBootstrapRow = {
  TransportadorasTotal: number;
  ZonasTransporteTotal: number;
  ZonaCiudadRelacionesTotal: number;
  CostosTransporteTotal: number;
  LastUpdatedAt: Date;
};

@Injectable()
export class ConfiguracionGeneralRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async getLogisticaBootstrap(): Promise<LogisticaBootstrap> {
    const result = await this.databaseService.execute<
      sql.IResult<LogisticaBootstrapRow>
    >(
      (pool) =>
        pool.request().query<LogisticaBootstrapRow>(`
          SELECT
            (SELECT COUNT(1) FROM [oms].[Transportadora]) AS [TransportadorasTotal],
            (SELECT COUNT(1) FROM [oms].[ZonaTransporte]) AS [ZonasTransporteTotal],
            (SELECT COUNT(1) FROM [oms].[ZonaCiudad]) AS [ZonaCiudadRelacionesTotal],
            (SELECT COUNT(1) FROM [oms].[CostoTransporte]) AS [CostosTransporteTotal],
            SYSUTCDATETIME() AS [LastUpdatedAt]
        `),
      'configuracionGeneral.getLogisticaBootstrap',
    );

    const row = result.recordset[0];

    return {
      transportadorasTotal: row?.TransportadorasTotal ?? 0,
      zonasTransporteTotal: row?.ZonasTransporteTotal ?? 0,
      zonaCiudadRelacionesTotal: row?.ZonaCiudadRelacionesTotal ?? 0,
      costosTransporteTotal: row?.CostosTransporteTotal ?? 0,
      lastUpdatedAt: row?.LastUpdatedAt?.toISOString() ?? new Date().toISOString(),
    };
  }
}
