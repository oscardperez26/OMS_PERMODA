import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ZiCatalogQueryDto } from './zi-catalog-query.dto';
import { ZiCatalogRepository } from './zi-catalog.repository';

@Injectable()
export class ZiCatalogService {
  constructor(
    private readonly repository: ZiCatalogRepository,
    private readonly config: ConfigService,
  ) {}

  private get empresaId(): number {
    const raw = this.config.get<string>('ZI_EMPRESA_ID');
    const value = Number(raw);
    if (!Number.isInteger(value) || value <= 0) {
      throw new ServiceUnavailableException('ZI_EMPRESA_ID invalido');
    }
    return value;
  }

  listProductos(query: ZiCatalogQueryDto) {
    return this.repository.listProductos(this.empresaId, query);
  }

  async getProductoDetalle(productoId: number) {
    const detalle = await this.repository.getProductoDetalle(
      this.empresaId,
      productoId,
    );
    if (!detalle) {
      throw new NotFoundException(`Producto ${productoId} no encontrado`);
    }
    return detalle;
  }

  getMarcas() {
    return this.repository.getMarcas(this.empresaId);
  }

  getCategorias() {
    return this.repository.getCategorias(this.empresaId);
  }
}
