import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Permissions } from '../../auth/auth.decorators';
import { ZiTokenManagerService } from './auth/zi-token-manager.service';
import { CatalogoZiService } from './catalogo-zi.service';
import { ZiProductQueryDto } from './dto/zi-product-query.dto';

@Controller('configuracion-general/catalogo-zi')
export class CatalogoZiController {
  constructor(
    private readonly catalogoZiService: CatalogoZiService,
    private readonly config: ConfigService,
    private readonly tokenManager: ZiTokenManagerService,
  ) {}

  @Get('change')
  @Permissions('config.read')
  getChange() {
    return this.catalogoZiService.getChange();
  }

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

  @Post('auth/refresh')
  @Permissions('config.manage')
  manualRefresh() {
    const allowed = this.config.get<string>('ZI_ALLOW_MANUAL_REFRESH');
    if (allowed !== 'true') {
      throw new ForbiddenException('Refresh manual deshabilitado');
    }
    return this.tokenManager.forceRefresh();
  }
}
