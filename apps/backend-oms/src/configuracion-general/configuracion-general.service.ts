import { Injectable } from '@nestjs/common';
import type { DashboardOption } from './configuracion-general.types';

@Injectable()
export class ConfiguracionGeneralService {
  // Catalogo central de opciones para construir el dashboard en frontend.
  listOptions(): DashboardOption[] {
    return [
      {
        id: 'ciudad',
        label: 'Ciudades',
        description: 'Gestion de ciudades y su relacion con pais',
        frontendPath: '/panel/order-manager/configuracion-general/ciudad',
        permission: 'catalog.read',
        enabled: true,
      },
      {
        id: 'empresa',
        label: 'Empresas',
        description: 'Configuracion de empresas con pais, ciudad y moneda',
        frontendPath: '/panel/order-manager/configuracion-general/empresa',
        permission: 'catalog.read',
        enabled: true,
      },
      {
        id: 'moneda',
        label: 'Monedas',
        description: 'Catalogo de monedas para operaciones y configuraciones',
        frontendPath: '/panel/order-manager/configuracion-general/moneda',
        permission: 'catalog.read',
        enabled: true,
      },
      {
        id: 'pais',
        label: 'Paises',
        description: 'Catalogo base relacionado por FK con ciudades',
        frontendPath: '/panel/order-manager/configuracion-general/pais',
        permission: 'catalog.read',
        enabled: true,
      },
      {
        id: 'profiles',
        label: 'Perfiles',
        description: 'Visualizacion y gestion de perfiles del sistema',
        frontendPath: '/panel/order-manager/profiles',
        permission: 'users.manage',
        enabled: true,
      },
    ];
  }
}
