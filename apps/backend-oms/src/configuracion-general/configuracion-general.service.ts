import { Injectable } from '@nestjs/common';
import { ConfiguracionGeneralRepository } from './configuracion-general.repository';
import type { DashboardOption } from './configuracion-general.types';
import type { LogisticaBootstrap } from './configuracion-general.types';

@Injectable()
export class ConfiguracionGeneralService {
  constructor(
    private readonly configuracionGeneralRepository: ConfiguracionGeneralRepository,
  ) {}

  // Catalogo central de opciones para construir el dashboard en frontend.
  listOptions(): DashboardOption[] {
    return [
      {
        id: 'logistica',
        label: 'Logistica',
        description:
          'Modulo padre para configurar transportadoras, zonas y costos de envio',
        frontendPath: '/panel/order-manager/configuracion-general/logistica',
        permission: 'config.read',
        enabled: true,
      },
      {
        id: 'comercial',
        label: 'Comercial / Franquicias',
        description:
          'Modulo padre para branding de franquicias, tiendas y estructura comercial',
        frontendPath:
          '/panel/order-manager/configuracion-general/comercial',
        permission: 'config.read',
        enabled: true,
      },
      {
        id: 'parametros-base',
        label: 'Parametros Base',
        description: 'Modulo padre para catalogos maestros: pais, ciudad y moneda',
        frontendPath:
          '/panel/order-manager/configuracion-general/parametros-base',
        permission: 'config.read',
        enabled: true,
      },
      {
        id: 'catalogo-inventario',
        label: 'Catalogo e Inventario',
        description:
          'Modulo padre para productos, variantes y existencias de inventario',
        frontendPath:
          '/panel/order-manager/configuracion-general/catalogo-inventario',
        permission: 'config.read',
        enabled: true,
      },
      {
        id: 'pagos-integraciones',
        label: 'Pagos e Integraciones',
        description:
          'Modulo padre para pasarelas de pago y futuras integraciones externas',
        frontendPath:
          '/panel/order-manager/configuracion-general/pagos-integraciones',
        permission: 'config.read',
        enabled: true,
      },
      {
        id: 'seguridad-accesos',
        label: 'Seguridad y Accesos',
        description:
          'Modulo padre para perfiles, permisos y gobierno de acceso',
        frontendPath:
          '/panel/order-manager/seguridad-accesos',
        permission: 'users.manage',
        enabled: true,
      },
    ];
  }

  // Bootstrap para el dashboard padre de logistica.
  async getLogisticaBootstrap(): Promise<LogisticaBootstrap> {
    return this.configuracionGeneralRepository.getLogisticaBootstrap();
  }
}
