import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Permissions } from '../../auth/auth.decorators';
import { ZiCatalogQueryDto } from './catalog/zi-catalog-query.dto';
import { ZiCatalogService } from './catalog/zi-catalog.service';
import { ZiTokenManagerService } from './auth/zi-token-manager.service';
import { CatalogoZiService } from './catalogo-zi.service';
import { ZiProductQueryDto } from './dto/zi-product-query.dto';
import { ZiOpsService } from './ops/zi-ops.service';
import { ZiSyncSchedulerService } from './scheduler/zi-sync.scheduler';
import { ZiPersistService } from './zi-persist.service';

@Controller('configuracion-general/catalogo-zi')
export class CatalogoZiController {
  constructor(
    private readonly catalogoZiService: CatalogoZiService,
    private readonly catalogService: ZiCatalogService,
    private readonly config: ConfigService,
    private readonly tokenManager: ZiTokenManagerService,
    private readonly persistService: ZiPersistService,
    private readonly scheduler: ZiSyncSchedulerService,
    private readonly opsService: ZiOpsService,
  ) {}
// Endpoint para verificar cambios en el catálogo Zi
  @Get('change')
  @Permissions('config.read')
  getChange() {
    return this.catalogoZiService.getChange();
  }
// Endpoint para obtener productos, precios y stock desde el catálogo Zi
  @Post('products')
  @Permissions('config.read')
  getProducts(@Body() dto: ZiProductQueryDto) {
    return this.catalogoZiService.getProducts(dto.product);
  }

  @Post('prices')
  @Permissions('config.read')
  getPrices(@Body() dto: ZiProductQueryDto) {
    return this.catalogoZiService.getPrices(dto.product);
  }

  @Post('stock')
  @Permissions('config.read')
  getStock(@Body() dto: ZiProductQueryDto) {
    return this.catalogoZiService.getStock(dto.product);
  }

  @Get('categories/:id')
  @Permissions('config.read')
  getCategory(@Param('id') id: string) {
    return this.catalogoZiService.getCategory(id);
  }

  @Get('catalog/filters/marcas')
  @Permissions('config.read')
  getMarcas() {
    return this.catalogService.getMarcas();
  }

  @Get('catalog/filters/categorias')
  @Permissions('config.read')
  getCategorias() {
    return this.catalogService.getCategorias();
  }

  @Get('catalog')
  @Permissions('config.read')
  listCatalogo(@Query() query: ZiCatalogQueryDto) {
    return this.catalogService.listProductos(query);
  }

  @Get('catalog/:productoId')
  @Permissions('config.read')
  getProductoDetalle(@Param('productoId', ParseIntPipe) productoId: number) {
    return this.catalogService.getProductoDetalle(productoId);
  }

  @Get('ops/status')
  @Permissions('config.read')
  getOpsStatus() {
    return this.opsService.getStatus();
  }

  @Post('auth/refresh')
  @Permissions('config.manage')
  manualRefresh() {
    const allowed = this.config.get<string>('ZI_ALLOW_MANUAL_REFRESH');
    if (allowed !== 'true') {
      throw new ForbiddenException('Refresh manual deshabilitado');
    }
    return this.tokenManager.forceRefresh();
  }

  @Post('sync/full')
  @Permissions('config.manage')
  runFullSync() {
    return this.scheduler.runFullSync();
  }

  @Post('sync/producto/:id')
  @Permissions('config.manage')
  async syncProducto(@Param('id', ParseIntPipe) id: number) {
    const [producto, precios, stock] = await Promise.all([
      this.persistService.persistProducto(id),
      this.persistService.persistPrecios(id),
      this.persistService.persistStock(id),
    ]);

    return { producto, precios, stock };
  }

  @Post('sync/categorias')
  @Permissions('config.manage')
  syncCategorias() {
    return this.persistService.persistCategorias(1, 809);
  }
}
