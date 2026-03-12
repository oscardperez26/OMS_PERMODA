import { Injectable } from '@nestjs/common';
import type { DashboardOption } from './configuracion-general.types';

@Injectable()
export class ConfiguracionGeneralService {
  // Catalogo central de opciones para construir el dashboard en frontend.
  listOptions(): DashboardOption[] {
    return [
      {
        id: 'bodega',
        label: 'Bodegas',
        description: 'Bodegas operativas asociadas a empresa y tienda',
        frontendPath: '/panel/order-manager/configuracion-general/bodega',
        permission: 'config.read',
        enabled: true,
      },
      {
        id: 'ciudad',
        label: 'Ciudades',
        description: 'Gestion de ciudades y su relacion con pais',
        frontendPath: '/panel/order-manager/configuracion-general/ciudad',
        permission: 'config.read',
        enabled: true,
      },
      {
        id: 'empresa',
        label: 'Empresas',
        description: 'Configuracion de empresas con pais, ciudad y moneda',
        frontendPath: '/panel/order-manager/configuracion-general/empresa',
        permission: 'config.read',
        enabled: true,
      },
      {
        id: 'empresa-cliente',
        label: 'Empresa Cliente',
        description:
          'Clientes por empresa con validaciones de documento y email',
        frontendPath:
          '/panel/order-manager/configuracion-general/empresa-cliente',
        permission: 'config.read',
        enabled: true,
      },
      {
        id: 'moneda',
        label: 'Monedas',
        description: 'Catalogo de monedas para operaciones y configuraciones',
        frontendPath: '/panel/order-manager/configuracion-general/moneda',
        permission: 'config.read',
        enabled: true,
      },
      {
        id: 'pasarela-pago',
        label: 'Pasarelas de Pago',
        description: 'Catalogo de pasarelas de pago por empresa',
        frontendPath:
          '/panel/order-manager/configuracion-general/pasarela-pago',
        permission: 'config.read',
        enabled: true,
      },
      {
        id: 'producto',
        label: 'Productos',
        description: 'Catalogo de productos base para variantes e inventario',
        frontendPath: '/panel/order-manager/configuracion-general/producto',
        permission: 'config.read',
        enabled: true,
      },
      {
        id: 'producto-variante',
        label: 'Producto Variante',
        description: 'Variantes de producto con SKU/EAN y atributos logisticos',
        frontendPath:
          '/panel/order-manager/configuracion-general/producto-variante',
        permission: 'config.read',
        enabled: true,
      },
      {
        id: 'pais',
        label: 'Paises',
        description: 'Catalogo base relacionado por FK con ciudades',
        frontendPath: '/panel/order-manager/configuracion-general/pais',
        permission: 'config.read',
        enabled: true,
      },
      {
        id: 'inventario',
        label: 'Inventario',
        description:
          'Stock total, reservado y disponible por bodega y variante',
        frontendPath: '/panel/order-manager/configuracion-general/inventario',
        permission: 'config.read',
        enabled: true,
      },
      {
        id: 'tienda',
        label: 'Tiendas',
        description:
          'Tiendas asociadas a empresas con ubicacion y estado operativo',
        frontendPath: '/panel/order-manager/configuracion-general/tienda',
        permission: 'config.read',
        enabled: true,
      },
      {
        id: 'transportadora',
        label: 'Transportadoras',
        description: 'Catalogo de transportadoras por empresa',
        frontendPath:
          '/panel/order-manager/configuracion-general/transportadora',
        permission: 'config.read',
        enabled: true,
      },
      {
        id: 'zona-transporte',
        label: 'Zonas de Transporte',
        description: 'Zonas logisticas por empresa y pais',
        frontendPath:
          '/panel/order-manager/configuracion-general/zona-transporte',
        permission: 'config.read',
        enabled: true,
      },
      {
        id: 'zona-ciudad',
        label: 'Zona Ciudad',
        description: 'Relacion entre zonas de transporte y ciudades',
        frontendPath: '/panel/order-manager/configuracion-general/zona-ciudad',
        permission: 'config.read',
        enabled: true,
      },
      {
        id: 'costo-transporte',
        label: 'Costos de Transporte',
        description: 'Rangos y costos de transporte por combinacion operativa',
        frontendPath:
          '/panel/order-manager/configuracion-general/costo-transporte',
        permission: 'config.read',
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
